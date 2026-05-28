import { Metadata } from "next";
import { getPortfolioSummary } from "@/lib/data/portfolio";
import { getAlerts } from "@/lib/data/alerts";
import { getLatestPositions } from "@/lib/data/positions";
import { getInstitutionSyncStatuses } from "@/lib/data/sync";
import { getHolders } from "@/lib/data/holders";
import { DashboardView } from "@/components/dashboard/DashboardView";
import type { ClientPortfolioSummary, ClientPosition, ClientAlert } from "@/components/dashboard/types";

export const metadata: Metadata = { title: "Dashboard — Invest" };

export default async function DashboardPage() {
  const [summary, alerts, positions, holders, syncStatuses] = await Promise.all([
    getPortfolioSummary(),
    getAlerts({ status: "unread", limit: 30 }),
    getLatestPositions(),
    getHolders(),
    getInstitutionSyncStatuses(),
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
    };
  });

  const clientAlerts: ClientAlert[] = alerts.map((a) => ({
    id: a.id,
    holder_id: a.holder_id,
    ticker: a.ticker,
    severity: a.severity,
    status: a.status,
    title: a.title,
    description: a.description,
    recommendation: a.recommendation,
    generated_at: a.generated_at,
  }));

  return (
    <DashboardView
      summary={clientSummary}
      positions={clientPositions}
      alerts={clientAlerts}
      syncStatuses={syncStatuses}
    />
  );
}
