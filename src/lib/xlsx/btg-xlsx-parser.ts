import * as XLSX from "xlsx";
import Decimal from "decimal.js";
import type { ParsedPosition, AssetClass, Indexer, DocumentOwner } from "@/lib/csv/types";

// BTG usa formato americano para valores (vírgula = milhar, ponto = decimal)
function cell(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "number") return String(val);
  return String(val).trim();
}

function parseNum(val: unknown): Decimal | null {
  const s = cell(val).replace(/,/g, "").replace(/[^0-9.\-]/g, "").trim();
  if (!s || s === "-") return null;
  try {
    const d = new Decimal(s);
    return d.isNaN() ? null : d;
  } catch {
    return null;
  }
}

function parseDate(val: unknown): Date | null {
  const s = cell(val);
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m && m[1] && m[2] && m[3]) {
    return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
  }
  return null;
}

function isDateStr(s: string): boolean {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(s);
}

function stripCnpj(name: string): string {
  return name.replace(/\s*-\s*Classe CNPJ:.*/i, "").trim();
}

function isFii(name: string): boolean {
  return /\bFII\b/i.test(name);
}

// Extrai indexador e taxa da string BTG (ex: "IPCA + 6,74%", "14,70% a.a.")
function parseRate(rate: string): { indexer: Indexer | null; indexerRate: Decimal | null } {
  const s = rate.toLowerCase();
  let indexer: Indexer | null = null;

  if (s.includes("ipca")) indexer = "ipca";
  else if (s.includes("igp") || s.includes("igpm")) indexer = "igpm";
  else if (s.includes("cdi")) indexer = "cdi";
  else if (s.includes("selic")) indexer = "selic";
  else if (/\d/.test(s)) indexer = "prefixado";

  const m = s.match(/([\d]+[,.]?\d*)\s*%/);
  let indexerRate: Decimal | null = null;
  if (m?.[1]) {
    try {
      indexerRate = new Decimal(m[1].replace(",", "."));
    } catch {
      // ignore
    }
  }

  return { indexer, indexerRate };
}

// ─── Owner ────────────────────────────────────────────────────────────────────

export function extractBTGXlsxOwner(buffer: ArrayBuffer): DocumentOwner {
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const sheet = wb.Sheets["Capa"];
  if (!sheet) return { name: null, cpf: null };

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  const names: string[] = [];
  let cpf: string | null = null;

  for (const row of rows) {
    // Capa do BTG extrato: colunas A e B vazias, dados em coluna C (index 2)
    const c0 = cell(row[2]);
    if (!c0) continue;

    const cpfMatch = c0.match(/^CPF:\s*([\d.\-]+)/);
    if (cpfMatch?.[1]) {
      cpf = cpfMatch[1].trim();
      continue;
    }

    if (/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]+$/.test(c0) && c0.trim().split(/\s+/).length >= 2) {
      names.push(c0.trim());
    }
  }

  // Retorna apenas o primeiro nome encontrado (evita juntar cônjuge)
  return { name: names[0] ?? null, cpf };
}

// Retorna 0 para fundos com nome sugestivo de liquidez diária, null caso contrário
function inferFundLiquidityDays(name: string): number | null {
  if (/liquidez/i.test(name)) return 0;
  if (/referenciado\s+di/i.test(name)) return 0;
  if (/firf\s*ref/i.test(name)) return 0;
  if (/\bcash\b/i.test(name)) return 0;
  return null;
}

// ─── Fundos ───────────────────────────────────────────────────────────────────

function parseFundos(sheet: XLSX.WorkSheet): ParsedPosition[] {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  const positions: ParsedPosition[] = [];
  let currentName: string | null = null;
  let inPositions = false;

  for (const row of rows) {
    // BTG extrato: coluna A sempre vazia, dados em coluna B (index 1)
    const c0 = cell(row[1]);

    if (/^Total em fundos/i.test(c0)) break;
    if (/^(Detalhamento|Movimentaç|Rentabilidade)/i.test(c0)) break;

    if (/^Posiç[aã]o\s*>/i.test(c0)) { inPositions = true; continue; }
    if (!inPositions) continue;
    if (!c0) continue;

    if (isDateStr(c0)) {
      // Linha de dados do fundo
      if (!currentName) continue;
      const qty = parseNum(row[3]);
      const quotaValue = parseNum(row[4]);
      const marketValue = parseNum(row[5]);
      if (!marketValue || marketValue.lte(0)) continue;

      const quotaDate = parseDate(c0);
      const assetClass: AssetClass = isFii(currentName) ? "fiis" : "funds";
      const liquidityDays = inferFundLiquidityDays(currentName);

      positions.push({
        ticker: null,
        name: currentName,
        assetClass,
        currency: "BRL",
        quantity: qty ?? new Decimal(1),
        avgPrice: null,
        currentPrice: quotaValue,
        marketValue,
        maturityDate: null,
        indexer: null,
        indexerRate: null,
        liquidityDays,
        quotaValue,
        quotaDate,
        rawData: { section: assetClass },
      });
    } else if (c0 && !c0.startsWith("Data Referência")) {
      // Linha de nome do fundo
      currentName = stripCnpj(c0);
    }
  }

  return positions;
}

// ─── Renda Fixa ───────────────────────────────────────────────────────────────

function parseRendaFixa(sheet: XLSX.WorkSheet): ParsedPosition[] {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  const positions: ParsedPosition[] = [];
  let currentType: string | null = null;

  for (const row of rows) {
    // BTG extrato: coluna A sempre vazia, dados em coluna B (index 1)
    const c0 = cell(row[1]);

    if (/^Posiç[oõ]es Detalhadas/i.test(c0)) break;
    if (/^Movimentaç/i.test(c0)) break;
    if (/^Posiç[aã]o Consolidada/i.test(c0)) break;

    const sectionMatch = c0.match(/^Posiç[aã]o\s*>\s*(.+)/i);
    if (sectionMatch?.[1]) {
      currentType = sectionMatch[1].trim().toUpperCase();
      continue;
    }

    if (!currentType) continue;
    if (!c0 || c0 === "Emissor" || c0 === "Total") continue;

    // [1]=Emissor, [2]=Ativo, [4]=Vencimento, [5]=Liquidez(Sim/Não), [6]=DiasCarência, [8]=Taxa, [9]=Qtde, [10]=Preço, [11]=Saldo Bruto
    const emissor = c0;
    if (!emissor) continue;

    const maturityDate = parseDate(row[4]);
    const liquidezStr = cell(row[5]).toLowerCase();
    const carenciaStr = cell(row[6]);
    const liquidityDays =
      liquidezStr === "sim" ? (parseInt(carenciaStr) || 0) : null;
    const taxa = cell(row[8]);
    const qty = parseNum(row[9]);
    const unitPrice = parseNum(row[10]);
    const marketValue = parseNum(row[11]);
    if (!marketValue || marketValue.lte(0)) continue;

    const { indexer, indexerRate } = parseRate(taxa);
    const vencStr = cell(row[4]);
    const name = vencStr ? `${emissor} — ${vencStr}` : emissor;

    positions.push({
      ticker: null,
      name,
      assetClass: "fixed_income",
      currency: "BRL",
      quantity: qty ?? new Decimal(1),
      avgPrice: unitPrice,
      currentPrice: unitPrice,
      marketValue,
      maturityDate,
      indexer,
      indexerRate,
      liquidityDays,
      quotaValue: null,
      quotaDate: null,
      rawData: { section: "fixed_income", type: currentType },
    });
  }

  return positions;
}

// ─── Renda Variável ───────────────────────────────────────────────────────────

function parseRendaVariavel(sheet: XLSX.WorkSheet): ParsedPosition[] {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  const positions: ParsedPosition[] = [];
  let inStocks = false;

  for (const row of rows) {
    // BTG extrato: coluna A sempre vazia, dados em coluna B (index 1)
    const c0 = cell(row[1]);

    if (/^Movimentaç/i.test(c0)) break;

    if (/^Posiç[aã]o\s*>\s*Aç[oõ]es/i.test(c0)) { inStocks = true; continue; }
    if (!inStocks) continue;
    if (c0 === "Código" || /^Total/i.test(c0) || !c0) continue;

    const ticker = c0;
    const name = cell(row[2]).replace(/\s+/g, " ").trim() || ticker;
    const qty = parseNum(row[3]);
    const currentPrice = parseNum(row[4]);
    const avgPriceRaw = parseNum(row[5]);
    const marketValue = parseNum(row[6]);

    if (!marketValue || marketValue.lte(0)) continue;

    // Todos os itens em "Posição > Ações" são ações (BPAC11 é banco, não FII)
    const assetClass: AssetClass = "stocks_br";

    positions.push({
      ticker,
      name,
      assetClass,
      currency: "BRL",
      quantity: qty ?? new Decimal(1),
      avgPrice: avgPriceRaw,
      currentPrice,
      marketValue,
      maturityDate: null,
      indexer: null,
      indexerRate: null,
      liquidityDays: null,
      quotaValue: null,
      quotaDate: null,
      rawData: { section: assetClass },
    });
  }

  return positions;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function parseBTGXlsx(buffer: ArrayBuffer): ParsedPosition[] {
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });

  const positions: ParsedPosition[] = [];

  const fundosSheet = wb.Sheets["Fundos"];
  if (fundosSheet) positions.push(...parseFundos(fundosSheet));

  const rfSheet = wb.Sheets["Renda Fixa"];
  if (rfSheet) positions.push(...parseRendaFixa(rfSheet));

  const rvSheet = wb.Sheets["Renda Variavel"];
  if (rvSheet) positions.push(...parseRendaVariavel(rvSheet));

  return positions;
}
