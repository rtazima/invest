import Decimal from "decimal.js";
import type { DBHolder, DBPosition, DBAlert, DBStrategy, DBStrategyAllocation } from "./database";

// Re-exporta tipos DB para uso nos componentes
export type { DBHolder, DBPosition, DBAlert, DBStrategy, DBStrategyAllocation };

export interface PortfolioSummary {
  totalBrl: Decimal;
  byHolder: HolderSummary[];
  byInstitution: Record<string, Decimal>;
  byAssetClass: Record<string, Decimal>;
  lastUpdatedAt: Date | null;
}

export interface HolderSummary {
  holder: DBHolder;
  totalBrl: Decimal;
  byInstitution: Record<string, Decimal>;
  byAssetClass: Record<string, Decimal>;
  positions: EnrichedPosition[];
  lastImportAt: Date | null;
}

export interface EnrichedPosition extends DBPosition {
  marketValueBrl: Decimal;
  pnlDecimal: Decimal | null;
  pnlPctDecimal: Decimal | null;
  isStaleQuota: boolean;
}

export function emptyPortfolioSummary(): PortfolioSummary {
  return {
    totalBrl: new Decimal(0),
    byHolder: [],
    byInstitution: {},
    byAssetClass: {},
    lastUpdatedAt: null,
  };
}
