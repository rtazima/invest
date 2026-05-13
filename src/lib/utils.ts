import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Mescla classes Tailwind evitando conflitos.
 * Padrão shadcn/ui.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata valor monetário em BRL.
 * Usa Intl.NumberFormat para locale correto.
 */
export function formatBRL(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formata percentual com sinal.
 * Ex: 0.123 → "+12.3%" | -0.05 → "-5.0%"
 */
export function formatPct(value: number, decimals = 1): string {
  const pct = value * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(decimals)}%`;
}

/**
 * Sinal matemático correto: − (U+2212), não hífen.
 */
export function formatChange(value: number): string {
  if (value < 0) {
    return `−${Math.abs(value).toFixed(2)}`;
  }
  return `+${value.toFixed(2)}`;
}
