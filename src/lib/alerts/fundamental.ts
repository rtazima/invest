import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/service";
import { createAlertDeduped } from "@/lib/data/alerts";
import { braveSearch, type BraveResult } from "@/lib/brave/client";

const claude = new Anthropic();

const FII_CLASSES = new Set(["fiis"]);
const STOCK_CLASSES = new Set(["stocks_br", "stocks_intl", "etf_br", "etf_intl"]);
const ANALYSABLE_CLASSES = new Set(["fiis", "stocks_br", "stocks_intl", "etf_br", "etf_intl"]);

async function searchFundamentals(ticker: string, isFii: boolean): Promise<BraveResult[]> {
  const queries = isFii
    ? [
        `${ticker} FII P/VP dividend yield vacância LTV relatório`,
        `${ticker} FII resultado gestão portfólio imóveis`,
      ]
    : [
        `${ticker} resultado lucro ROE ROIC dívida EBITDA margem`,
        `${ticker} P/L P/VPA dividend yield valuation análise`,
      ];

  const allResults: BraveResult[] = [];
  for (const q of queries) {
    const results = await braveSearch(q, { count: 5, freshness: "pm" });
    allResults.push(...results);
    await new Promise((r) => setTimeout(r, 400));
  }
  return allResults;
}

const STOCK_PROMPT = (ticker: string, snippets: string) => `
Você é um analista fundamentalista especializado em ações brasileiras.
Analise o ativo ${ticker} com base nas informações abaixo e forneça uma avaliação estruturada.

Responda APENAS em JSON com este formato exato:
{
  "verdict": "comprar" | "manter" | "reduzir",
  "severity": "info" | "warning" | "critical",
  "qualitative": "análise qualitativa em 2-3 frases: modelo de negócio, vantagem competitiva, governança",
  "quantitative": "análise quantitativa em 2-3 frases: crescimento de receita/lucro, margens, endividamento (Dívida/EBITDA), ROE/ROIC",
  "valuation": "análise de valuation em 1-2 frases: P/L, P/VPA, DY comparados ao setor",
  "summary": "veredicto em 1 frase clara com justificativa principal"
}

Critérios de severity:
- info: empresa saudável, valuation razoável, manter ou comprar com margem de segurança
- warning: algum ponto de atenção (endividamento elevado, margem comprimindo, valuation esticado)
- critical: deterioração clara (prejuízo recorrente, dívida excessiva, governança fraca)

Se não houver dados suficientes para uma análise confiável, retorne verdict="manter", severity="info" e explique a limitação no summary.

Informações disponíveis:
${snippets}
`;

const FII_PROMPT = (ticker: string, snippets: string) => `
Você é um analista especializado em Fundos de Investimento Imobiliário (FIIs) brasileiros.
Analise o FII ${ticker} com base nas informações abaixo.

Responda APENAS em JSON com este formato exato:
{
  "verdict": "comprar" | "manter" | "reduzir",
  "severity": "info" | "warning" | "critical",
  "qualitative": "análise qualitativa em 2-3 frases: tipo de fundo (tijolo/papel/híbrido), qualidade dos imóveis/contratos, gestão",
  "quantitative": "análise quantitativa em 2-3 frases: P/VP, DY anualizado, vacância física e financeira, LTV se aplicável",
  "valuation": "análise de valuation em 1-2 frases: P/VP vs histórico, DY vs CDI atual",
  "summary": "veredicto em 1 frase clara com justificativa principal"
}

Critérios de severity:
- info: fundo saudável, vacância controlada, DY consistente, P/VP razoável
- warning: vacância elevada, DY caindo, P/VP muito acima de 1, contratos vencendo
- critical: inadimplência relevante, gestão questionável, vacância crítica, P/VP >1.5

Se não houver dados suficientes, retorne verdict="manter", severity="info" e explique no summary.

Informações disponíveis:
${snippets}
`;

interface AnalysisResult {
  verdict: "comprar" | "manter" | "reduzir";
  severity: "info" | "warning" | "critical";
  qualitative: string;
  quantitative: string;
  valuation: string;
  summary: string;
}

async function analyzeAsset(ticker: string, isFii: boolean, results: BraveResult[]): Promise<AnalysisResult | null> {
  if (results.length === 0) return null;

  const snippets = results
    .slice(0, 8)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.description}`)
    .join("\n\n");

  const prompt = isFii ? FII_PROMPT(ticker, snippets) : STOCK_PROMPT(ticker, snippets);

  const msg = await claude.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const first = msg.content[0];
    const text = first && first.type === "text" ? first.text.trim() : "";
    // Extrai o JSON mesmo se vier com texto ao redor
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as AnalysisResult;
  } catch {
    return null;
  }
}

function buildAlertDescription(analysis: AnalysisResult): string {
  const parts = [analysis.qualitative, analysis.quantitative, analysis.valuation].filter(Boolean);
  return parts.join(" | ");
}

export async function runFundamentalAnalysis(): Promise<{ analyzed: number; created: number }> {
  const supabase = createServiceClient();

  const { data: holders } = await supabase.from("holders").select("id, name");
  if (!holders || holders.length === 0) return { analyzed: 0, created: 0 };

  const holderIds = holders.map((h) => h.id);

  const { data: batches } = await supabase
    .from("import_batches")
    .select("id, holder_id, institution, filename")
    .eq("status", "completed")
    .in("holder_id", holderIds)
    .order("completed_at", { ascending: false });

  const latestBatchId = new Map<string, string>();
  for (const b of batches ?? []) {
    const key = `${b.holder_id}:${b.institution}:${b.filename ?? ""}`;
    if (!latestBatchId.has(key)) latestBatchId.set(key, b.id);
  }

  const batchIds = Array.from(latestBatchId.values());
  if (batchIds.length === 0) return { analyzed: 0, created: 0 };

  const { data: positions } = await supabase
    .from("positions")
    .select("holder_id, ticker, asset_class, market_value_brl")
    .in("batch_id", batchIds)
    .not("ticker", "is", null);

  // Agrupa por ticker (mesmo ticker pode aparecer em vários titulares)
  const tickerHolders = new Map<string, { holderId: string; assetClass: string; value: number }[]>();
  for (const p of positions ?? []) {
    if (!ANALYSABLE_CLASSES.has(p.asset_class)) continue;
    if (!tickerHolders.has(p.ticker!)) tickerHolders.set(p.ticker!, []);
    tickerHolders.get(p.ticker!)!.push({
      holderId: p.holder_id,
      assetClass: p.asset_class,
      value: p.market_value_brl ?? 0,
    });
  }

  let analyzed = 0;
  let created = 0;

  for (const [ticker, entries] of tickerHolders) {
    if (entries.length === 0) continue;
    const assetClass = entries[0]!.assetClass;
    const isFii = FII_CLASSES.has(assetClass);
    const isStock = STOCK_CLASSES.has(assetClass);
    if (!isFii && !isStock) continue;

    const results = await searchFundamentals(ticker, isFii);
    const analysis = await analyzeAsset(ticker, isFii, results);
    analyzed++;

    if (!analysis) continue;

    const verdictLabel = { comprar: "Comprar", manter: "Manter", reduzir: "Reduzir" }[analysis.verdict];
    const description = buildAlertDescription(analysis);

    // Cria alerta para cada titular que possui o ativo
    for (const { holderId } of entries) {
      const wasCreated = await createAlertDeduped(
        {
          holder_id: holderId,
          ticker,
          severity: analysis.severity,
          title: `${ticker} — ${verdictLabel} | Análise fundamentalista`,
          description,
          recommendation: analysis.summary,
          sources: results.slice(0, 3).map((r) => r.url),
          generated_by: "fundamental-analysis",
        },
        25 * 24, // janela de 25 dias para evitar duplicatas mensais
        supabase,
      );
      if (wasCreated) created++;
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  return { analyzed, created };
}
