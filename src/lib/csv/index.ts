import Decimal from "decimal.js";
import type { ParseResult, CsvFormat } from "./types";
import { parseXP } from "./xp-parser";
import { parseBTG } from "./btg-parser";
import { parseNomad } from "./nomad-parser";
import { validatePositions } from "./validators";

export { parseXP, parseBTG, parseNomad };
export type { ParseResult, CsvFormat };

export function detectFormat(csvText: string): CsvFormat | "unknown" {
  const firstLine = csvText.trim().split("\n")[0]?.toLowerCase() ?? "";

  if (
    firstLine.includes("xp investimentos") ||
    firstLine.includes("carteira xp") ||
    (firstLine.includes("ativo") && firstLine.includes("tipo") && firstLine.includes("valor financeiro"))
  ) {
    return "xp";
  }

  if (
    firstLine.includes("btg") ||
    (firstLine.includes("ativo") && firstLine.includes("valor mercado") && firstLine.includes("resultado"))
  ) {
    return "btg";
  }

  if (
    firstLine.includes("symbol") ||
    firstLine.includes("shares") ||
    (firstLine.includes("current value") && firstLine.includes("quantity"))
  ) {
    return "nomad";
  }

  if (firstLine.includes("ativo") && firstLine.includes("quantidade")) {
    return "xp";
  }

  return "unknown";
}

export function parseCSV(
  csvText: string,
  format: CsvFormat,
  exchangeRate?: Decimal,
): ParseResult {
  let positions = (() => {
    switch (format) {
      case "xp":
        return parseXP(csvText);
      case "btg":
        return parseBTG(csvText);
      case "nomad":
        return parseNomad(csvText, exchangeRate ?? new Decimal(1));
    }
  })();

  const errors = validatePositions(positions);
  const validRowIndices = new Set(errors.filter((e) => e.field === "market_value").map((e) => e.row - 2));
  positions = positions.filter((_, i) => !validRowIndices.has(i));

  return { positions, errors, format };
}
