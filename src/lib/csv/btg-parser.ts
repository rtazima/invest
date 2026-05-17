import Decimal from "decimal.js";
import type { ParsedPosition, AssetClass } from "./types";
import { parseDecimalBR, parseDateBR, parsePct } from "./validators";

const ASSET_CLASS_MAP: Record<string, AssetClass> = {
  "acao": "stocks_br",
  "acoes": "stocks_br",
  "fii": "fiis",
  "cdb": "fixed_income",
  "lca": "fixed_income",
  "lci": "fixed_income",
  "tesouro": "fixed_income",
  "fundo": "funds",
  "etf": "etf_br",
  "bdr": "stocks_intl",
};

function detectAssetClass(tipo: string): AssetClass {
  const normalized = tipo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
  for (const [key, val] of Object.entries(ASSET_CLASS_MAP)) {
    if (normalized.includes(key)) return val;
  }
  return "fixed_income";
}

function splitLine(line: string): string[] {
  const sep = line.includes(";") ? ";" : ",";
  return line.split(sep).map((v) => v.trim().replace(/^"|"$/g, ""));
}

export function parseBTG(csvText: string): ParsedPosition[] {
  const lines = csvText.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2 || !lines[0]) return [];

  const headers = splitLine(lines[0]).map((h) =>
    h
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim(),
  );

  const col = (name: string) => {
    const idx = headers.findIndex((h) => h.includes(name));
    return (row: string[]) => (idx >= 0 ? row[idx] : "") ?? "";
  };

  const getAtivo = col("ativo");
  const getTipo = col("tipo");
  const getQtd = col("quantidade") ?? col("qtd");
  const getPm = col("preco medio") ?? col("custo medio");
  const getAtual = col("preco de mercado") ?? col("preco atual");
  const getValor = col("valor mercado") ?? col("valor financeiro") ?? col("valor");
  const getVenc = col("vencimento");
  const getPl = col("resultado");
  const getPlPct = col("resultado %") ?? col("resultado pct");

  const positions: ParsedPosition[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const row = splitLine(line);
    if (row.every((c) => !c)) continue;

    const rawAtivo = getAtivo(row);
    const rawValor = getValor(row);

    if (!rawAtivo || !rawValor) continue;

    try {
      const ticker = /^[A-Z]{4}[0-9]{1,2}F?$/.test(rawAtivo.trim()) ? rawAtivo.trim() : null;
      const marketValue = parseDecimalBR(rawValor);
      const quantity = getQtd(row) ? parseDecimalBR(getQtd(row)) : new Decimal(1);
      const avgPrice = getPm(row) ? parseDecimalBR(getPm(row)) : null;
      const currentPrice = getAtual(row) ? parseDecimalBR(getAtual(row)) : null;
      const maturityDate = getVenc(row) ? parseDateBR(getVenc(row)) : null;

      let pnl: Decimal | null = null;
      let pnlPct: Decimal | null = null;
      if (getPl(row)) {
        try { pnl = parseDecimalBR(getPl(row)); } catch { /* skip */ }
      }
      if (getPlPct(row)) {
        pnlPct = parsePct(getPlPct(row));
      }

      void pnl;
      void pnlPct;

      positions.push({
        ticker,
        name: rawAtivo.trim(),
        assetClass: detectAssetClass(getTipo(row)),
        currency: "BRL",
        quantity,
        avgPrice,
        currentPrice,
        marketValue,
        maturityDate,
        indexer: null,
        indexerRate: null,
        liquidityDays: null,
        quotaValue: null,
        quotaDate: null,
        rawData: Object.fromEntries(headers.map((h, idx) => [h, row[idx] ?? ""])),
      });
    } catch {
      // linha inválida — continua
    }
  }

  return positions;
}
