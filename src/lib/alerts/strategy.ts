import { createServiceClient } from "@/lib/supabase/service";
import { createAlertDeduped } from "@/lib/data/alerts";
import { validatePortfolioState } from "@/lib/policy/validate";
import type { Database } from "@/types/database";
import Decimal from "decimal.js";

type Strategy = Database["public"]["Tables"]["strategies"]["Row"];
type Allocation = Database["public"]["Tables"]["strategy_allocations"]["Row"];

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

async function getLatestBatchIds(supabase: ReturnType<typeof createServiceClient>, holderIds: string[]) {
  const { data: batches } = await supabase
    .from("import_batches")
    .select("id, holder_id, institution, filename, completed_at")
    .eq("status", "completed")
    .in("holder_id", holderIds)
    .order("completed_at", { ascending: false });

  const latestBatchId = new Map<string, string>();
  for (const b of batches ?? []) {
    const key = `${b.holder_id}:${b.institution}:${b.filename ?? ""}`;
    if (!latestBatchId.has(key)) latestBatchId.set(key, b.id);
  }
  return Array.from(latestBatchId.values());
}

export async function runStrategyAlignmentCheck(): Promise<{ created: number }> {
  const supabase = createServiceClient();

  const { data: holders } = await supabase.from("holders").select("*");
  if (!holders || holders.length === 0) return { created: 0 };

  const holderIds = holders.map((h) => h.id);
  const batchIds = await getLatestBatchIds(supabase, holderIds);
  if (batchIds.length === 0) return { created: 0 };

  const { data: positions } = await supabase
    .from("positions")
    .select("holder_id, ticker, asset_class, market_value_brl")
    .in("batch_id", batchIds);

  // Totaliza por (holder, asset_class) e por (holder, ticker)
  const byHolder = new Map<string, Map<string, Decimal>>();
  const byHolderTicker = new Map<string, Map<string, Decimal>>();
  for (const p of positions ?? []) {
    if (!byHolder.has(p.holder_id)) byHolder.set(p.holder_id, new Map());
    const map = byHolder.get(p.holder_id)!;
    const cur = map.get(p.asset_class) ?? new Decimal(0);
    map.set(p.asset_class, cur.plus(p.market_value_brl ?? 0));

    if (p.ticker) {
      if (!byHolderTicker.has(p.holder_id)) byHolderTicker.set(p.holder_id, new Map());
      const tmap = byHolderTicker.get(p.holder_id)!;
      tmap.set(p.ticker, (tmap.get(p.ticker) ?? new Decimal(0)).plus(p.market_value_brl ?? 0));
    }
  }

  const { data: strategies } = await supabase
    .from("strategies")
    .select("*, allocations:strategy_allocations(*)")
    .in("holder_id", holderIds);

  let created = 0;

  for (const holder of holders) {
    const strategy = (strategies ?? []).find((s) => s.holder_id === holder.id) as
      | (Strategy & { allocations: Allocation[] })
      | undefined;
    if (!strategy || !strategy.allocations.length) continue;

    const classMap = byHolder.get(holder.id);
    if (!classMap) continue;

    const total = Array.from(classMap.values()).reduce((s, v) => s.plus(v), new Decimal(0));
    if (total.lte(0)) continue;

    for (const alloc of strategy.allocations) {
      const targetPct = alloc.target_pct * 100;
      const tolerancePct = alloc.tolerance_pct * 100;
      const classValue = classMap.get(alloc.asset_class) ?? new Decimal(0);
      const actualPct = classValue.div(total).times(100).toNumber();
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
        supabase,
      );

      if (wasCreated) created++;
    }

    // Política além das bandas: concentração por ativo, classe restrita, liquidez mínima
    const byAssetClassPct: Record<string, number> = {};
    for (const [cls, v] of classMap) byAssetClassPct[cls] = v.div(total).times(100).toNumber();
    const tickerMap = byHolderTicker.get(holder.id) ?? new Map<string, Decimal>();
    const holdings = Array.from(tickerMap.entries()).map(([ticker, v]) => ({
      ticker,
      pct: v.div(total).times(100).toNumber(),
    }));
    const maxConc = (strategy as unknown as { max_single_asset_pct: number | null }).max_single_asset_pct ?? null;

    const policyViolations = validatePortfolioState(
      {
        liquidity_min_pct: strategy.liquidity_min_pct,
        restricted_assets: strategy.restricted_assets,
        max_loss_pct: null,
        max_single_asset_pct: maxConc,
      },
      [],
      { byAssetClassPct, holdings, liquidityPct: byAssetClassPct["liquidity"] ?? 0, unrealizedPnlPct: null },
    )
      // bandas já são cobertas pelo check acima; liquidez precisa de definição
      // por liquidity_days (refinamento), então aqui só concentração e restritos
      .filter((v) => v.kind === "concentration" || v.kind === "restricted");

    for (const v of policyViolations) {
      const label = v.asset_class ? (ASSET_CLASS_LABELS[v.asset_class] ?? v.asset_class) : null;
      const title =
        v.kind === "concentration"
          ? `${v.ticker} — concentração acima do limite — ${holder.name}`
          : `${label} — classe restrita na carteira — ${holder.name}`;
      const wasCreated = await createAlertDeduped(
        {
          holder_id: holder.id,
          ticker: v.ticker ?? v.asset_class ?? undefined,
          severity: v.severity,
          title,
          description: v.message,
          recommendation: `Revise a alocação de ${holder.name} para reenquadrar à política.`,
          generated_by: "policy-limit",
        },
        48,
        supabase,
      );
      if (wasCreated) created++;
    }
  }

  return { created };
}
