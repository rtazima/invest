/**
 * Insere NTNB 2060 como csv_supplement para complementar o batch Pluggy do BTG.
 * Dados do extrato BTG (01/05/26–31/05/26): qty=12, IPCA+7%, venc 2060-08-15.
 * PU obtido em tempo real do Tesouro Transparente.
 *
 * Uso: pnpm tsx scripts/insert-ntnb-supplement.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const TESOURO_CSV_URL =
  "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv";

// Dados extraídos do extrato BTG (report_BTG_Tazima.xls)
const HOLDER_ID = "aedf440b-5263-4753-a42e-d965ce5027ab"; // Tazima
const INSTITUTION = "btg";
const NTNB_QTY = 12; // 2 lotes de 6
const NTNB_AVG_PRICE = (24811.27 + 24886.06) / NTNB_QTY; // custo médio = 4141.44
const NTNB_TIPO = "Tesouro IPCA+ com Juros Semestrais";
const NTNB_VENC = "2060-08-15";
const NTNB_INDEXER_RATE = 7.00; // IPCA + 7,00%

function parseDateBR(s: string): string {
  const [d, m, y] = s.split("/");
  return `${y}-${m?.padStart(2, "0")}-${d?.padStart(2, "0")}`;
}
function parseNum(s: string): number {
  return parseFloat(s.replace(/\./g, "").replace(",", "."));
}

async function fetchPU(): Promise<{ puVenda: number; puCompra: number; dataBase: string }> {
  const res = await fetch(TESOURO_CSV_URL);
  const buf = await res.arrayBuffer();
  const text = new TextDecoder("latin1").decode(buf);
  const lines = text.split("\n").map((l) => l.trimEnd());
  const hdr = lines[0]!.split(";");
  const idx = (n: string) => hdr.indexOf(n);

  let latestBase = "";
  let latestCols: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(";");
    const tipo = cols[idx("Tipo Titulo")]?.trim();
    if (tipo !== NTNB_TIPO) continue;
    const venc = parseDateBR(cols[idx("Data Vencimento")]?.trim() ?? "");
    if (venc !== NTNB_VENC) continue;
    const base = parseDateBR(cols[idx("Data Base")]?.trim() ?? "");
    if (!latestBase || base > latestBase) { latestBase = base; latestCols = cols; }
  }

  if (!latestBase) throw new Error(`NTNB ${NTNB_VENC} não encontrado no Tesouro Transparente`);

  return {
    puVenda: parseNum(latestCols[idx("PU Venda Manha")] ?? "0"),
    puCompra: parseNum(latestCols[idx("PU Compra Manha")] ?? "0"),
    dataBase: latestBase,
  };
}

async function main() {
  console.log("→ Buscando PU do Tesouro Transparente...");
  const { puVenda, puCompra, dataBase } = await fetchPU();

  const marketValue = puVenda * NTNB_QTY;
  const costBasis = NTNB_AVG_PRICE * NTNB_QTY;
  const pnl = marketValue - costBasis;
  const pnlPct = pnl / costBasis;

  console.log(`  Data Base: ${dataBase}`);
  console.log(`  PU Venda:  R$ ${puVenda.toFixed(4)}`);
  console.log(`  PU Compra: R$ ${puCompra.toFixed(4)}`);
  console.log(`  Qtd: ${NTNB_QTY} | Valor Mercado: R$ ${marketValue.toFixed(2)}`);
  console.log(`  Custo Médio/unit: R$ ${NTNB_AVG_PRICE.toFixed(4)} | Custo Total: R$ ${costBasis.toFixed(2)}`);
  console.log(`  P&L: R$ ${pnl.toFixed(2)} (${(pnlPct * 100).toFixed(2)}%)`);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Pega o user id do Tazima para imported_by
  const { data: userData } = await supabase.auth.admin?.listUsers?.() ?? { data: null };
  const importedBy =
    userData?.users?.find((u) => u.email === "rodrigo@tazima.com.br")?.id ?? null;

  // Remove suplementos anteriores de NTNB para esta dupla
  console.log("\n→ Removendo suplementos anteriores...");
  const { data: oldSupps } = await supabase
    .from("import_batches")
    .select("id")
    .eq("holder_id", HOLDER_ID)
    .eq("institution", INSTITUTION)
    .eq("source", "csv_supplement");

  if (oldSupps && oldSupps.length > 0) {
    const ids = oldSupps.map((b: { id: string }) => b.id);
    await supabase.from("positions").delete().in("batch_id", ids);
    await supabase.from("import_batches").delete().in("id", ids);
    console.log(`  Removidos ${ids.length} batch(es) antigos`);
  }

  // Cria batch suplemento
  console.log("→ Criando batch csv_supplement...");
  const today = new Date().toISOString().split("T")[0];
  const { data: batch, error: batchErr } = await supabase
    .from("import_batches")
    .insert({
      holder_id: HOLDER_ID,
      institution: INSTITUTION,
      status: "completed",
      source: "csv_supplement",
      filename: `ntnb-2060-btg-${today}`,
      imported_by: importedBy,
      completed_at: new Date().toISOString(),
      row_count: 1,
    })
    .select()
    .single();

  if (batchErr || !batch) {
    console.error("Erro ao criar batch:", batchErr?.message);
    // Tenta via SQL puro
    console.log("\nFalhou via JS — use o SQL abaixo no Supabase:");
    console.log(`
-- Batch
INSERT INTO import_batches (holder_id, institution, status, source, filename, completed_at, row_count)
VALUES (
  '${HOLDER_ID}', '${INSTITUTION}', 'completed', 'csv_supplement',
  'ntnb-2060-btg-${today}', NOW(), 1
) RETURNING id;

-- Posição (substituir <BATCH_ID> pelo id retornado acima)
INSERT INTO positions (batch_id, holder_id, institution, name, asset_class, currency,
  quantity, avg_price, current_price, market_value, cost_basis, pnl, pnl_pct,
  market_value_brl, maturity_date, indexer, indexer_rate, raw_data)
VALUES (
  '<BATCH_ID>', '${HOLDER_ID}', '${INSTITUTION}',
  'NTNB - Tesouro IPCA+ com Juros Semestrais', 'fixed_income', 'BRL',
  ${NTNB_QTY}, ${NTNB_AVG_PRICE.toFixed(4)}, ${puVenda.toFixed(4)},
  ${marketValue.toFixed(2)}, ${costBasis.toFixed(2)},
  ${pnl.toFixed(2)}, ${pnlPct.toFixed(6)},
  ${marketValue.toFixed(2)}, '${NTNB_VENC}', 'ipca', ${NTNB_INDEXER_RATE},
  '{"source": "xls_manual", "isin": "BRSTNCNTB690", "lots": 2, "qty_per_lot": 6}'
);
`);
    return;
  }

  console.log(`  Batch criado: ${batch.id}`);

  // Insere posição
  const { error: posErr } = await supabase.from("positions").insert({
    batch_id: batch.id,
    holder_id: HOLDER_ID,
    institution: INSTITUTION,
    ticker: null,
    name: "NTNB - Tesouro IPCA+ com Juros Semestrais",
    asset_class: "fixed_income",
    currency: "BRL",
    quantity: NTNB_QTY,
    avg_price: NTNB_AVG_PRICE,
    current_price: puVenda,
    market_value: marketValue,
    cost_basis: costBasis,
    pnl,
    pnl_pct: pnlPct,
    exchange_rate: null,
    market_value_brl: marketValue,
    maturity_date: NTNB_VENC,
    indexer: "ipca",
    indexer_rate: NTNB_INDEXER_RATE,
    liquidity_days: null,
    quota_value: null,
    quota_date: null,
    raw_data: { source: "xls_manual", isin: "BRSTNCNTB690", lots: 2, qty_per_lot: 6 },
  });

  if (posErr) {
    console.error("Erro ao inserir posição:", posErr.message);
    return;
  }

  console.log(`→ NTNB 2060 inserida com sucesso! Valor: R$ ${marketValue.toFixed(2)}`);
  console.log("  Acesse /dashboard para conferir.");
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
