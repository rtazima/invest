/**
 * Tipos TypeScript centrais do projeto Invest.
 * Gerados a partir do schema SQL (Etapa 1).
 * Valores monetários: string (NUMERIC do DB → string via JSON para preservar precisão).
 * Nunca usar number para valores financeiros — use Decimal.js para cálculos.
 */

export type RiskProfile = "conservative" | "moderate" | "aggressive";

export type AssetClass =
  | "fiis"
  | "stocks_br"
  | "stocks_intl"
  | "fixed_income"
  | "funds"
  | "liquidity"
  | "etf_br"
  | "etf_intl";

export type Indexer = "cdi" | "ipca" | "igpm" | "selic" | "prefixado" | "usd" | "none";

export type Institution = "xp" | "btg" | "nomad" | "mercadopago";

export type ImportStatus = "pending" | "processing" | "completed" | "failed";

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertStatus = "unread" | "read" | "dismissed";

export type Currency = "BRL" | "USD";

// ── Titulares ──────────────────────────────────────────────────

export type HolderSlug = "rodrigo" | "grasi" | "amora" | "benicio";

export interface Holder {
  id: string;
  owner_id: string;
  name: string;
  slug: HolderSlug;
  birth_date: string | null;
  created_at: string;
  updated_at: string;
}

// ── Estratégias ────────────────────────────────────────────────

export interface Strategy {
  id: string;
  holder_id: string;
  risk_profile: RiskProfile;
  investment_horizon_years: number | null;
  goal_description: string | null;
  goal_monthly_income: string | null; // NUMERIC → string
  goal_target_age: number | null;
  liquidity_min_pct: string; // NUMERIC → string (ex: "0.1000")
  deviation_threshold_pct: string; // NUMERIC → string (ex: "0.0500")
  restricted_assets: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StrategyAllocation {
  id: string;
  strategy_id: string;
  asset_class: AssetClass;
  target_pct: string; // NUMERIC → string
  tolerance_pct: string; // NUMERIC → string
  rationale: string | null;
}

// ── Posições ───────────────────────────────────────────────────

export interface ImportBatch {
  id: string;
  holder_id: string;
  institution: Institution;
  status: ImportStatus;
  source: string;
  filename: string | null;
  row_count: number | null;
  exchange_rate: string | null;
  exchange_rate_date: string | null;
  error_message: string | null;
  imported_by: string | null;
  imported_at: string;
  completed_at: string | null;
}

export interface Position {
  id: string;
  batch_id: string;
  holder_id: string;
  institution: Institution;
  ticker: string | null;
  name: string;
  asset_class: AssetClass;
  currency: Currency;
  quantity: string;
  avg_price: string | null;
  current_price: string | null;
  market_value: string;
  cost_basis: string | null;
  pnl: string | null;
  pnl_pct: string | null;
  exchange_rate: string | null;
  market_value_brl: string;
  maturity_date: string | null;
  indexer: Indexer | null;
  indexer_rate: string | null;
  liquidity_days: number | null;
  quota_value: string | null;
  quota_date: string | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
}

// ── Alertas ────────────────────────────────────────────────────

export interface Alert {
  id: string;
  holder_id: string | null;
  ticker: string | null;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  recommendation: string | null;
  sources: string[] | null;
  generated_by: string;
  generated_at: string;
  read_at: string | null;
  dismissed_at: string | null;
}

// ── Cotações ───────────────────────────────────────────────────

export interface ExchangeRate {
  id: string;
  base_currency: Currency;
  quote_currency: Currency;
  rate: string;
  rate_date: string;
  source: string;
  created_at: string;
}

// ── Helpers de UI ──────────────────────────────────────────────

export interface PortfolioSummary {
  total_brl: string;
  total_cost_brl: string;
  total_pnl_brl: string;
  total_pnl_pct: string;
  positions_count: number;
  last_updated: string | null;
}
