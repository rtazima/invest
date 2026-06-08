export type Archetype = 'financeiras' | 'asset_light' | 'capital_intensivo' | 'commodity' | 'utility';
export type SemaphoreState = 'ok' | 'warning' | 'critical' | 'informational' | 'missing';
export type Recommendation = 'buy' | 'hold' | 'sell' | 'avoid' | 'reduce';
export type QualityScore = 'high' | 'medium' | 'low';
export type ValuationRead = 'attractive' | 'fair' | 'stretched' | 'informational';
export type AnalysisStatus = 'ok' | 'blocked' | 'no_data';

export interface AnalysisRule {
  metric_id: string;
  archetype: Archetype | null;
  label: string;
  field_name: string;
  direction: 'lower_is_better' | 'higher_is_better';
  unit: string | null;
  structural: boolean;
  auto_fetch: boolean;
  threshold_ok: string;
  threshold_warning: string;
  threshold_critical: string;
  context_notes: string | null;
}

export interface FundamentalsSnapshot {
  ticker: string;
  fetched_at: string;
  pl: number | null;
  pvp: number | null;
  dy: number | null;
  ev_ebitda: number | null;
  marg_bruta: number | null;
  marg_ebit: number | null;
  marg_liquida: number | null;
  roe: number | null;
  roa: number | null;
  roic: number | null;
  div_liq_ebitda: number | null;
  cresc_rec_5a: number | null;
  preco_atual: number | null;
  volume_medio: number | null;
  manual_overrides: Record<string, number | null>;
}

export interface AnalysisResult {
  ticker: string;
  analyzed_at: string;
  archetype: Archetype | null;
  status: AnalysisStatus;
  missing_metrics: string[];
  semaphores: Record<string, SemaphoreState>;
  solvency_override: boolean;
  quality_score: QualityScore | null;
  valuation: ValuationRead | null;
  recommendation: Recommendation | null;
  trend_downgrade: boolean;
  justifications: Record<string, string>;
}

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  financeiras: 'Financeiras',
  asset_light: 'Asset-Light',
  capital_intensivo: 'Capital-Intensivo',
  commodity: 'Commodity',
  utility: 'Utility',
};

export const ARCHETYPE_COLORS: Record<Archetype, string> = {
  financeiras: 'oklch(0.65 0.12 250)',
  asset_light: 'oklch(0.65 0.13 160)',
  capital_intensivo: 'oklch(0.65 0.12 30)',
  commodity: 'oklch(0.65 0.12 55)',
  utility: 'oklch(0.65 0.10 290)',
};
