import Decimal from "decimal.js";
import type {
  ParsedPosition,
  ParseError,
  AssetClass,
  DocumentOwner,
} from "@/lib/csv/types";

// Extrato da XP Investments US LLC (conta XP Global, USD). Diferente do Nomad,
// aqui o pdf-parse "cola" as colunas (ex: "GLOBAL X FDS GLOBAL X COPPERCOPX" e
// "12.00076.97923.64..."), o que quebra qualquer parse posicional ingênuo.
// A solução é reconstruir as colunas pelas coordenadas (x,y) de cada trecho de
// texto do pdfjs, inserindo um separador quando há um gap horizontal. Assim o
// ticker sai separado do nome e cada número sai na sua coluna.

// Separador de coluna improvável de ocorrer no texto do PDF.
const COL = "\u0001";

// CUSIP: 9 caracteres alfanuméricos.
const CUSIP_RE = /^[A-Z0-9]{9}$/;
// Símbolo/ticker: 1–6 letras maiúsculas (com ponto opcional, ex: BRK.B).
const SYMBOL_RE = /^[A-Z]{1,6}(?:\.[A-Z])?$/;
// Valor monetário: 12.00, 1,283.67 etc.
const MONEY_RE = /^-?[\d,]+\.\d+$/;

// Palavras que indicam fundo/ETF na descrição → etf_intl; caso contrário stocks_intl.
const FUND_HINT_RE = /\b(FDS|ETF|FUND|TRUST|TR|INDEX|SPDR|SHS)\b/;

interface PdfTextItem {
  str: string;
  width: number;
  transform: number[];
}
interface PdfTextContent {
  items: PdfTextItem[];
}
interface PdfPageData {
  getTextContent(opts: {
    normalizeWhitespace: boolean;
    disableCombineTextItems: boolean;
  }): Promise<PdfTextContent>;
}

// Reconstrói o texto agrupando por linha (Y) e separando colunas por gap em X.
function renderByColumns(pageData: PdfPageData): Promise<string> {
  return pageData
    .getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false })
    .then((tc) => {
      const rows = new Map<number, PdfTextItem[]>();
      for (const it of tc.items) {
        const y = Math.round(it.transform[5] ?? 0);
        const bucket = rows.get(y);
        if (bucket) bucket.push(it);
        else rows.set(y, [it]);
      }
      const ys = [...rows.keys()].sort((a, b) => b - a); // topo → base
      const lines: string[] = [];
      for (const y of ys) {
        const items = (rows.get(y) ?? []).sort(
          (a, b) => (a.transform[4] ?? 0) - (b.transform[4] ?? 0),
        );
        let line = "";
        let prevEnd: number | null = null;
        for (const it of items) {
          const x = it.transform[4] ?? 0;
          if (prevEnd !== null && x - prevEnd > 4) line += COL;
          line += it.str;
          prevEnd = x + it.width;
        }
        lines.push(line);
      }
      return lines.join("\n");
    });
}

async function extractColumnLines(buffer: ArrayBuffer): Promise<string[]> {
  // pdf-parse v1.1.1 empacota pdfjs-dist v2 — sem workers, sem APIs de browser.
  // Importa o módulo interno (lib/pdf-parse.js) em vez do index.js: o index tem
  // um branch de "debug" que lê um PDF de teste inexistente quando module.parent
  // é falsy (ex: sob Vitest), quebrando com ENOENT.
  const mod = await import("pdf-parse/lib/pdf-parse.js");
  const pdfParse = (mod.default ?? mod) as (
    data: Buffer | Uint8Array,
    opts?: { pagerender?: (p: PdfPageData) => Promise<string> },
  ) => Promise<{ text: string }>;
  const result = await pdfParse(Buffer.from(buffer), { pagerender: renderByColumns });
  return result.text.split("\n");
}

function parseUSD(s: string | undefined): Decimal | null {
  if (!s) return null;
  const cleaned = s.replace(/,/g, "").trim();
  if (!cleaned) return null;
  try {
    const d = new Decimal(cleaned);
    return d.isNaN() ? null : d;
  } catch {
    return null;
  }
}

function classifyAsset(description: string): AssetClass {
  return FUND_HINT_RE.test(description.toUpperCase()) ? "etf_intl" : "stocks_intl";
}

const OWNER_SKIP_RE =
  /xp invest|brickell|miami|phone|account|statement|period|balance|summary|portfolio|^us$/i;

/**
 * Parseia as linhas já reconstruídas por coluna (separadas por COL). Função pura,
 * testável sem PDF. Extrai o caixa (Cash Balance de fechamento) como posição de
 * liquidez e cada linha da seção PORTFOLIO como uma posição em USD.
 */
export function parseXpGlobalLines(lines: string[]): {
  positions: ParsedPosition[];
  errors: ParseError[];
} {
  const positions: ParsedPosition[] = [];
  const errors: ParseError[] = [];

  // 1. Caixa (Cash Balance de fechamento) do ACCOUNT SUMMARY → liquidez.
  for (const raw of lines) {
    const cols = raw.split(COL).map((c) => c.trim());
    if (!/^cash balance$/i.test(cols[0] ?? "")) continue;
    const closing = parseUSD(cols[cols.length - 1]); // última coluna = fechamento
    if (closing && closing.gt(0)) {
      positions.push({
        ticker: null,
        name: "Cash Balance (XP Global)",
        assetClass: "liquidity",
        currency: "USD",
        quantity: closing,
        avgPrice: new Decimal(1),
        currentPrice: new Decimal(1),
        marketValue: closing,
        maturityDate: null,
        indexer: null,
        indexerRate: null,
        liquidityDays: 0,
        quotaValue: null,
        quotaDate: null,
        rawData: { section: "cash_balance" },
      });
    }
    break;
  }

  // 2. Seção PORTFOLIO.
  const start = lines.findIndex((l) => l.trim() === "PORTFOLIO");
  if (start === -1) return { positions, errors };

  for (let i = start + 1; i < lines.length; i++) {
    const cols = lines[i]?.split(COL).map((c) => c.trim()) ?? [];
    if (/^total$/i.test(cols[0] ?? "")) break;

    // Linha de posição: >= 9 colunas, col1 = símbolo, col2 = quantidade numérica.
    const symbol = cols[1] ?? "";
    if (cols.length < 9 || !SYMBOL_RE.test(symbol) || !MONEY_RE.test(cols[2] ?? "")) {
      continue;
    }

    const quantity = parseUSD(cols[2]);
    const price = parseUSD(cols[4]);
    const marketValue = parseUSD(cols[5]);
    if (!quantity || !marketValue) {
      errors.push({ row: i, field: "portfolio", message: `Linha ilegível: ${symbol}` });
      continue;
    }

    // Nome pode continuar na próxima linha (descrição que quebrou); o CUSIP aparece
    // sozinho ou junto da continuação (ex: " DEV MKT | 921943858").
    let name = cols[0] ?? symbol;
    let cusip: string | null = null;
    for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
      const next = lines[j]?.split(COL).map((c) => c.trim()) ?? [];
      // Se a próxima já for outra posição ou o Total, para.
      if (SYMBOL_RE.test(next[1] ?? "") && MONEY_RE.test(next[2] ?? "")) break;
      if (/^total$/i.test(next[0] ?? "")) break;
      const cusipTok = next.find((t) => CUSIP_RE.test(t));
      const cont = next.filter((t) => t && !CUSIP_RE.test(t)).join(" ").trim();
      if (cont) name = `${name} ${cont}`.trim();
      if (cusipTok) {
        cusip = cusipTok;
        break;
      }
    }

    positions.push({
      ticker: symbol,
      name,
      assetClass: classifyAsset(name),
      currency: "USD",
      quantity,
      avgPrice: null, // extrato não traz custo médio
      currentPrice: price,
      marketValue,
      maturityDate: null,
      indexer: null,
      indexerRate: null,
      liquidityDays: null,
      quotaValue: null,
      quotaDate: null,
      rawData: cusip
        ? { section: "portfolio", cusip }
        : { section: "portfolio" },
    });
  }

  return { positions, errors };
}

export async function extractXpGlobalPdfOwner(
  buffer: ArrayBuffer,
): Promise<DocumentOwner> {
  const lines = await extractColumnLines(buffer);
  for (const raw of lines.slice(0, 20)) {
    // O nome pode vir concatenado com outras colunas; testa cada coluna.
    for (const trimmed of raw.split(COL).map((c) => c.trim())) {
      if (trimmed.length < 5) continue;
      if (OWNER_SKIP_RE.test(trimmed)) continue;
      if (/^[A-Z][A-Z\s]+$/.test(trimmed) && trimmed.split(/\s+/).length >= 2) {
        return { name: trimmed, cpf: null };
      }
    }
  }
  return { name: null, cpf: null };
}

// exchangeRate entra por consistência com os outros parsers; as posições ficam em
// USD e a conversão para BRL acontece na Server Action antes do insert.
export async function parseXpGlobalPdf(
  buffer: ArrayBuffer,
  _exchangeRate: Decimal,
): Promise<ParsedPosition[]> {
  const lines = await extractColumnLines(buffer);
  return parseXpGlobalLines(lines).positions;
}
