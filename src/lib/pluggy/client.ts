import Decimal from "decimal.js";
import type { ParsedPosition, AssetClass, Indexer } from "@/lib/csv/types";
import { fetchTesouroPrices, detectTesouroBondType, lookupPU } from "@/lib/tesouro/client";
import type { TesouroPriceMap } from "@/lib/tesouro/types";

const BASE = "https://api.pluggy.ai";

// ── Tipos Pluggy ───────────────────────────────────────────────────────────

export interface PluggyInvestment {
  id: string;
  name: string;
  code: string | null;
  type: string;
  subtype: string | null;
  quantity: number | null;
  amount: number | null;       // valor de mercado atual
  amountOriginal: number | null; // custo total
  value: number | null;          // preço unitário
  annualRate: number | null;
  cdRate: number | null;
  issuer: string | null;
  date: string | null;           // vencimento (ISO 8601)
  lastUpdatedAt: string | null;
  currencyCode: string;
}

// ── Auth ───────────────────────────────────────────────────────────────────

export async function getPluggyApiKey(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const res = await fetch(`${BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!res.ok) throw new Error(`Pluggy auth: HTTP ${res.status}`);
  const { apiKey } = (await res.json()) as { apiKey: string };
  return apiKey;
}

// ── Investimentos ──────────────────────────────────────────────────────────

export async function fetchPluggyInvestments(
  itemId: string,
  apiKey: string,
): Promise<PluggyInvestment[]> {
  const res = await fetch(`${BASE}/investments?itemId=${itemId}`, {
    headers: { "X-API-KEY": apiKey },
  });
  if (!res.ok) throw new Error(`Pluggy /investments: HTTP ${res.status}`);
  const { results } = (await res.json()) as { results: PluggyInvestment[] };
  return results;
}

// ── Mapeamento de tipos ────────────────────────────────────────────────────

function toAssetClass(
  type: string,
  subtype: string | null,
  name: string,
): AssetClass {
  if (type === "EQUITY") return "stocks_br";
  if (type === "MUTUAL_FUND") {
    if (subtype === "FIXED_INCOME_FUND") return "funds";
    const upper = name.toUpperCase();
    if (
      upper.includes("FII") ||
      upper.includes("FIAGRO") ||
      upper.includes("IMOBILI")
    )
      return "fiis";
    return "funds";
  }
  return "fixed_income";
}

function toIndexer(inv: PluggyInvestment): Indexer | null {
  if (inv.cdRate != null && inv.cdRate > 0) return "cdi";
  if (!inv.annualRate) return null;
  const upper = inv.name.toUpperCase();
  if (upper.includes("IPCA") || inv.subtype === "TREASURY") return "ipca";
  if (upper.includes("SELIC")) return "selic";
  if (upper.includes("IGPM") || upper.includes("IGP-M")) return "igpm";
  return "prefixado";
}

// ── Mapper principal ───────────────────────────────────────────────────────

// Retorna null quando o conector BTG não fornece dados válidos para o ativo
// (caso conhecido: Tesouro Direto retorna qty=0 e amount=0).
export function pluggyInvestmentToPosition(
  inv: PluggyInvestment,
  tesouroPrices: TesouroPriceMap,
): ParsedPosition | null {
  const isTreasury =
    inv.type === "FIXED_INCOME" && inv.subtype === "TREASURY";
  const qty = inv.quantity ?? 0;

  if (isTreasury && qty === 0) return null;

  const quantity = new Decimal(qty);
  let marketValue = new Decimal(inv.amount ?? 0);
  let currentPrice = inv.value != null ? new Decimal(inv.value) : null;

  let maturityDate: Date | null = null;
  if (inv.date) {
    const d = new Date(inv.date);
    if (!isNaN(d.getTime())) maturityDate = d;
  }

  // Tesouro Direto com quantidade mas sem preço: enriquece via Tesouro Transparente.
  if (isTreasury && marketValue.isZero() && quantity.gt(0) && maturityDate) {
    const bondType = detectTesouroBondType(inv.code, inv.name);
    if (bondType) {
      const pu = lookupPU(tesouroPrices, bondType, maturityDate);
      if (pu) {
        currentPrice = new Decimal(pu.puVenda);
        marketValue = quantity.mul(currentPrice);
      }
    }
  }

  // amountOriginal da Pluggy é o custo total, não o preço médio por unidade.
  const avgPrice =
    inv.amountOriginal != null && quantity.gt(0)
      ? new Decimal(inv.amountOriginal).div(quantity)
      : null;

  const isFund =
    inv.type === "MUTUAL_FUND" &&
    (inv.subtype === "FIXED_INCOME_FUND" || inv.subtype === "INVESTMENT_FUND");

  return {
    ticker:
      inv.code && /^[A-Z]{4}[0-9]{1,2}F?$/.test(inv.code) ? inv.code : null,
    name: inv.name,
    assetClass: toAssetClass(inv.type, inv.subtype, inv.name),
    currency: inv.currencyCode === "USD" ? "USD" : "BRL",
    quantity,
    avgPrice,
    currentPrice,
    marketValue,
    maturityDate,
    indexer: toIndexer(inv),
    indexerRate:
      inv.cdRate != null
        ? new Decimal(inv.cdRate)
        : inv.annualRate != null
          ? new Decimal(inv.annualRate)
          : null,
    liquidityDays: null,
    quotaValue: isFund && currentPrice ? currentPrice : null,
    quotaDate: null,
    rawData: {
      pluggy_id: inv.id,
      pluggy_code: inv.code ?? "",
      pluggy_type: inv.type,
      pluggy_subtype: inv.subtype ?? "",
      pluggy_issuer: inv.issuer ?? "",
    },
  };
}

// ── Helper de alto nível ───────────────────────────────────────────────────

export async function fetchPositionsFromPluggy(
  itemId: string,
  clientId: string,
  clientSecret: string,
): Promise<{ positions: ParsedPosition[]; skipped: number }> {
  const [apiKey, tesouroPrices] = await Promise.all([
    getPluggyApiKey(clientId, clientSecret),
    fetchTesouroPrices(),
  ]);

  const investments = await fetchPluggyInvestments(itemId, apiKey);

  let skipped = 0;
  const positions: ParsedPosition[] = [];

  for (const inv of investments) {
    const pos = pluggyInvestmentToPosition(inv, tesouroPrices);
    if (pos) positions.push(pos);
    else skipped++;
  }

  return { positions, skipped };
}
