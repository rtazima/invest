import Decimal from "decimal.js";
import type { ParsedPosition, AssetClass } from "./types";
import { parseDecimalUS } from "./validators";

const CLASS_MAP: Record<string, AssetClass> = {
  base_ampla: "etf_intl",
  semicondutor: "stocks_intl",
  energia_rede: "stocks_intl",
  big_tech: "stocks_intl",
  cripto: "etf_intl",
  real_assets: "etf_intl",
  renda_bond: "etf_intl",
  caixa: "liquidity",
};

export interface FotoRow extends ParsedPosition {
  corretora: "nomad" | "xp";
  pnlPrecomputed: Decimal | null;
  pnlPctPrecomputed: Decimal | null;
}

function splitLine(line: string): string[] {
  return line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
}

export function parseFoto(csvText: string): FotoRow[] {
  const lines = csvText.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2 || !lines[0]) return [];

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase().trim());
  // corretora,ticker,nome,classe,quantidade,preco_medio_usd,preco_atual_usd,valor_posicao_usd,resultado_usd,resultado_pct,data_foto

  const idx = (name: string) => headers.indexOf(name);
  const iCorretora = idx("corretora");
  const iTicker = idx("ticker");
  const iNome = idx("nome");
  const iClasse = idx("classe");
  const iQtd = idx("quantidade");
  const iAvg = idx("preco_medio_usd");
  const iCurrent = idx("preco_atual_usd");
  const iValue = idx("valor_posicao_usd");
  const iResultado = idx("resultado_usd");
  const iResultadoPct = idx("resultado_pct");

  const rows: FotoRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line?.trim()) continue;
    const row = splitLine(line);

    const rawCorretora = row[iCorretora]?.toLowerCase() ?? "";
    if (rawCorretora !== "nomad" && rawCorretora !== "xp") continue;
    const corretora = rawCorretora as "nomad" | "xp";

    const ticker = row[iTicker]?.trim() || null;
    const nome = row[iNome]?.trim() || ticker || "";
    if (!nome) continue;

    const rawValue = row[iValue]?.trim();
    if (!rawValue) continue;

    try {
      const marketValue = parseDecimalUS(rawValue);
      const qtdRaw = row[iQtd]?.trim();
      const quantity = qtdRaw ? parseDecimalUS(qtdRaw) : new Decimal(1);
      const avgPrice = row[iAvg]?.trim() ? parseDecimalUS(row[iAvg]!) : null;
      const currentPrice = row[iCurrent]?.trim() ? parseDecimalUS(row[iCurrent]!) : null;
      const pnlPrecomputed = row[iResultado]?.trim() ? parseDecimalUS(row[iResultado]!) : null;
      const pnlPctRaw = row[iResultadoPct]?.trim();
      const pnlPctPrecomputed = pnlPctRaw ? parseDecimalUS(pnlPctRaw).div(100) : null;

      const classeRaw = row[iClasse]?.toLowerCase().trim() ?? "";
      const assetClass: AssetClass = CLASS_MAP[classeRaw] ?? "stocks_intl";

      rows.push({
        corretora,
        ticker,
        name: nome,
        assetClass,
        currency: "USD",
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
        pnlPrecomputed,
        pnlPctPrecomputed,
        rawData: Object.fromEntries(headers.map((h, k) => [h, row[k] ?? ""])),
      });
    } catch {
      // linha inválida — continua
    }
  }

  return rows;
}

export function detectFoto(csvText: string): boolean {
  const first = csvText.trim().split("\n")[0]?.toLowerCase() ?? "";
  return first.includes("corretora") && first.includes("ticker") && first.includes("valor_posicao_usd");
}
