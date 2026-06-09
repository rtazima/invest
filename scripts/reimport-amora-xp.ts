#!/usr/bin/env tsx
/**
 * Re-importa PosicaoDetalhada (3).xlsx para Amora/XP usando o parser corrigido.
 * Remove o batch antigo (com quantity=1 nos FIIs) e insere dados corretos.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import Decimal from "decimal.js";
import { parseXPXlsx } from "../src/lib/xlsx/xp-xlsx-parser";

// ── Env ───────────────────────────────────────────────────────────────────────

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
  const env: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^"(.*)"$/, "$1");
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(env["NEXT_PUBLIC_SUPABASE_URL"]!, env["SUPABASE_SERVICE_ROLE_KEY"]!, {
  auth: { persistSession: false },
});

const HOLDER_ID = "c1f4cff4-e2ca-459f-a8bf-081356ec9442"; // Amora
const INSTITUTION = "xp";
const OLD_BATCH_ID = "0accedd3-dc0a-4f10-a45d-e96cb9a56ff7";
const XLSX_PATH = "/Users/tazima/Downloads/PosicaoDetalhada (3).xlsx";

async function main() {
  // Lê e parseia o XLSX com o parser corrigido
  console.log(`Parseando ${XLSX_PATH}...`);
  const buf = readFileSync(XLSX_PATH);
  const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const positions = parseXPXlsx(arrayBuf);
  console.log(`  ${positions.length} posições parseadas`);

  // Mostra FIIs para conferência
  const fiis = positions.filter(p => p.assetClass === "fiis");
  console.log(`\nFIIs (${fiis.length}):`);
  for (const p of fiis) {
    const avgPrice = p.avgPrice;
    const qty = p.quantity;
    const mv = p.marketValue;
    const costBasis = avgPrice ? avgPrice.times(qty) : null;
    const pnl = costBasis ? mv.minus(costBasis) : null;
    const pnlPct = costBasis?.gt(0) && pnl ? pnl.div(costBasis).times(100).toFixed(2) + "%" : "n/a";
    console.log(`  ${p.ticker ?? p.name}: qty=${qty} avg=${avgPrice?.toFixed(2) ?? "n/a"} mv=${mv.toFixed(2)} pnl%=${pnlPct}`);
  }

  // Remove batch antigo
  console.log(`\nRemovendo batch antigo (${OLD_BATCH_ID})...`);
  await supabase.from("positions").delete().eq("batch_id", OLD_BATCH_ID);
  await supabase.from("import_batches").delete().eq("id", OLD_BATCH_ID);
  console.log("  Removido");

  // Cria novo batch
  const { data: batch, error: batchErr } = await supabase
    .from("import_batches")
    .insert({
      holder_id: HOLDER_ID,
      institution: INSTITUTION,
      status: "processing",
      source: "xlsx",
      filename: "PosicaoDetalhada (3).xlsx",
    })
    .select()
    .single();

  if (batchErr || !batch) throw new Error(`Erro ao criar batch: ${batchErr?.message}`);
  const batchId = (batch as { id: string }).id;
  console.log(`Novo batch criado: ${batchId}`);

  // Monta rows
  const rows = positions.map(p => {
    const costBasis = p.avgPrice ? p.avgPrice.times(p.quantity) : null;
    const pnl = costBasis ? p.marketValue.minus(costBasis) : null;
    const pnlPct = costBasis?.gt(0) && pnl ? pnl.div(costBasis) : null;
    return {
      batch_id: batchId,
      holder_id: HOLDER_ID,
      institution: INSTITUTION,
      ticker: p.ticker,
      name: p.name,
      asset_class: p.assetClass,
      currency: p.currency,
      quantity: p.quantity.toNumber(),
      avg_price: p.avgPrice?.toNumber() ?? null,
      current_price: p.currentPrice?.toNumber() ?? null,
      market_value: p.marketValue.toNumber(),
      market_value_brl: p.marketValue.toNumber(),
      cost_basis: costBasis?.toNumber() ?? null,
      pnl: pnl?.toNumber() ?? null,
      pnl_pct: pnlPct?.toNumber() ?? null,
      exchange_rate: null,
      maturity_date: p.maturityDate?.toISOString().split("T")[0] ?? null,
      indexer: p.indexer,
      indexer_rate: p.indexerRate?.toNumber() ?? null,
      liquidity_days: p.liquidityDays,
      quota_value: p.quotaValue?.toNumber() ?? null,
      quota_date: p.quotaDate?.toISOString().split("T")[0] ?? null,
      raw_data: p.rawData ?? {},
    };
  });

  const { error: insertErr } = await supabase.from("positions").insert(rows);
  if (insertErr) {
    await supabase.from("import_batches").update({ status: "failed", error_message: insertErr.message }).eq("id", batchId);
    throw new Error(`Erro ao inserir: ${insertErr.message}`);
  }

  await supabase
    .from("import_batches")
    .update({ status: "completed", row_count: positions.length, completed_at: new Date().toISOString() })
    .eq("id", batchId);

  console.log(`\nConcluído: ${positions.length} posições salvas com dados corretos.`);
}

main().catch(err => { console.error("ERRO:", err); process.exit(1); });
