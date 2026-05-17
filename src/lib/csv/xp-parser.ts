import Decimal from "decimal.js";
import type { ParsedPosition, AssetClass, Indexer } from "./types";
import { parseDecimalBR, parseDateBR, parsePct } from "./validators";

const ASSET_CLASS_MAP: Record<string, AssetClass> = {
  "ação": "stocks_br",
  "ações": "stocks_br",
  "acao": "stocks_br",
  "acoes": "stocks_br",
  "fii": "fiis",
  "fundo imobiliário": "fiis",
  "fundo imobiliario": "fiis",
  "renda fixa": "fixed_income",
  "cdb": "fixed_income",
  "lca": "fixed_income",
  "lci": "fixed_income",
  "cra": "fixed_income",
  "cri": "fixed_income",
  "debenture": "fixed_income",
  "debênture": "fixed_income",
  "tesouro direto": "fixed_income",
  "fundo": "funds",
  "fundo de investimento": "funds",
  "etf": "etf_br",
  "bdr": "stocks_intl",
};

const INDEXER_MAP: Record<string, Indexer> = {
  "cdi": "cdi",
  "ipca": "ipca",
  "igpm": "igpm",
  "igp-m": "igpm",
  "selic": "selic",
  "prefixado": "prefixado",
  "pré": "prefixado",
  "pre": "prefixado",
  "usd": "usd",
  "dolar": "usd",
  "dólar": "usd",
};

function detectAssetClass(tipo: string): AssetClass {
  const normalized = tipo.toLowerCase().trim();
  return ASSET_CLASS_MAP[normalized] ?? "fixed_income";
}

function detectIndexer(indexerStr: string): Indexer | null {
  const normalized = indexerStr.toLowerCase().trim();
  for (const [key, val] of Object.entries(INDEXER_MAP)) {
    if (normalized.includes(key)) return val;
  }
  return null;
}

function detectLiquidityDays(liquidityStr: string): number | null {
  const s = liquidityStr.toLowerCase().trim();
  if (s === "d+0" || s === "diário" || s === "diario") return 0;
  const m = s.match(/d\+(\d+)/);
  return m?.[1] ? parseInt(m[1]) : null;
}

function splitCsvLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === sep && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ""));
  return result;
}

export function parseXP(csvText: string): ParsedPosition[] {
  const lines = csvText.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2 || !lines[0]) return [];

  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = splitCsvLine(lines[0], sep).map((h) =>
    h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim(),
  );

  const col = (name: string) => {
    const idx = headers.findIndex((h) => h.includes(name));
    return (row: string[]) => row[idx] ?? "";
  };

  const getAtivo = col("ativo");
  const getTipo = col("tipo");
  const getQtd = col("quantidade") ?? col("qtd");
  const getPm = col("preco medio") ?? col("pm") ?? col("preco de custo");
  const getAtual = col("preco atual") ?? col("preco de mercado");
  const getValor = col("valor financeiro") ?? col("valor de mercado") ?? col("valor");
  const getVenc = col("vencimento");
  const getIndex = col("indexador");
  const getTaxa = col("taxa") ?? col("indexador rate");
  const getLiq = col("liquidez");

  const positions: ParsedPosition[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const row = splitCsvLine(line, sep);
    if (row.every((c) => !c)) continue;

    const rawAtivo = getAtivo(row);
    const rawTipo = getTipo(row);
    const rawQtd = getQtd(row);
    const rawValor = getValor(row);

    if (!rawAtivo || !rawValor) continue;

    try {
      const ticker = /^[A-Z]{4}[0-9]{1,2}F?$/.test(rawAtivo.trim()) ? rawAtivo.trim() : null;
      const marketValue = parseDecimalBR(rawValor);
      const quantity = rawQtd ? parseDecimalBR(rawQtd) : new Decimal(1);
      const avgPrice = getPm(row) ? parseDecimalBR(getPm(row)) : null;
      const currentPrice = getAtual(row) ? parseDecimalBR(getAtual(row)) : null;
      const maturityDate = getVenc(row) ? parseDateBR(getVenc(row)) : null;
      const indexer = getIndex(row) ? detectIndexer(getIndex(row)) : null;
      const indexerRate = getTaxa(row) ? parsePct(getTaxa(row)) : null;
      const liquidityDays = getLiq(row) ? detectLiquidityDays(getLiq(row)) : null;
      const assetClass = detectAssetClass(rawTipo);

      positions.push({
        ticker,
        name: rawAtivo.trim(),
        assetClass,
        currency: "BRL",
        quantity,
        avgPrice,
        currentPrice,
        marketValue,
        maturityDate,
        indexer,
        indexerRate,
        liquidityDays,
        quotaValue: null,
        quotaDate: null,
        rawData: Object.fromEntries(headers.map((h, idx) => [h, row[idx] ?? ""])),
      });
    } catch {
      // linha inválida — continua processando as demais
    }
  }

  return positions;
}
