import { Metadata } from "next";
import { getPortfolioSummary } from "@/lib/data/portfolio";
import { getLatestPositions } from "@/lib/data/positions";
import { getInstitutionSyncStatuses } from "@/lib/data/sync";
import { getHolders } from "@/lib/data/holders";
import { getStructuresForAllHolders } from "@/lib/data/structures";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { PriceRefresher } from "@/components/dashboard/PriceRefresher";
import type { ClientPortfolioSummary, ClientPosition } from "@/components/dashboard/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard — Invest" };

export default async function DashboardPage() {
  const [summary, positions, holders, syncStatuses, structureMap] = await Promise.all([
    getPortfolioSummary(),
    getLatestPositions(),
    getHolders(),
    getInstitutionSyncStatuses(),
    getStructuresForAllHolders(),
  ]);

  const holderMap = new Map(holders.map((h) => [h.id, h]));

  const clientSummary: ClientPortfolioSummary = {
    totalBrl: summary.totalBrl.toNumber(),
    byHolder: summary.byHolder.map((h) => ({
      id: h.holder.id,
      name: h.holder.name,
      slug: h.holder.slug,
      role: h.holder.role,
      totalBrl: h.totalBrl.toNumber(),
      byInstitution: Object.fromEntries(
        Object.entries(h.byInstitution).map(([k, v]) => [k, v.toNumber()]),
      ),
      byAssetClass: Object.fromEntries(
        Object.entries(h.byAssetClass).map(([k, v]) => [k, v.toNumber()]),
      ),
    })),
    byInstitution: Object.fromEntries(
      Object.entries(summary.byInstitution).map(([k, v]) => [k, v.toNumber()]),
    ),
    byAssetClass: Object.fromEntries(
      Object.entries(summary.byAssetClass).map(([k, v]) => [k, v.toNumber()]),
    ),
    lastUpdatedAt: summary.lastUpdatedAt?.toISOString() ?? null,
  };

  const clientPositions: ClientPosition[] = positions.map((p) => {
    const holder = holderMap.get(p.holder_id);
    const structureKey = p.ticker ? `${p.holder_id}:${p.ticker.toUpperCase()}` : null;
    const structures = structureKey ? (structureMap.get(structureKey) ?? null) : null;
    return {
      id: p.id,
      holder_id: p.holder_id,
      holder_name: holder?.name ?? "—",
      holder_slug: holder?.slug ?? "",
      institution: p.institution,
      ticker: p.ticker,
      name: p.name,
      asset_class: p.asset_class,
      currency: p.currency,
      quantity: Number(p.quantity),
      avg_price: p.avg_price !== null ? Number(p.avg_price) : null,
      current_price: p.current_price !== null ? Number(p.current_price) : null,
      market_value: Number(p.market_value),
      market_value_brl: p.marketValueBrl.toNumber(),
      pnl: p.pnlDecimal?.toNumber() ?? null,
      pnl_pct: p.pnlPctDecimal?.toNumber() ?? null,
      maturity_date: p.maturity_date,
      indexer: p.indexer,
      liquidity_days: p.liquidity_days,
      quota_date: p.quota_date,
      is_stale_quota: p.isStaleQuota,
      structures: structures && structures.length > 0 ? structures : null,
    };
  });

  return (
    <>
      <PriceRefresher />
      <DashboardView
        summary={clientSummary}
        positions={clientPositions}
        syncStatuses={syncStatuses}
      />
    </>
  );
}
