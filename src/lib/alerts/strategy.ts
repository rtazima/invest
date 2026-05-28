import { getHolders } from "@/lib/data/holders";
import { getStrategy } from "@/lib/data/strategies";
import { getHolderSummary } from "@/lib/data/portfolio";
import { createAlertDeduped } from "@/lib/data/alerts";

const ASSET_CLASS_LABELS: Record<string, string> = {
  fixed_income: "Renda Fixa",
  stocks_br: "Ações BR",
  stocks_intl: "Ações Intl.",
  fiis: "FIIs",
  etf_br: "ETF BR",
  etf_intl: "ETF Intl.",
  funds: "Fundos",
  liquidity: "Liquidez",
};

export async function runStrategyAlignmentCheck(): Promise<{ created: number }> {
  const holders = await getHolders();
  let created = 0;

  for (const holder of holders) {
    const [strategy, summary] = await Promise.all([
      getStrategy(holder.id),
      getHolderSummary(holder.id),
    ]);

    if (!strategy || !summary || summary.totalBrl.lte(0)) continue;
    if (!strategy.allocations || strategy.allocations.length === 0) continue;

    for (const alloc of strategy.allocations) {
      const targetPct = alloc.target_pct * 100;
      const tolerancePct = alloc.tolerance_pct * 100;
      const classValue = summary.byAssetClass[alloc.asset_class];
      if (!classValue) continue;

      const actualPct = classValue.div(summary.totalBrl).times(100).toNumber();
      const deviation = actualPct - targetPct;
      const absDeviation = Math.abs(deviation);

      if (absDeviation <= tolerancePct) continue;

      const label = ASSET_CLASS_LABELS[alloc.asset_class] ?? alloc.asset_class;
      const direction = deviation > 0 ? "acima" : "abaixo";
      const severity = absDeviation > tolerancePct * 1.5 ? "critical" : "warning";

      const wasCreated = await createAlertDeduped(
        {
          holder_id: holder.id,
          ticker: alloc.asset_class,
          severity,
          title: `${label} desenquadrada — ${holder.name}`,
          description:
            `Posição atual: ${actualPct.toFixed(1)}% (alvo: ${targetPct.toFixed(1)}% ±${tolerancePct.toFixed(0)}%). ` +
            `Desvio de ${absDeviation.toFixed(1)}pp ${direction} da banda.`,
          recommendation: `Revise a alocação de ${label} na estratégia de ${holder.name}.`,
          generated_by: "strategy-alignment",
        },
        48,
      );

      if (wasCreated) created++;
    }
  }

  return { created };
}
