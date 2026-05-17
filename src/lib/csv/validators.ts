import Decimal from "decimal.js";
import type { ParsedPosition, ParseError } from "./types";

export function validatePositions(positions: ParsedPosition[]): ParseError[] {
  const errors: ParseError[] = [];

  positions.forEach((pos, i) => {
    const row = i + 2;

    if (!pos.name || pos.name.trim().length === 0) {
      errors.push({ row, field: "name", message: "Nome do ativo é obrigatório" });
    }

    if (pos.marketValue.isNaN() || pos.marketValue.isNegative()) {
      errors.push({ row, field: "market_value", message: "Valor de mercado inválido" });
    }

    if (pos.quantity.isNaN()) {
      errors.push({ row, field: "quantity", message: "Quantidade inválida" });
    }

    if (pos.avgPrice?.isNegative()) {
      errors.push({ row, field: "avg_price", message: "Preço médio não pode ser negativo" });
    }
  });

  return errors;
}

export function parseDecimalBR(value: string): Decimal {
  const clean = value.trim().replace(/\./g, "").replace(",", ".");
  const n = new Decimal(clean);
  if (n.isNaN()) throw new Error(`Valor inválido: ${value}`);
  return n;
}

export function parseDecimalUS(value: string): Decimal {
  const clean = value.trim().replace(/,/g, "");
  return new Decimal(clean);
}

export function parseDateBR(value: string): Date | null {
  const parts = value.trim().split("/");
  if (parts.length !== 3) return null;
  const [day = "", month = "", year = ""] = parts;
  const d = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

export function parseDateUS(value: string): Date | null {
  const d = new Date(value.trim() + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

export function parsePct(value: string): Decimal | null {
  const clean = value.replace("%", "").replace(",", ".").trim();
  try {
    return new Decimal(clean).div(100);
  } catch {
    return null;
  }
}
