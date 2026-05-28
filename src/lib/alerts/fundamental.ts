import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/service";
import { createAlertDeduped } from "@/lib/data/alerts";
import { braveSearch, type BraveResult } from "@/lib/brave/client";
import { fetchFundamentus, type FundamentusData } from "@/lib/scraper/fundamentus";
import { fetchStatusInvestFii, type StatusInvestFiiData } from "@/lib/scraper/statusinvest";

const claude = new Anthropic();

const FII_CLASSES = new Set(["fiis"]);
const STOCK_CLASSES = new Set(["stocks_br", "stocks_intl", "etf_br", "etf_intl"]);
const ANALYSABLE_CLASSES = new Set(["fiis", "stocks_br", "stocks_intl", "etf_br", "etf_intl"]);

function fmtNull(v: number | null, suffix = ""): string {
  return v !== null ? `${v}${suffix}` : "N/D";
}

function stockQuantitativeContext(d: FundamentusData): string {
  return [
    `P/L: ${fmtNull(d.pl)}`,
    `P/VP: ${fmtNull(d.pvp)}`,
    `Div.Yield: ${fmtNull(d.dy, "%")}`,
    `EV/EBITDA: ${fmtNull(d.evEbitda)}`,
    `Marg.Bruta: ${fmtNull(d.margBruta, "%")}`,
    `Marg.EBIT: ${fmtNull(d.margEbit, "%")}`,
    `Marg.Líquida: ${fmtNull(d.margLiquida, "%")}`,
    `ROE: ${fmtNull(d.roe, "%")}`,
    `Dív.Líq/Patrim: ${fmtNull(d.divLiqPatrim)}`,
  ].join(" | ");
}

function fiiQuantitativeContext(d: StatusInvestFiiData): string {
  return [
    `P/VP: ${fmtNull(d.pvp)}`,
    `DY 12m: ${fmtNull(d.dy12m, "%")}`,
    `Val.Patr/Cota: R$${fmtNull(d.valPatrimonialCota)}`,
    `Último rend.: R$${fmtNull(d.ultimoRendimento)}`,
    `Vacância fís.: ${d.vacanciaFisica !== null ? `${d.vacanciaFisica}%` : "N/D (fundo papel)"}`,
    `Inadimplência: ${d.vacanciaFinanceira !== null ? `${d.vacanciaFinanceira}%` : "N/D"}`,
  ].join(" | ");
}

async function getNewsSnippets(ticker: string): Promise<BraveResult[]> {
  return braveSearch(`${ticker} B3 análise resultado governança`, { count: 5, freshness: "pm" });
}

const STOCK_PROMPT = (ticker: string, quant: string, snippets: string) => `
Você é um analista fundamentalista especializado em ações brasileiras.
Analise ${ticker} com base nos dados quantitativos abaixo e nas notícias recentes.

DADOS QUANTITATIVOS (Fundamentus):
${quant}

NOTÍCIAS RECENTES:
${snippets}

Responda APENAS em JSON:
{
  "verdict": "comprar" | "manter" | "reduzir",
  "severity": "info" | "warning" | "critical",
  "qualitative": "análise em 2 frases: modelo de negócio, vantagem competitiva, governança",
  "quantitative": "análise em 2 frases dos indicadores acima — compare com benchmarks do setor",
  "valuation": "1 frase sobre P/L, P/VP e DY vs setor",
  "summary": "veredicto em 1 frase com a principal razão"
}

Critérios:
- info: empresa saudável, indicadores razoáveis
- warning: ponto de atenção (ROE baixo, margem caindo, endividamento elevado, valuation esticado)
- critical: deterioração clara (prejuízo, dívida excessiva, governança fraca)
`;

const FII_PROMPT = (ticker: string, quant: string, snippets: string) => `
Você é um analista especializado em FIIs brasileiros.
Analise ${ticker} com base nos dados abaixo.

DADOS QUANTITATIVOS (StatusInvest):
${quant}

NOTÍCIAS RECENTES:
${snippets}

Responda APENAS em JSON:
{
  "verdict": "comprar" | "manter" | "reduzir",
  "severity": "info" | "warning" | "critical",
  "qualitative": "análise em 2 frases: tipo do fundo, qualidade da gestão e portfólio",
  "quantitative": "análise em 2 frases dos indicadores acima — P/VP vs 1, DY vs CDI, vacância",
  "valuation": "1 frase: P/VP vs histórico e DY anualizado vs CDI atual (~10,5%)",
  "summary": "veredicto em 1 frase com a principal razão"
}

Critérios:
- info: P/VP próximo de 1, DY acima do CDI, vacância controlada
- warning: P/VP > 1,2 ou DY abaixo do CDI ou vacância subindo
- critical: P/VP > 1,5, DY colapsando, inadimplência relevante, gestão questionável
`;

interface AnalysisResult {
  verdict: "comprar" | "manter" | "reduzir";
  severity: "info" | "warning" | "critical";
  qualitative: string;
  quantitative: string;
  valuation: string;
  summary: string;
}

async function analyzeAsset(
  ticker: string,
  isFii: boolean,
  quantContext: string,
  news: BraveResult[],
): Promise<AnalysisResult | null> {
  const snippets = news.map((r, i) => `[${i + 1}] ${r.title}\n${r.description}`).join("\n\n");
  const prompt = isFii
    ? FII_PROMPT(ticker, quantContext, snippets || "Sem notícias recentes encontradas.")
    : STOCK_PROMPT(ticker, quantContext, snippets || "Sem notícias recentes encontradas.");

  const msg = await claude.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const first = msg.content[0];
    const text = first && first.type === "text" ? first.text.trim() : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as AnalysisResult;
  } catch {
    return null;
  }
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

  // Agrupa por ticker, acumulando valor de mercado total para priorização
  type TickerEntry = { holderId: string; assetClass: string };
  const tickerHolders = new Map<string, TickerEntry[]>();
  const tickerValue = new Map<string, number>();
  for (const p of positions ?? []) {
    if (!ANALYSABLE_CLASSES.has(p.asset_class)) continue;
    if (!tickerHolders.has(p.ticker!)) tickerHolders.set(p.ticker!, []);
    tickerHolders.get(p.ticker!)!.push({ holderId: p.holder_id, assetClass: p.asset_class });
    tickerValue.set(p.ticker!, (tickerValue.get(p.ticker!) ?? 0) + (p.market_value_brl ?? 0));
  }

  // Processa apenas os top 10 tickers por valor total de carteira
  const TOP_N = 10;
  const sortedTickers = Array.from(tickerHolders.keys()).sort(
    (a, b) => (tickerValue.get(b) ?? 0) - (tickerValue.get(a) ?? 0),
  ).slice(0, TOP_N);

  let analyzed = 0;
  let created = 0;

  for (const ticker of sortedTickers) {
    const entries = tickerHolders.get(ticker)!;
    const assetClass = entries[0]!.assetClass;
    const isFii = FII_CLASSES.has(assetClass);
    const isStock = STOCK_CLASSES.has(assetClass);
    if (!isFii && !isStock) continue;

    // Busca dados quantitativos na plataforma especializada
    let quantContext = "Dados quantitativos não disponíveis.";

    if (isStock) {
      const data: FundamentusData | null = await fetchFundamentus(ticker);
      if (data) quantContext = stockQuantitativeContext(data);
    } else {
      const data: StatusInvestFiiData | null = await fetchStatusInvestFii(ticker);
      if (data) quantContext = fiiQuantitativeContext(data);
    }

    // Busca notícias qualitativas via Brave e chama Claude em paralelo quando possível
    const [news] = await Promise.all([getNewsSnippets(ticker)]);

    const analysis = await analyzeAsset(ticker, isFii, quantContext, news);
    analyzed++;

    if (!analysis) continue;

    const verdictLabel = { comprar: "Comprar", manter: "Manter", reduzir: "Reduzir" }[analysis.verdict];
    const description = [analysis.qualitative, analysis.quantitative, analysis.valuation]
      .filter(Boolean)
      .join(" | ");

    for (const { holderId } of entries) {
      const wasCreated = await createAlertDeduped(
        {
          holder_id: holderId,
          ticker,
          severity: analysis.severity,
          title: `${ticker} — ${verdictLabel} | Análise fundamentalista`,
          description,
          recommendation: analysis.summary,
          sources: news.slice(0, 3).map((r) => r.url),
          generated_by: "fundamental-analysis",
        },
        25 * 24,
        supabase,
      );
      if (wasCreated) created++;
    }
  }

  return { analyzed, created };
}
