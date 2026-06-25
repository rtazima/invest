import { describe, it, expect } from "vitest";
import { validateProposedAllocations, validatePortfolioState, type Policy } from "./validate";

const basePolicy: Policy = {
  liquidity_min_pct: 0.1,
  restricted_assets: null,
  max_loss_pct: null,
  max_single_asset_pct: null,
};

describe("validateProposedAllocations", () => {
  it("aceita uma alocação válida", () => {
    const v = validateProposedAllocations(basePolicy, [
      { asset_class: "liquidity", target_pct: 10, tolerance_pct: 3 },
      { asset_class: "fixed_income", target_pct: 50, tolerance_pct: 5 },
      { asset_class: "stocks_br", target_pct: 40, tolerance_pct: 5 },
    ]);
    expect(v).toHaveLength(0);
  });

  it("barra soma diferente de 100", () => {
    const v = validateProposedAllocations(basePolicy, [
      { asset_class: "fixed_income", target_pct: 50, tolerance_pct: 5 },
      { asset_class: "stocks_br", target_pct: 40, tolerance_pct: 5 },
    ]);
    expect(v.some((x) => x.kind === "sum" && x.severity === "critical")).toBe(true);
  });

  it("barra liquidez abaixo do mínimo", () => {
    const v = validateProposedAllocations(basePolicy, [
      { asset_class: "liquidity", target_pct: 5, tolerance_pct: 3 },
      { asset_class: "stocks_br", target_pct: 95, tolerance_pct: 5 },
    ]);
    expect(v.some((x) => x.kind === "liquidity" && x.severity === "critical")).toBe(true);
  });

  it("barra classe restrita", () => {
    const v = validateProposedAllocations(
      { ...basePolicy, restricted_assets: ["stocks_intl"] },
      [
        { asset_class: "liquidity", target_pct: 10, tolerance_pct: 3 },
        { asset_class: "stocks_intl", target_pct: 90, tolerance_pct: 5 },
      ],
    );
    expect(v.some((x) => x.kind === "restricted" && x.severity === "critical")).toBe(true);
  });
});

describe("validatePortfolioState", () => {
  const bands = [
    { asset_class: "fixed_income", target_pct: 50, tolerance_pct: 5 },
    { asset_class: "stocks_br", target_pct: 40, tolerance_pct: 5 },
  ];

  it("sem violação quando dentro das bandas e liquidez ok", () => {
    const v = validatePortfolioState(basePolicy, bands, {
      byAssetClassPct: { fixed_income: 50, stocks_br: 40, liquidity: 10 },
      holdings: [],
      liquidityPct: 10,
      unrealizedPnlPct: 2,
    });
    expect(v).toHaveLength(0);
  });

  it("detecta banda estourada (crítico se > 1.5x tolerância)", () => {
    const v = validatePortfolioState(basePolicy, bands, {
      byAssetClassPct: { fixed_income: 30, stocks_br: 60, liquidity: 10 },
      holdings: [],
      liquidityPct: 10,
      unrealizedPnlPct: null,
    });
    expect(v.some((x) => x.kind === "band" && x.asset_class === "stocks_br" && x.severity === "critical")).toBe(true);
  });

  it("detecta concentração e perda máxima", () => {
    const v = validatePortfolioState(
      { ...basePolicy, max_single_asset_pct: 0.1, max_loss_pct: 0.15 },
      bands,
      {
        byAssetClassPct: { fixed_income: 50, stocks_br: 40, liquidity: 10 },
        holdings: [{ ticker: "PETR4", pct: 18 }],
        liquidityPct: 10,
        unrealizedPnlPct: -20,
      },
    );
    expect(v.some((x) => x.kind === "concentration" && x.ticker === "PETR4")).toBe(true);
    expect(v.some((x) => x.kind === "max_loss" && x.severity === "critical")).toBe(true);
  });
});
