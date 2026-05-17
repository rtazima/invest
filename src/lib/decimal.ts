import Decimal from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

// Converte qualquer valor numérico do DB (string | number) para Decimal
export function toDecimal(value: string | number | null | undefined): Decimal {
  if (value === null || value === undefined) return new Decimal(0);
  return new Decimal(String(value));
}

export function formatBRL(value: Decimal | string | number): string {
  const d = value instanceof Decimal ? value : toDecimal(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(d.toNumber());
}

// Formata percentual com sinal explícito. Ex: 0.1234 → "+12.34%"
export function formatPct(value: Decimal | string | number, decimals = 2): string {
  const d = value instanceof Decimal ? value : toDecimal(value);
  const pct = d.times(100);
  const sign = pct.gte(0) ? "+" : "";
  return `${sign}${pct.toFixed(decimals)}%`;
}

// Formata número em fonte mono com sinal − (U+2212) para negativos
export function formatMono(value: Decimal | string | number, decimals = 2): string {
  const d = value instanceof Decimal ? value : toDecimal(value);
  if (d.isNegative()) {
    return `−${d.abs().toFixed(decimals)}`;
  }
  return d.toFixed(decimals);
}

// Converte valor em moeda estrangeira para BRL usando cotação
export function toBRL(value: Decimal, rate: Decimal): Decimal {
  return value.times(rate);
}

// Soma array de Decimals com segurança
export function sumDecimals(values: (Decimal | null | undefined)[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(v ?? 0), new Decimal(0));
}
