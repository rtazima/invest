import Decimal from "decimal.js";
import { getHolders } from "./holders";
import { getLatestPositions } from "./positions";
import { sumDecimals } from "@/lib/decimal";
import type { DBHolder } from "@/types/database";
import type { PortfolioSummary, HolderSummary, EnrichedPosition } from "@/types/domain";
import { emptyPortfolioSummary } from "@/types/domain";

export async function getPortfolioSummary(holderId?: string): Promise<PortfolioSummary> {
  const [holders, positions] = await Promise.all([
    getHolders(),
    getLatestPositions(holderId),
  ]);

  if (positions.length === 0) return emptyPortfolioSummary();

  const holderMap = new Map(holders.map((h) => [h.id, h]));
  const byHolderPositions = new Map<string, EnrichedPosition[]>();

  for (const pos of positions) {
    const list = byHolderPositions.get(pos.holder_id) ?? [];
    list.push(pos);
    byHolderPositions.set(pos.holder_id, list);
  }

  const holderSummaries: HolderSummary[] = [];

  for (const [hId, hPositions] of byHolderPositions) {
    const holder = holderMap.get(hId);
    if (!holder) continue;

    const summary = buildHolderSummary(holder, hPositions);
    holderSummaries.push(summary);
  }

  holderSummaries.sort((a, b) => b.totalBrl.cmp(a.totalBrl));

  const totalBrl = sumDecimals(holderSummaries.map((s) => s.totalBrl));
  const byInstitution = mergeRecords(holderSummaries.map((s) => s.byInstitution));
  const byAssetClass = mergeRecords(holderSummaries.map((s) => s.byAssetClass));
  const lastUpdatedAt = maxDate(holderSummaries.map((s) => s.lastImportAt));

  return { totalBrl, byHolder: holderSummaries, byInstitution, byAssetClass, lastUpdatedAt };
}

export async function getHolderSummary(holderId: string): Promise<HolderSummary | null> {
  const [holders, positions] = await Promise.all([
    getHolders(),
    getLatestPositions(holderId),
  ]);

  const holder = holders.find((h) => h.id === holderId);
  if (!holder) return null;

  return buildHolderSummary(holder, positions);
}

function buildHolderSummary(holder: DBHolder, positions: EnrichedPosition[]): HolderSummary {
  const byInstitution: Record<string, Decimal> = {};
  const byAssetClass: Record<string, Decimal> = {};
  let lastImportAt: Date | null = null;

  for (const pos of positions) {
    const val = pos.marketValueBrl;
    byInstitution[pos.institution] = (byInstitution[pos.institution] ?? new Decimal(0)).plus(val);
    byAssetClass[pos.asset_class] = (byAssetClass[pos.asset_class] ?? new Decimal(0)).plus(val);

    if (pos.created_at) {
      const d = new Date(pos.created_at);
      if (!lastImportAt || d > lastImportAt) lastImportAt = d;
    }
  }

  const totalBrl = sumDecimals(positions.map((p) => p.marketValueBrl));

  return { holder, totalBrl, byInstitution, byAssetClass, positions, lastImportAt };
}

function mergeRecords(records: Record<string, Decimal>[]): Record<string, Decimal> {
  const result: Record<string, Decimal> = {};
  for (const rec of records) {
    for (const [key, val] of Object.entries(rec)) {
      result[key] = (result[key] ?? new Decimal(0)).plus(val);
    }
  }
  return result;
}

function maxDate(dates: (Date | null)[]): Date | null {
  return dates.reduce<Date | null>((max, d) => {
    if (!d) return max;
    if (!max || d > max) return d;
    return max;
  }, null);
}
