export interface ClientHolderSummary {
  id: string;
  name: string;
  slug: string;
  role: string;
  riskProfile: string | null;
  totalBrl: number;
  byInstitution: Record<string, number>;
  byAssetClass: Record<string, number>;
}

export interface ClientPortfolioSummary {
  totalBrl: number;
  byHolder: ClientHolderSummary[];
  byInstitution: Record<string, number>;
  byAssetClass: Record<string, number>;
  lastUpdatedAt: string | null;
}

export interface ClientPosition {
  id: string;
  holder_id: string;
  holder_name: string;
  holder_slug: string;
  institution: string;
  ticker: string | null;
  name: string;
  asset_class: string;
  currency: string;
  quantity: number;
  avg_price: number | null;
  current_price: number | null;
  market_value: number;
  market_value_brl: number;
  pnl: number | null;
  pnl_pct: number | null;
  maturity_date: string | null;
  indexer: string | null;
  liquidity_days: number | null;
  quota_date: string | null;
  is_stale_quota: boolean;
  structures: Array<{ id: string; name: string; type: string; role: string }> | null;
  archetype: string | null;
  subsegment: string | null;
}

export interface ClientAlert {
  id: string;
  holder_id: string | null;
  ticker: string | null;
  severity: "info" | "warning" | "critical";
  status: "unread" | "read" | "dismissed";
  title: string;
  description: string;
  recommendation: string | null;
  generated_at: string;
}
