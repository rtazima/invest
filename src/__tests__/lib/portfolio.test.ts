import { describe, it, expect, vi, beforeEach } from "vitest";
import Decimal from "decimal.js";
import { emptyPortfolioSummary } from "@/types/domain";

// Mock data layer — getPortfolioSummary delegates to getHolders + getLatestPositions
vi.mock("@/lib/data/holders", () => ({
  getHolders: vi.fn(),
}));

vi.mock("@/lib/data/positions", () => ({
  getLatestPositions: vi.fn(),
}));

import { getHolders } from "@/lib/data/holders";
import { getLatestPositions } from "@/lib/data/positions";
import { getPortfolioSummary, getHolderSummary } from "@/lib/data/portfolio";

const mockHolder = {
  id: "holder-1",
  name: "Rodrigo",
  slug: "rodrigo",
  birth_date: null,
  cpf: null,
  family_id: null,
  full_name: null,
  role: "owner",
  user_id: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockPosition = {
  id: "pos-1",
  holder_id: "holder-1",
  batch_id: "batch-1",
  institution: "xp" as const,
  asset_class: "stocks_br" as const,
  ticker: "PETR4",
  name: "Petrobras",
  quantity: 100,
  avg_price: 30,
  current_price: 35,
  market_value: 3500,
  market_value_brl: 3500,
  pnl: 500,
  pnl_pct: 0.1667,
  currency: "BRL" as const,
  quota_date: null,
  quota_value: null,
  maturity_date: null,
  liquidity_days: null,
  indexer: null,
  indexer_rate: null,
  cost_basis: null,
  exchange_rate: null,
  raw_data: null,
  created_at: "2024-01-15T00:00:00Z",
  // EnrichedPosition fields
  marketValueBrl: new Decimal("3500"),
  pnlDecimal: new Decimal("500"),
  pnlPctDecimal: new Decimal("0.1667"),
  isStaleQuota: false,
  structureRefs: [],
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("emptyPortfolioSummary", () => {
  it("returns zero total and empty arrays", () => {
    const s = emptyPortfolioSummary();
    expect(s.totalBrl.isZero()).toBe(true);
    expect(s.byHolder).toHaveLength(0);
    expect(s.lastUpdatedAt).toBeNull();
  });
});

describe("getPortfolioSummary", () => {
  it("returns empty summary when no positions", async () => {
    vi.mocked(getHolders).mockResolvedValue([mockHolder]);
    vi.mocked(getLatestPositions).mockResolvedValue([]);

    const summary = await getPortfolioSummary();
    expect(summary.totalBrl.isZero()).toBe(true);
    expect(summary.byHolder).toHaveLength(0);
  });

  it("aggregates positions correctly", async () => {
    vi.mocked(getHolders).mockResolvedValue([mockHolder]);
    vi.mocked(getLatestPositions).mockResolvedValue([mockPosition]);

    const summary = await getPortfolioSummary();
    expect(summary.totalBrl.toString()).toBe("3500");
    expect(summary.byHolder).toHaveLength(1);
    expect(summary.byHolder[0]?.holder.name).toBe("Rodrigo");
    expect(summary.byHolder[0]?.totalBrl.toString()).toBe("3500");
    expect(summary.byInstitution["xp"]?.toString()).toBe("3500");
    expect(summary.byAssetClass["stocks_br"]?.toString()).toBe("3500");
  });

  it("sums multiple positions across holders", async () => {
    const holder2 = { ...mockHolder, id: "holder-2", name: "Grasi", slug: "grasi" };
    const pos2 = { ...mockPosition, id: "pos-2", holder_id: "holder-2", marketValueBrl: new Decimal("1000"), market_value_brl: 1000 };

    vi.mocked(getHolders).mockResolvedValue([mockHolder, holder2]);
    vi.mocked(getLatestPositions).mockResolvedValue([mockPosition, pos2]);

    const summary = await getPortfolioSummary();
    expect(summary.totalBrl.toString()).toBe("4500");
    expect(summary.byHolder).toHaveLength(2);
  });
});

describe("getHolderSummary", () => {
  it("returns null if holder not found", async () => {
    vi.mocked(getHolders).mockResolvedValue([]);
    vi.mocked(getLatestPositions).mockResolvedValue([]);

    const result = await getHolderSummary("nonexistent");
    expect(result).toBeNull();
  });

  it("returns summary for known holder", async () => {
    vi.mocked(getHolders).mockResolvedValue([mockHolder]);
    vi.mocked(getLatestPositions).mockResolvedValue([mockPosition]);

    const result = await getHolderSummary("holder-1");
    if (!result) throw new Error("expected result");
    expect(result.totalBrl.toString()).toBe("3500");
    expect(result.positions).toHaveLength(1);
  });
});
