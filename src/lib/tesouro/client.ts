import type { TesouroBondType, TesouroPriceMap, TesouroPU } from "./types";

const CSV_URL =
  "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv";

function parseDateBR(br: string): string {
  const [d, m, y] = br.split("/");
  return `${y}-${m?.padStart(2, "0")}-${d?.padStart(2, "0")}`;
}

function parseDecimalBR(s: string): number {
  return parseFloat(s.replace(/\./g, "").replace(",", "."));
}

export async function fetchTesouroPrices(): Promise<TesouroPriceMap> {
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`Tesouro Transparente: HTTP ${res.status}`);

  const buffer = await res.arrayBuffer();
  const text = new TextDecoder("latin1").decode(buffer);
  const lines = text.split("\n").map((l) => l.trimEnd());
  const header = lines[0]?.split(";") ?? [];

  const idx = (name: string) => header.indexOf(name);
  const iType = idx("Tipo Titulo");
  const iVenc = idx("Data Vencimento");
  const iBase = idx("Data Base");
  const iTaxaC = idx("Taxa Compra Manha");
  const iTaxaV = idx("Taxa Venda Manha");
  const iPuC = idx("PU Compra Manha");
  const iPuV = idx("PU Venda Manha");
  const iPuB = idx("PU Base Manha");

  // For each bond (tipo + vencimento), keep only the most recent dataBase row.
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
    if (!prev || base > prev) {
      latestDate.set(key, base);
      latestRow.set(key, cols);
    }
  }

  const map: TesouroPriceMap = new Map();
  for (const [key, cols] of latestRow) {
    const tipo = cols[iType]?.trim() as TesouroBondType;
    const venc = parseDateBR(cols[iVenc]?.trim() ?? "");
    map.set(key, {
      tipo,
      vencimento: venc,
      dataBase: latestDate.get(key) ?? "",
      puCompra: parseDecimalBR(cols[iPuC] ?? "0"),
      puVenda: parseDecimalBR(cols[iPuV] ?? "0"),
      puBase: parseDecimalBR(cols[iPuB] ?? "0"),
      taxaCompra: parseDecimalBR(cols[iTaxaC] ?? "0"),
      taxaVenda: parseDecimalBR(cols[iTaxaV] ?? "0"),
    });
  }

  return map;
}

// Maps Pluggy ISIN prefixes to Tesouro bond types.
const ISIN_PREFIX_TO_TIPO: Record<string, TesouroBondType> = {
  BRSTNCNTB: "Tesouro IPCA+ com Juros Semestrais",
  BRSTNCTNT: "Tesouro IPCA+",
  BRSTNCFTN: "Tesouro Prefixado com Juros Semestrais",
  BRSTNCLFT: "Tesouro Selic",
  BRSTNCNTN: "Tesouro Prefixado",
};

// Maps colloquial names used by BTG/Pluggy to Tesouro bond types.
const NAME_TO_TIPO: Record<string, TesouroBondType> = {
  "NTNB":   "Tesouro IPCA+ com Juros Semestrais",
  "NTN-B":  "Tesouro IPCA+ com Juros Semestrais",
  "NTNBP":  "Tesouro IPCA+",
  "NTN-BP": "Tesouro IPCA+",
  "NTNF":   "Tesouro Prefixado com Juros Semestrais",
  "NTN-F":  "Tesouro Prefixado com Juros Semestrais",
  "LFT":    "Tesouro Selic",
  "LTN":    "Tesouro Prefixado",
};

export function detectTesouroBondType(
  code: string | null,
  name: string,
): TesouroBondType | null {
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

export function lookupPU(
  prices: TesouroPriceMap,
  tipo: TesouroBondType,
  maturityDate: Date,
): TesouroPU | null {
  const venc = maturityDate.toISOString().slice(0, 10);
  return prices.get(`${tipo}|${venc}`) ?? null;
}
