import Anthropic from "@anthropic-ai/sdk";
import { getHolders } from "@/lib/data/holders";
import { getLatestPositions } from "@/lib/data/positions";
import { createAlertDeduped } from "@/lib/data/alerts";
import { braveSearch, type BraveResult } from "@/lib/brave/client";

const claude = new Anthropic();

interface TickerNews {
  ticker: string;
  results: BraveResult[];
}

async function searchTickerNews(ticker: string): Promise<BraveResult[]> {
  // Busca notícias do último dia sobre o ativo
  return braveSearch(`${ticker} B3 ação FII notícia`, { count: 5, freshness: "pd" });
}

async function filterRelevantNews(
  ticker: string,
  results: BraveResult[],
): Promise<{ relevant: boolean; summary: string; severity: "info" | "warning" | "critical" } | null> {
  if (results.length === 0) return null;

  const snippets = results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.description}`)
    .join("\n\n");

  const msg = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Você é um assistente de análise de investimentos. Avalie se as notícias abaixo sobre ${ticker} são relevantes para um investidor de longo prazo brasileiro.

Responda APENAS em JSON neste formato exato:
{"relevant": true/false, "severity": "info"|"warning"|"critical", "summary": "resumo em 1-2 frases se relevante, vazio se não"}

Critérios:
- relevant=false: notícias genéricas de mercado, inflação geral, artigos educativos, preços sem contexto
- relevant=true + info: resultado financeiro positivo, dividendo anunciado, expansão de negócio
- relevant=true + warning: resultado abaixo do esperado, saída de executivo-chave, investigação regulatória leve
- relevant=true + critical: fraude, recuperação judicial, investigação CVM grave, queda >15% sem explicação

Notícias:
${snippets}`,
      },
    ],
  });

  try {
    const first = msg.content[0];
    const text = first && first.type === "text" ? first.text : "";
    const parsed = JSON.parse(text.trim()) as {
      relevant: boolean;
      severity: "info" | "warning" | "critical";
      summary: string;
    };
    return parsed.relevant ? parsed : null;
  } catch {
    return null;
  }
}

export async function runNewsMonitoring(): Promise<{ checked: number; created: number }> {
  const holders = await getHolders();
  let checked = 0;
  let created = 0;

  for (const holder of holders) {
    const positions = await getLatestPositions(holder.id);
    const tickers = [
      ...new Set(
        positions
          .filter((p) => p.ticker && ["stocks_br", "stocks_intl", "fiis", "etf_br", "etf_intl"].includes(p.asset_class))
          .map((p) => p.ticker as string),
      ),
    ];

    if (tickers.length === 0) continue;

    const newsPerTicker: TickerNews[] = [];
    for (const ticker of tickers) {
      const results = await searchTickerNews(ticker);
      if (results.length > 0) newsPerTicker.push({ ticker, results });
      checked++;
      // Pausa para não estourar rate limit do Brave
      await new Promise((r) => setTimeout(r, 300));
    }

    // Filtra e cria alertas por ticker relevante
    for (const { ticker, results } of newsPerTicker) {
      const analysis = await filterRelevantNews(ticker, results);
      if (!analysis) continue;

      const wasCreated = await createAlertDeduped(
        {
          holder_id: holder.id,
          ticker,
          severity: analysis.severity,
          title: `${ticker} — notícia relevante`,
          description: analysis.summary,
          sources: results.slice(0, 3).map((r) => r.url),
          generated_by: "news-monitoring",
        },
        24,
      );

      if (wasCreated) created++;
    }
  }

  return { checked, created };
}
