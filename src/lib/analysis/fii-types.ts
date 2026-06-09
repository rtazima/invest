import type { SemaphoreState, AnalysisRule } from './types';

export type FiiType = 'tijolo' | 'papel' | 'fof' | 'hibrido' | 'desenvolvimento';
export type FiiSubsegment = 'logistica' | 'lajes' | 'shoppings' | 'hospitais' | 'agencias' | 'outros';

export const FII_TYPE_LABELS: Record<FiiType, string> = {
  tijolo: 'Tijolo',
  papel: 'Papel',
  fof: 'FOF',
  hibrido: 'Híbrido',
  desenvolvimento: 'Desenvolvimento',
};

export const FII_TYPE_COLORS: Record<FiiType, string> = {
  tijolo:        'oklch(0.65 0.12 30)',
  papel:         'oklch(0.65 0.13 160)',
  fof:           'oklch(0.65 0.12 250)',
  hibrido:       'oklch(0.65 0.12 55)',
  desenvolvimento: 'oklch(0.65 0.10 290)',
};

export const FII_SUBSEGMENT_LABELS: Partial<Record<FiiSubsegment, string>> = {
  logistica: 'Logística',
  lajes: 'Lajes corp.',
  shoppings: 'Shoppings',
  hospitais: 'Hospitais',
  agencias: 'Agências',
  outros: 'Outros',
};

export interface FiiFundamentalsSnapshot {
  ticker: string;
  fetched_at: string;
  preco_atual: number | null;
  dy_12m: number | null;
  dy_spread: number | null;
  taxa_ntnb: number | null;
  pvp: number | null;
  volume_medio: number | null;
  sustentabilidade_dist: number | null;
  taxa_administracao: number | null;
  // Tijolo
  vacancia_fisica: number | null;
  vacancia_financeira: number | null;
  contratos_atipicos_pct: number | null;
  prazo_medio_contratos: number | null;
  contratos_vencendo_24m: number | null;
  cap_rate: number | null;
  inadimplencia_inquilinos: number | null;
  concentracao_inquilino: number | null;
  concentracao_imovel: number | null;
  // Papel
  ltv_medio: number | null;
  inadimplencia_cri: number | null;
  high_grade_pct: number | null;
  concentracao_devedor: number | null;
  // FOF
  taxa_fof: number | null;
  manual_overrides: Record<string, number | null>;
}

export interface FiiAnalysisResult {
  ticker: string;
  analyzed_at: string;
  fii_type: FiiType;
  subsegment: FiiSubsegment | null;
  status: 'ok' | 'blocked' | 'no_data';
  missing_metrics: string[];
  semaphores: Record<string, SemaphoreState>;
  sustainability_override: boolean;
  quality_score: 'high' | 'medium' | 'low' | null;
  valuation: 'attractive' | 'fair' | 'stretched' | 'informational' | null;
  recommendation: 'buy' | 'hold' | 'sell' | 'avoid' | 'reduce' | null;
  trend_downgrade: boolean;
  justifications: Record<string, string>;
}

export interface FiiArchetype {
  ticker: string;
  archetype: FiiType;
  subsegment: FiiSubsegment | null;
  asset_class: 'fiis';
}

export interface FiiPageData {
  ticker: string;
  fiiType: FiiType | null;
  subsegment: FiiSubsegment | null;
  result: FiiAnalysisResult | null;
  fundamentals: FiiFundamentalsSnapshot | null;
  applicableRules: AnalysisRule[];
  positions: import('@/lib/data/analysis').PositionSummary[];
  totalMarketValue: number;
  totalQuantity: number;
}
