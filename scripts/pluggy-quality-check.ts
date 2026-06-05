/**
 * Pluggy data quality check — BTG
 *
 * Variáveis necessárias no .env.local:
 *   PLUGGY_CLIENT_ID=...
 *   PLUGGY_CLIENT_SECRET=...
 *   PLUGGY_ITEM_ID_BTG=...  (opcional — listamos os items se não informado)
 *
 * Uso:
 *   pnpm tsx scripts/pluggy-quality-check.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const BASE = "https://api.pluggy.ai";

// ─── tipos ────────────────────────────────────────────────────────────────────

interface PluggyApiKey { apiKey: string }

interface PluggyItem {
  id: string;
  connector: { id: number; name: string; institutionUrl: string };
  status: string;
  statusDetail: string | null;
  lastUpdatedAt: string | null;
  error: unknown;
}

interface PluggyAccount {
  id: string;
  name: string;
  number: string;
  type: string;
  subtype: string;
  balance: number;
  currencyCode: string;
}

interface PluggyInvestment {
  id: string;
  name: string;
  code: string | null;             // ticker
  type: string;
  subtype: string | null;
  quantity: number | null;
  amount: number | null;           // valor de mercado atual
  amountOriginal: number | null;   // custo
  taxes: number | null;
  taxes2: number | null;
  value: number | null;            // preço unitário
  annualRate: number | null;       // taxa anual (renda fixa)
  cdRate: number | null;
  issuer: string | null;           // emissor (CDB, LCI, etc.)
  date: string | null;             // vencimento
  lastUpdatedAt: string | null;
  currencyCode: string;
}

interface PluggyInvestmentList {
  total: number;
  results: PluggyInvestment[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

async function pluggyFetch<T>(apiKey: string, path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Pluggy ${path} → ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

function pct(n: number, total: number) {
  if (total === 0) return "—";
  return `${Math.round((n / total) * 100)}%`;
}

function fmt(v: number | null, currency = "BRL") {
  if (v == null) return "null";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(v);
}

function fmtDate(d: string | null) {
  if (!d) return "null";
  return new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const clientId     = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
  const itemIdBtg    = process.env.PLUGGY_ITEM_ID_BTG;

  if (!clientId || !clientSecret) {
    console.error("\n❌  Defina PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no .env.local\n");
    process.exit(1);
  }

  // 1. autenticação
  console.log("\n🔑  Autenticando na Pluggy...");
  const authRes = await fetch(`${BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!authRes.ok) {
    console.error("❌  Falha na autenticação:", await authRes.text());
    process.exit(1);
  }
  const { apiKey } = await authRes.json() as PluggyApiKey;
  console.log("✅  Autenticado\n");

  // 2. localizar item BTG
  if (!itemIdBtg) {
    console.log("⚠️  PLUGGY_ITEM_ID_BTG não definido no .env.local.");
    console.log("   Rode primeiro: pnpm tsx scripts/pluggy-connect-local.ts");
    console.log("   O script abre o Pluggy Connect no browser e captura o Item ID.\n");
    process.exit(0);
  }

  const item = await pluggyFetch<PluggyItem>(apiKey, `/items/${itemIdBtg}`);

  console.log(`\n📡  Item: ${item.connector.name}`);
  console.log(`   Status:        ${item.status}`);
  console.log(`   Última sync:   ${fmtDate(item.lastUpdatedAt)}`);
  if (item.error) console.log(`   Erro:          ${JSON.stringify(item.error)}`);
  if (item.status !== "UPDATED") {
    console.log("\n⚠️  Item não está UPDATED — dados podem estar incompletos ou desatualizados.");
  }

  // 3. contas
  console.log("\n── Contas ───────────────────────────────────────────────────────");
  const accounts = await pluggyFetch<{ results: PluggyAccount[] }>(
    apiKey,
    `/accounts?itemId=${item.id}`,
  );
  for (const acc of accounts.results) {
    console.log(`   [${acc.id}] ${acc.name} (${acc.type}/${acc.subtype}) — ${fmt(acc.balance, acc.currencyCode)}`);
  }

  // 4. investimentos por conta
  const investmentAccount = accounts.results.find(
    (a) => a.type === "BANK" || a.subtype === "INVESTMENT" || a.name.toLowerCase().includes("invest"),
  ) ?? accounts.results[0];

  if (!investmentAccount) {
    console.log("\n⚠️  Nenhuma conta encontrada.\n");
    process.exit(0);
  }

  const allInvestments: PluggyInvestment[] = [];
  const inv = await pluggyFetch<PluggyInvestmentList>(
    apiKey,
    `/investments?itemId=${item.id}`,
  );
  allInvestments.push(...inv.results);

  if (allInvestments.length === 0) {
    console.log("\n⚠️  Nenhum investimento retornado. Verifique se a conta BTG tem posições.");
    process.exit(0);
  }

  // ─── relatório de qualidade ────────────────────────────────────────────────

  console.log(`\n\n${"═".repeat(60)}`);
  console.log("  RELATÓRIO DE QUALIDADE — PLUGGY × BTG");
  console.log(`${"═".repeat(60)}`);
  console.log(`\n  Total de posições: ${allInvestments.length}`);

  const totalMercado = allInvestments.reduce((s, i) => s + (i.amount ?? 0), 0);
  const totalCusto   = allInvestments.reduce((s, i) => s + (i.amountOriginal ?? 0), 0);
  console.log(`  Valor de mercado:  ${fmt(totalMercado)}`);
  console.log(`  Custo total:       ${fmt(totalCusto)}`);

  // completude por campo
  const fields: (keyof PluggyInvestment)[] = [
    "code", "type", "subtype", "quantity", "amount", "amountOriginal",
    "value", "annualRate", "cdRate", "issuer", "date", "lastUpdatedAt",
  ];
  const n = allInvestments.length;

  console.log("\n── Completude dos campos ────────────────────────────────────────");
  for (const field of fields) {
    const filled = allInvestments.filter((i) => i[field] != null && i[field] !== "").length;
    const bar = "█".repeat(Math.round((filled / n) * 20)).padEnd(20, "░");
    console.log(`   ${field.padEnd(16)} ${bar} ${pct(filled, n).padStart(4)}  (${filled}/${n})`);
  }

  // breakdown por tipo
  const byType = new Map<string, { count: number; total: number }>();
  for (const inv of allInvestments) {
    const key = `${inv.type}${inv.subtype ? `/${inv.subtype}` : ""}`;
    const cur = byType.get(key) ?? { count: 0, total: 0 };
    byType.set(key, { count: cur.count + 1, total: cur.total + (inv.amount ?? 0) });
  }

  console.log("\n── Por tipo de ativo ────────────────────────────────────────────");
  for (const [type, { count, total }] of [...byType.entries()].sort((a, b) => b[1].total - a[1].total)) {
    console.log(`   ${type.padEnd(30)} ${String(count).padStart(3)} posições   ${fmt(total)}`);
  }

  // anomalias
  const semTicker    = allInvestments.filter((i) => !i.code);
  const semQuantidade = allInvestments.filter((i) => i.quantity == null);
  const semValor     = allInvestments.filter((i) => i.amount == null);
  const valorZero    = allInvestments.filter((i) => i.amount === 0);
  const semCusto     = allInvestments.filter((i) => i.amountOriginal == null);

  console.log("\n── Anomalias ────────────────────────────────────────────────────");
  const printAnomaly = (label: string, list: PluggyInvestment[]) => {
    if (list.length === 0) {
      console.log(`   ✅  ${label}: nenhuma`);
    } else {
      console.log(`   ⚠️  ${label}: ${list.length}`);
      for (const i of list.slice(0, 5)) {
        console.log(`       - ${i.name} (${i.type})`);
      }
      if (list.length > 5) console.log(`       ... e mais ${list.length - 5}`);
    }
  };
  printAnomaly("Sem ticker/code", semTicker);
  printAnomaly("Sem quantidade", semQuantidade);
  printAnomaly("Sem valor de mercado", semValor);
  printAnomaly("Valor de mercado = 0", valorZero);
  printAnomaly("Sem custo (amountOriginal)", semCusto);

  // amostra de posições
  console.log("\n── Amostra (primeiras 10 posições) ─────────────────────────────");
  for (const inv of allInvestments.slice(0, 10)) {
    console.log(`\n  ${inv.name}`);
    console.log(`    code/ticker:    ${inv.code ?? "null"}`);
    console.log(`    type/subtype:   ${inv.type} / ${inv.subtype ?? "null"}`);
    console.log(`    quantidade:     ${inv.quantity ?? "null"}`);
    console.log(`    preço unit.:    ${fmt(inv.value)}`);
    console.log(`    mercado:        ${fmt(inv.amount)}`);
    console.log(`    custo:          ${fmt(inv.amountOriginal)}`);
    if (inv.annualRate != null) console.log(`    taxa anual:     ${(inv.annualRate * 100).toFixed(2)}%`);
    if (inv.cdRate != null)     console.log(`    % CDI:          ${(inv.cdRate * 100).toFixed(2)}%`);
    if (inv.issuer)             console.log(`    emissor:        ${inv.issuer}`);
    if (inv.date)               console.log(`    vencimento:     ${inv.date.slice(0, 10)}`);
    console.log(`    última atualiz: ${fmtDate(inv.lastUpdatedAt)}`);
  }

  if (allInvestments.length > 10) {
    console.log(`\n  ... e mais ${allInvestments.length - 10} posições não exibidas`);
  }

  console.log(`\n${"═".repeat(60)}\n`);
}

main().catch((err) => {
  console.error("\n❌ ", err instanceof Error ? err.message : err);
  process.exit(1);
});
