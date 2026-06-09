#!/usr/bin/env tsx
/**
 * Sync Pluggy → Supabase sem depender de sessão autenticada.
 * Usa service role key para acesso direto ao banco.
 *
 * Uso: pnpm tsx scripts/pluggy-sync.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import Decimal from "decimal.js";

// ── Carrega .env.local ────────────────────────────────────────────────────────

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(path, "utf-8");
  const env: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^"(.*)"$/, "$1");
    env[key] = val;
  }
  return env;
}

const env = loadEnv();

const SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"]!;
const SERVICE_ROLE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]!;
const PLUGGY_CLIENT_ID = env["PLUGGY_CLIENT_ID"]!;
const PLUGGY_CLIENT_SECRET = env["PLUGGY_CLIENT_SECRET"]!;

const ITEMS: { institution: string; itemId: string; holderId: string }[] = [
  {
    institution: "xp",
    itemId: env["PLUGGY_ITEM_ID_XP"]!,
    holderId: "aedf440b-5263-4753-a42e-d965ce5027ab", // Tazima
  },
  {
    institution: "btg",
    itemId: env["PLUGGY_ITEM_ID_BTG"]!,
    holderId: "aedf440b-5263-4753-a42e-d965ce5027ab", // Tazima
  },
];

// ── Pluggy API ────────────────────────────────────────────────────────────────

const BASE = "https://api.pluggy.ai";

async function getApiKey(): Promise<string> {
  const res = await fetch(`${BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: PLUGGY_CLIENT_ID, clientSecret: PLUGGY_CLIENT_SECRET }),
  });
  if (!res.ok) throw new Error(`Pluggy auth: HTTP ${res.status} — ${await res.text()}`);
  const { apiKey } = (await res.json()) as { apiKey: string };
  return apiKey;
}

interface PluggyInvestment {
  id: string;
  name: string;
  code: string | null;
  type: string;
  subtype: string | null;
  quantity: number | null;
  amount: number | null;
  amountOriginal: number | null;
  value: number | null;
  annualRate: number | null;
  cdRate: number | null;
  issuer: string | null;
  date: string | null;
  lastUpdatedAt: string | null;
  currencyCode: string;
}

async function fetchInvestments(itemId: string, apiKey: string): Promise<PluggyInvestment[]> {
  const res = await fetch(`${BASE}/investments?itemId=${itemId}`, {
    headers: { "X-API-KEY": apiKey },
  });
  if (!res.ok) throw new Error(`Pluggy /investments: HTTP ${res.status} — ${await res.text()}`);
  const { results } = (await res.json()) as { results: PluggyInvestment[] };
  return results;
}

// ── Mapeamento ────────────────────────────────────────────────────────────────

type AssetClass = "stocks_br" | "stocks_intl" | "fiis" | "etf_br" | "etf_intl" | "fixed_income" | "funds" | "liquidity" | "crypto" | "real_estate";
type Indexer = "cdi" | "ipca" | "selic" | "igpm" | "prefixado";

function toAssetClass(type: string, subtype: string | null, name: string): AssetClass {
  if (type === "EQUITY") return "stocks_br";
  if (type === "MUTUAL_FUND") {
    if (subtype === "FIXED_INCOME_FUND") return "funds";
    const upper = name.toUpperCase();
    if (upper.includes("FII") || upper.includes("FIAGRO") || upper.includes("IMOBILI")) return "fiis";
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

interface MappedPosition {
  ticker: string | null;
  name: string;
  asset_class: AssetClass;
  currency: string;
  quantity: number;
  avg_price: number | null;
  current_price: number | null;
  market_value: number;
  cost_basis: number | null;
  pnl: number | null;
  pnl_pct: number | null;
  maturity_date: string | null;
  indexer: Indexer | null;
  indexer_rate: number | null;
  liquidity_days: number | null;
  quota_value: number | null;
  quota_date: string | null;
  raw_data: Record<string, string>;
}

function mapInvestment(inv: PluggyInvestment): MappedPosition | null {
  const isTreasury = inv.type === "FIXED_INCOME" && inv.subtype === "TREASURY";
  const qty = inv.quantity ?? 0;
  if (isTreasury && qty === 0) return null;

  const quantity = new Decimal(qty);
  const marketValue = new Decimal(inv.amount ?? 0);
  const currentPrice = inv.value != null ? new Decimal(inv.value) : null;

  let maturityDate: string | null = null;
  if (inv.date) {
    const d = new Date(inv.date);
    if (!isNaN(d.getTime())) maturityDate = d.toISOString().split("T")[0]!;
  }

  const avgPrice =
    inv.amountOriginal != null && quantity.gt(0)
      ? new Decimal(inv.amountOriginal).div(quantity)
      : null;

  const costBasis = avgPrice ? avgPrice.times(quantity) : null;
  const pnl = costBasis ? marketValue.minus(costBasis) : null;
  const pnlPct = costBasis?.gt(0) && pnl ? pnl.div(costBasis) : null;

  const isFund = inv.type === "MUTUAL_FUND" &&
    (inv.subtype === "FIXED_INCOME_FUND" || inv.subtype === "INVESTMENT_FUND");

  return {
    ticker: inv.code && /^[A-Z]{4}[0-9]{1,2}F?$/.test(inv.code) ? inv.code : null,
    name: inv.name,
    asset_class: toAssetClass(inv.type, inv.subtype ?? null, inv.name),
    currency: inv.currencyCode === "USD" ? "USD" : "BRL",
    quantity: quantity.toNumber(),
    avg_price: avgPrice?.toNumber() ?? null,
    current_price: currentPrice?.toNumber() ?? null,
    market_value: marketValue.toNumber(),
    cost_basis: costBasis?.toNumber() ?? null,
    pnl: pnl?.toNumber() ?? null,
    pnl_pct: pnlPct?.toNumber() ?? null,
    maturity_date: maturityDate,
    indexer: toIndexer(inv),
    indexer_rate: inv.cdRate != null ? inv.cdRate : inv.annualRate ?? null,
    liquidity_days: null,
    quota_value: isFund && currentPrice ? currentPrice.toNumber() : null,
    quota_date: null,
    raw_data: {
      pluggy_id: inv.id,
      pluggy_code: inv.code ?? "",
      pluggy_type: inv.type,
      pluggy_subtype: inv.subtype ?? "",
      pluggy_issuer: inv.issuer ?? "",
    },
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function syncOne(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  item: (typeof ITEMS)[number],
) {
  const { institution, itemId, holderId } = item;
  console.log(`\n[${institution.toUpperCase()}] Buscando posições...`);

  const investments = await fetchInvestments(itemId, apiKey);
  console.log(`  ${investments.length} investimentos recebidos da Pluggy`);

  const positions: MappedPosition[] = [];
  let skipped = 0;
  for (const inv of investments) {
    const mapped = mapInvestment(inv);
    if (mapped) positions.push(mapped);
    else skipped++;
  }
  console.log(`  ${positions.length} posições válidas, ${skipped} ignoradas`);

  if (positions.length === 0) {
    console.log(`  Nenhuma posição — abortando sync para ${institution.toUpperCase()}`);
    return;
  }

  // Remove batches Pluggy anteriores
  const { data: oldBatches } = await supabase
    .from("import_batches")
    .select("id")
    .eq("holder_id", holderId)
    .eq("institution", institution)
    .eq("source", "pluggy");

  if (oldBatches && oldBatches.length > 0) {
    const oldIds = oldBatches.map((b: { id: string }) => b.id);
    await supabase.from("positions").delete().in("batch_id", oldIds);
    await supabase.from("import_batches").delete().in("id", oldIds);
    console.log(`  ${oldIds.length} batch(es) Pluggy anterior(es) removido(s)`);
  }

  // Cria novo batch
  const { data: batch, error: batchErr } = await supabase
    .from("import_batches")
    .insert({
      holder_id: holderId,
      institution,
      status: "processing",
      source: "pluggy",
      filename: `pluggy-${institution}-${new Date().toISOString().split("T")[0]}`,
    })
    .select()
    .single();

  if (batchErr || !batch) throw new Error(`Erro ao criar batch: ${batchErr?.message}`);

  // Insere posições
  const rows = positions.map((p) => ({
    batch_id: (batch as { id: string }).id,
    holder_id: holderId,
    institution,
    ...p,
    market_value_brl: p.market_value,
    exchange_rate: null,
  }));

  const { error: insertErr } = await supabase.from("positions").insert(rows);
  if (insertErr) {
    await supabase.from("import_batches").update({ status: "failed", error_message: insertErr.message }).eq("id", (batch as { id: string }).id);
    throw new Error(`Erro ao inserir posições: ${insertErr.message}`);
  }

  await supabase
    .from("import_batches")
    .update({ status: "completed", row_count: positions.length, completed_at: new Date().toISOString() })
    .eq("id", (batch as { id: string }).id);

  console.log(`  Sync concluído: ${positions.length} posições salvas`);
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  console.log("Autenticando na Pluggy...");
  const apiKey = await getApiKey();
  console.log("OK");

  for (const item of ITEMS) {
    await syncOne(supabase, apiKey, item);
  }

  console.log("\nSync completo.");
}

main().catch((err) => {
  console.error("ERRO:", err);
  process.exit(1);
});
