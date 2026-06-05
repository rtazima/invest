/**
 * Recupera posições de Tesouro Direto que o conector BTG/Pluggy retorna com qty=0,
 * enriquece com PU do Tesouro Transparente e insere como batch suplemento no banco.
 *
 * Uso: pnpm tsx scripts/fix-tesouro-btg.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });


const BASE_PLUGGY = "https://api.pluggy.ai";
const TESOURO_CSV_URL =
  "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv";

const HOLDER_ID = "aedf440b-5263-4753-a42e-d965ce5027ab";
const INSTITUTION = "btg";

// ─── Pluggy ───────────────────────────────────────────────────────────────────

async function pluggyAuth(): Promise<string> {
  const res = await fetch(`${BASE_PLUGGY}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Pluggy auth: HTTP ${res.status}`);
  const { apiKey } = (await res.json()) as { apiKey: string };
  return apiKey;
}

async function fetchInvestments(itemId: string, apiKey: string) {
  const res = await fetch(`${BASE_PLUGGY}/investments?itemId=${itemId}`, {
    headers: { "X-API-KEY": apiKey },
  });
  if (!res.ok) throw new Error(`Pluggy investments: HTTP ${res.status}`);
  const { results } = (await res.json()) as { results: PluggyInvestment[] };
  return results;
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
  currencyCode: string;
}

// ─── Tesouro Transparente ─────────────────────────────────────────────────────

const ISIN_PREFIX_TO_TIPO: Record<string, string> = {
  BRSTNCNTB: "Tesouro IPCA+ com Juros Semestrais",
  BRSTNCTNT: "Tesouro IPCA+",
  BRSTNCFTN: "Tesouro Prefixado com Juros Semestrais",
  BRSTNCLFT: "Tesouro Selic",
  BRSTNCNTN: "Tesouro Prefixado",
};
const NAME_TO_TIPO: Record<string, string> = {
  NTNB: "Tesouro IPCA+ com Juros Semestrais",
  "NTN-B": "Tesouro IPCA+ com Juros Semestrais",
  NTNBP: "Tesouro IPCA+",
  "NTN-BP": "Tesouro IPCA+",
  NTNF: "Tesouro Prefixado com Juros Semestrais",
  "NTN-F": "Tesouro Prefixado com Juros Semestrais",
  LFT: "Tesouro Selic",
  LTN: "Tesouro Prefixado",
};

function detectBondType(code: string | null, name: string): string | null {
  if (code) {
    const prefix = code.slice(0, 9).toUpperCase();
    for (const [k, v] of Object.entries(ISIN_PREFIX_TO_TIPO)) {
      if (prefix.startsWith(k)) return v;
    }
  }
  const upper = name.toUpperCase();
  for (const [k, v] of Object.entries(NAME_TO_TIPO)) {
    if (upper.includes(k)) return v;
  }
  return null;
}

function parseDateBR(br: string): string {
  const [d, m, y] = br.split("/");
  return `${y}-${m?.padStart(2, "0")}-${d?.padStart(2, "0")}`;
}
function parseDecimalBR(s: string): number {
  return parseFloat(s.replace(/\./g, "").replace(",", "."));
}

async function fetchTesouroPrices(): Promise<Map<string, { puVenda: number; puCompra: number; dataBase: string }>> {
  const res = await fetch(TESOURO_CSV_URL);
  if (!res.ok) throw new Error(`Tesouro CSV: HTTP ${res.status}`);
  const buffer = await res.arrayBuffer();
  const text = new TextDecoder("latin1").decode(buffer);
  const lines = text.split("\n").map((l) => l.trimEnd());
  const header = lines[0]?.split(";") ?? [];

  const idx = (n: string) => header.indexOf(n);
  const iType = idx("Tipo Titulo");
  const iVenc = idx("Data Vencimento");
  const iBase = idx("Data Base");
  const iPuV = idx("PU Venda Manha");
  const iPuC = idx("PU Compra Manha");

  const latestDate = new Map<string, string>();
  const latestRow = new Map<string, string[]>();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = line.split(";");
    const tipo = cols[iType]?.trim() ?? "";
    if (!tipo) continue;
    const venc = parseDateBR(cols[iVenc]?.trim() ?? "");
    const base = parseDateBR(cols[iBase]?.trim() ?? "");
    const key = `${tipo}|${venc}`;
    const prev = latestDate.get(key);
    if (!prev || base > prev) { latestDate.set(key, base); latestRow.set(key, cols); }
  }

  const map = new Map<string, { puVenda: number; puCompra: number; dataBase: string }>();
  for (const [key, cols] of latestRow) {
    map.set(key, {
      puVenda: parseDecimalBR(cols[iPuV] ?? "0"),
      puCompra: parseDecimalBR(cols[iPuC] ?? "0"),
      dataBase: latestDate.get(key) ?? "",
    });
  }
  return map;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const itemId = process.env.PLUGGY_ITEM_ID_BTG;
  if (!itemId) throw new Error("PLUGGY_ITEM_ID_BTG não configurado");

  console.log("→ Auth Pluggy...");
  const apiKey = await pluggyAuth();

  console.log("→ Buscando investimentos BTG...");
  const investments = await fetchInvestments(itemId, apiKey);

  const treasuries = investments.filter(
    (inv) => inv.type === "FIXED_INCOME" && inv.subtype === "TREASURY" && (inv.quantity ?? 0) === 0,
  );
  console.log(`→ ${treasuries.length} posição(ões) Tesouro Direto com qty=0 encontrada(s)`);

  if (treasuries.length === 0) {
    console.log("Nenhuma posição para processar.");
    return;
  }

  console.log("→ Buscando preços Tesouro Transparente...");
  const prices = await fetchTesouroPrices();

  // Calcula o total atual do Pluggy (não-treasury) para encontrar o gap
  const pluggyTotal = investments
    .filter((inv) => !(inv.type === "FIXED_INCOME" && inv.subtype === "TREASURY"))
    .reduce((sum, inv) => sum + (inv.amount ?? 0), 0);

  // Valor real BTG informado pelo usuário
  const BTG_TOTAL = 1_200_286.18;
  const gap = BTG_TOTAL - pluggyTotal;
  console.log(`\n  Pluggy não-tesouro: R$ ${pluggyTotal.toFixed(2)}`);
  console.log(`  Total BTG real:     R$ ${BTG_TOTAL.toFixed(2)}`);
  console.log(`  Gap (Tesouro):      R$ ${gap.toFixed(2)}`);

  // Para cada posição tesouro, tenta encontrar PU e calcular quantidade
  const positions = [];
  let gapRestante = gap;

  for (const inv of treasuries) {
    const bondType = detectBondType(inv.code, inv.name);
    console.log(`\n  Título: ${inv.name}`);
    console.log(`  ISIN: ${inv.code ?? "N/A"} | Tipo detectado: ${bondType ?? "desconhecido"}`);

    let maturityDate: string | null = null;
    if (inv.date) {
      const d = new Date(inv.date);
      if (!isNaN(d.getTime())) maturityDate = d.toISOString().slice(0, 10);
    }
    console.log(`  Vencimento: ${maturityDate ?? "N/A"}`);

    let puVenda = 0;
    let puCompra = 0;
    let dataBase = "";
    if (bondType && maturityDate) {
      const pu = prices.get(`${bondType}|${maturityDate}`);
      if (pu) {
        puVenda = pu.puVenda;
        puCompra = pu.puCompra;
        dataBase = pu.dataBase;
        console.log(`  PU Venda: R$ ${puVenda.toFixed(2)} | PU Compra: R$ ${puCompra.toFixed(2)} | Base: ${dataBase}`);
      } else {
        console.log(`  ⚠ PU não encontrado no Tesouro Transparente`);
      }
    }

    // Quantidade = gap restante / PU venda (se único título, usa tudo; se múltiplos, distribui proporcionalmente)
    const marketValue = treasuries.length === 1 ? gapRestante : (puVenda > 0 ? gapRestante * (1 / treasuries.length) : 0);
    const quantity = puVenda > 0 ? marketValue / puVenda : 0;
    gapRestante -= marketValue;

    console.log(`  Qtd estimada: ${quantity.toFixed(4)} | Valor: R$ ${marketValue.toFixed(2)}`);

    positions.push({
      name: inv.name,
      code: inv.code,
      bondType,
      maturityDate,
      puVenda,
      puCompra,
      dataBase,
      marketValue,
      quantity,
      pluggyId: inv.id,
      annualRate: inv.annualRate,
    });
  }

  console.log("\n→ Inserindo no banco como csv_supplement...");

  // Usa anon key + bypass via Supabase MCP (precisamos do service_role para inserir sem auth)
  // Por ora, imprimimos o SQL para execução manual
  console.log("\n─── SQL para executar no Supabase ────────────────────────────────────");

  // Cria batch
  const batchDate = new Date().toISOString().split("T")[0];
  console.log(`
-- 1. Cria batch suplemento
INSERT INTO import_batches (holder_id, institution, status, source, filename, imported_by, completed_at, row_count)
SELECT
  '${HOLDER_ID}',
  '${INSTITUTION}',
  'completed',
  'csv_supplement',
  'tesouro-direto-btg-${batchDate}',
  id,
  NOW(),
  ${positions.length}
FROM auth.users LIMIT 1
RETURNING id;
`);

  for (const p of positions) {
    console.log(`-- Posição: ${p.name}`);
    console.log(`-- Vencimento: ${p.maturityDate} | PU Venda: ${p.puVenda} | Qtd: ${p.quantity.toFixed(4)} | Valor: R$ ${p.marketValue.toFixed(2)}`);
  }

  // Inserção requer service_role — use o MCP ou SQL direto no Supabase
  console.log("\n─── Dados calculados ────────────────────────────────────────────────");
  for (const p of positions) {
    console.log(JSON.stringify(p, null, 2));
  }
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
