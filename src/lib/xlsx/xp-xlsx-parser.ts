import * as XLSX from "xlsx";
import Decimal from "decimal.js";
import type { ParsedPosition, AssetClass, Indexer, DocumentOwner } from "@/lib/csv/types";

type Mode = "fixed_income" | "stocks" | "funds";

const SECTION_PATTERNS: Array<{ pattern: RegExp; mode: Mode }> = [
  { pattern: /^renda\s+fixa$/i, mode: "fixed_income" },
  { pattern: /^a[çc][õo]es$/i, mode: "stocks" },
  { pattern: /^fundos/i, mode: "funds" },
];

// Seções que indicam fim da carteira principal (dividendos, custódia, etc.)
const STOP_PATTERNS = [/dividendo/i, /provento/i, /cust[oó]dia/i];

const INDEXER_MAP: Record<string, Indexer> = {
  prefixado: "prefixado",
  inflação: "ipca",
  inflacao: "ipca",
  ipca: "ipca",
  cdi: "cdi",
  "pós-fixado": "cdi",
  "pos-fixado": "cdi",
  posixado: "cdi",
  selic: "selic",
  igpm: "igpm",
  "igp-m": "igpm",
};

function cell(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "number") return val.toString();
  return String(val).trim();
}

function parseBRL(val: unknown): Decimal | null {
  const s = cell(val)
    .replace(/R\$\s*/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^0-9.\-+]/g, "")
    .trim();
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
  // DD/MM/YYYY
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m && m[1] && m[2] && m[3]) {
    return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
  }
  // Excel serial date (number) — fallback
  if (typeof val === "number" && val > 1000) {
    try {
      const d = XLSX.SSF.parse_date_code(val);
      if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d));
    } catch {
      // ignore
    }
  }
  return null;
}

function detectIndexer(subSection: string): Indexer | null {
  const key = subSection.toLowerCase().trim();
  return INDEXER_MAP[key] ?? null;
}

function detectMode(rowFirst: string): Mode | null {
  const s = rowFirst.trim();
  for (const { pattern, mode } of SECTION_PATTERNS) {
    if (pattern.test(s)) return mode;
  }
  return null;
}

// Header row: "52,4% | Prefixado" ou "0,2% | Renda Variável Brasil"
function isSubsectionHeader(row: unknown[]): string | null {
  const s = cell(row[0]);
  const m = s.match(/^\d+[,.]?\d*\s*%\s*\|\s*(.+)$/);
  return m?.[1]?.trim() ?? null;
}

function isBlankRow(row: unknown[]): boolean {
  return row.every((c) => !cell(c));
}

function parseFixedIncomeRow(
  row: unknown[],
  indexer: Indexer | null,
): ParsedPosition | null {
  const name = cell(row[0]);
  if (!name) return null;

  const marketValue = parseBRL(row[1]);
  if (!marketValue || marketValue.lte(0)) return null;

  const taxaRaw = cell(row[5]);
  const taxaMatch = taxaRaw.match(/([-+]?\d+[,.]?\d*)%/);
  const taxaStr = taxaMatch?.[1];
  const indexerRate = taxaStr
    ? (() => {
        try {
          return new Decimal(taxaStr.replace(",", "."));
        } catch {
          return null;
        }
      })()
    : null;

  const maturityDate = parseDate(row[7]);
  const quantity = parseBRL(row[8]) ?? new Decimal(1);
  const unitPrice = parseBRL(row[9]);
  const costBasis = parseBRL(row[3]);

  return {
    ticker: null,
    name,
    assetClass: "fixed_income",
    currency: "BRL",
    quantity,
    avgPrice: unitPrice ?? costBasis,
    currentPrice: unitPrice,
    marketValue,
    maturityDate,
    indexer,
    indexerRate,
    liquidityDays: null,
    quotaValue: null,
    quotaDate: null,
    rawData: { section: "fixed_income", indexer: indexer ?? "" },
  };
}

function parseStocksRow(row: unknown[]): ParsedPosition | null {
  const name = cell(row[0]);
  if (!name) return null;

  const marketValue = parseBRL(row[1]);
  if (!marketValue || marketValue.lte(0)) return null;

  const ticker = /^[A-Z]{4}[0-9]{1,2}F?$/.test(name) ? name : null;
  const avgPrice = parseBRL(row[4]);
  const currentPrice = parseBRL(row[5]);
  const quantity = parseBRL(row[6]) ?? new Decimal(1);

  return {
    ticker,
    name,
    assetClass: "stocks_br",
    currency: "BRL",
    quantity,
    avgPrice,
    currentPrice,
    marketValue,
    maturityDate: null,
    indexer: null,
    indexerRate: null,
    liquidityDays: null,
    quotaValue: null,
    quotaDate: null,
    rawData: { section: "stocks_br" },
  };
}

function parseFundsRow(
  row: unknown[],
  indexer: Indexer | null,
): ParsedPosition | null {
  const name = cell(row[0]);
  if (!name) return null;

  const marketValue = parseBRL(row[1]);
  if (!marketValue || marketValue.lte(0)) return null;

  // Extrai ticker do início do nome (ex: "AZQI11 - AZ Quest...")
  const tickerMatch = name.match(/^([A-Z]{4}[0-9]{1,2})\b/);
  const ticker = tickerMatch?.[1] ?? null;

  // FIIs: tickers terminados em 11 (inclui FIPs e FIFs negociados em bolsa)
  const assetClass: AssetClass =
    ticker && /11$/.test(ticker) ? "fiis" : "funds";

  const costBasis = parseBRL(row[5]);

  return {
    ticker,
    name,
    assetClass,
    currency: "BRL",
    quantity: new Decimal(1),
    avgPrice: costBasis,
    currentPrice: null,
    marketValue,
    maturityDate: null,
    indexer,
    indexerRate: null,
    liquidityDays: null,
    quotaValue: null,
    quotaDate: null,
    rawData: { section: assetClass, indexer: indexer ?? "" },
  };
}

// Linha 2, col 0: "Rodrigo Fernando, este é o seu patrimônio"
export function extractXPXlsxOwner(buffer: ArrayBuffer): DocumentOwner {
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { name: null, cpf: null };
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return { name: null, cpf: null };

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  // Nome está na linha de índice 2 (terceira linha), coluna 0
  const nameCell = cell(rows[2]?.[0]);
  // Formato: "Rodrigo Fernando, este é o seu patrimônio"
  const nameMatch = nameCell.match(/^(.+?),\s*este é/i);
  const name = nameMatch?.[1]?.trim() ?? null;

  // CPF não aparece no XLSX da XP — campo reservado para extensão futura
  return { name, cpf: null };
}

export function parseXPXlsx(buffer: ArrayBuffer): ParsedPosition[] {
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  const positions: ParsedPosition[] = [];
  let currentMode: Mode | null = null;
  let currentIndexer: Indexer | null = null;
  let inData = false;

  for (const row of rows) {
    if (isBlankRow(row)) {
      inData = false;
      continue;
    }

    const firstCell = cell(row[0]);

    // Para ao encontrar seções secundárias (dividendos, custódia, etc.)
    if (STOP_PATTERNS.some((p) => p.test(firstCell))) break;

    // Detecta seção principal
    const mode = detectMode(firstCell);
    if (mode) {
      currentMode = mode;
      currentIndexer = null;
      inData = false;
      continue;
    }

    // Detecta cabeçalho de sub-seção (linha que começa com %)
    const subSection = isSubsectionHeader(row);
    if (subSection !== null) {
      currentIndexer = detectIndexer(subSection);
      inData = true;
      continue;
    }

    // Linha de dado
    if (!inData || !currentMode) continue;

    try {
      let pos: ParsedPosition | null = null;

      if (currentMode === "fixed_income") {
        pos = parseFixedIncomeRow(row, currentIndexer);
      } else if (currentMode === "stocks") {
        pos = parseStocksRow(row);
      } else if (currentMode === "funds") {
        pos = parseFundsRow(row, currentIndexer);
      }

      if (pos) positions.push(pos);
    } catch {
      // linha inválida — continua
    }
  }

  return positions;
}
