import Decimal from "decimal.js";
import type { ParsedPosition, AssetClass } from "./types";
import { parseDecimalUS } from "./validators";

const ASSET_CLASS_MAP: Record<string, AssetClass> = {
  etf: "etf_intl",
  stock: "stocks_intl",
  equity: "stocks_intl",
  bond: "fixed_income",
  fixed: "fixed_income",
  cash: "liquidity",
  money: "liquidity",
};

function detectAssetClassNomad(name: string, ticker: string): AssetClass {
  const n = (name + " " + ticker).toLowerCase();
  for (const [key, val] of Object.entries(ASSET_CLASS_MAP)) {
    if (n.includes(key)) return val;
  }
  return "stocks_intl";
}

function splitLine(line: string): string[] {
  return line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
}

export function parseNomad(csvText: string, exchangeRate: Decimal): ParsedPosition[] {
  const lines = csvText.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2 || !lines[0]) return [];

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase().trim());

  const col = (names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex((h) => h.includes(name));
      if (idx >= 0) return (row: string[]) => row[idx] ?? "";
    }
    return () => "";
  };

  const getSymbol = col(["symbol", "ticker"]);
  const getName = col(["name", "description", "security"]);
  const getQtd = col(["quantity", "shares", "units"]);
  const getAvg = col(["average cost", "avg cost", "cost basis per share", "avg price"]);
  const getLast = col(["last price", "current price", "price"]);
  const getValue = col(["current value", "market value", "value", "total value"]);

  const positions: ParsedPosition[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const row = splitLine(line);
    if (row.every((c) => !c)) continue;

    const rawSymbol = getSymbol(row);
    const rawName = getName(row);
    const rawValue = getValue(row);

    const displayName = rawName || rawSymbol;
    if (!displayName || !rawValue) continue;

    try {
      const marketValueUsd = parseDecimalUS(rawValue.replace(/\$/g, ""));
      const marketValueBrl = marketValueUsd.times(exchangeRate);
      const quantity = getQtd(row) ? parseDecimalUS(getQtd(row)) : new Decimal(1);
      const avgPrice = getAvg(row) ? parseDecimalUS(getAvg(row).replace(/\$/g, "")) : null;
      const currentPrice = getLast(row) ? parseDecimalUS(getLast(row).replace(/\$/g, "")) : null;

      void marketValueBrl;

      positions.push({
        ticker: rawSymbol.trim() || null,
        name: displayName.trim(),
        assetClass: detectAssetClassNomad(rawName, rawSymbol),
        currency: "USD",
        quantity,
        avgPrice,
        currentPrice,
        marketValue: marketValueUsd,
        maturityDate: null,
        indexer: null,
        indexerRate: null,
        liquidityDays: null,
        quotaValue: null,
        quotaDate: null,
        rawData: Object.fromEntries(headers.map((h, idx) => [h, row[idx] ?? ""])),
      });
    } catch {
      // linha inválida — continua
    }
  }

  return positions;
}
