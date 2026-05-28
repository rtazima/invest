import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/service";
import { createAlertDeduped } from "@/lib/data/alerts";
import { braveSearch, type BraveResult } from "@/lib/brave/client";

const claude = new Anthropic();

const VARIABLE_INCOME_CLASSES = new Set(["stocks_br", "stocks_intl", "fiis", "etf_br", "etf_intl"]);

async function filterRelevantNews(
  ticker: string,
  results: BraveResult[],
): Promise<{ summary: string; severity: "info" | "warning" | "critical" } | null> {
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
        content: `Avalie se as notícias abaixo sobre ${ticker} são relevantes para um investidor de longo prazo brasileiro.

Responda APENAS em JSON:
{"relevant": true/false, "severity": "info"|"warning"|"critical", "summary": "resumo em 1-2 frases se relevante, vazio se não"}

- relevant=false: notícias genéricas, inflação geral, artigos educativos, análise sem novidade
- info: resultado positivo, dividendo anunciado, expansão de negócio
- warning: resultado abaixo do esperado, saída de executivo-chave, investigação leve
- critical: fraude, recuperação judicial, queda abrupta, investigação CVM grave

Notícias:
${snippets}`,
      },
    ],
  });

  try {
    const first = msg.content[0];
    const text = first && first.type === "text" ? first.text.trim() : "";
    const parsed = JSON.parse(text) as {
      relevant: boolean;
      severity: "info" | "warning" | "critical";
      summary: string;
    };
    return parsed.relevant && parsed.summary ? { summary: parsed.summary, severity: parsed.severity } : null;
  } catch {
    console.warn(`[news-monitoring] JSON parse failed for ${ticker}`);
    return null;
  }
}

export async function runNewsMonitoring(): Promise<{ checked: number; created: number }> {
  const supabase = createServiceClient();

  const { data: holders } = await supabase.from("holders").select("id, name");
  if (!holders || holders.length === 0) return { checked: 0, created: 0 };

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
  if (batchIds.length === 0) return { checked: 0, created: 0 };

  const { data: positions } = await supabase
    .from("positions")
    .select("holder_id, ticker, asset_class")
    .in("batch_id", batchIds)
    .not("ticker", "is", null);

  let checked = 0;
  let created = 0;

  for (const holder of holders) {
    const tickers = [
      ...new Set(
        (positions ?? [])
          .filter((p) => p.holder_id === holder.id && VARIABLE_INCOME_CLASSES.has(p.asset_class))
          .map((p) => p.ticker as string),
      ),
    ];

    for (const ticker of tickers) {
      const results = await braveSearch(`${ticker} B3 ação FII notícia`, { count: 5, freshness: "pd" });
      checked++;

      const analysis = await filterRelevantNews(ticker, results);
      if (analysis) {
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
          supabase,
        );
        if (wasCreated) created++;
      }

      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return { checked, created };
}
