import Decimal from "decimal.js";
import type { ParsedPosition, AssetClass, DocumentOwner } from "@/lib/csv/types";

// CUSIP: 9 alphanumeric characters
const CUSIP_RE = /^[A-Z0-9]{9}$/;

// Standalone ticker line: 1–6 uppercase letters only
const TICKER_ONLY_RE = /^[A-Z]{1,6}$/;

// Data line: quantity always has exactly 6 decimal places in pdf-parse v1 format
const DATA_LINE_RE = /^\d+\.\d{6}/;

// Type-code prefixes merged with ticker in single-line descriptions (Pershing PDF layout).
// Ordered longest-first so "EUR" is tried before "E", "EQ" before "E", etc.
const TYPE_PREFIXES = ["COM", "ETF", "SHS", "EQ", "BD", "EUR", "E"];

async function extractText(buffer: ArrayBuffer): Promise<string> {
  // pdf-parse v1.1.1 bundles pdfjs-dist v2 — no workers, no browser APIs.
  const mod = await import("pdf-parse");
  const pdfParse = (mod.default ?? mod) as (
    data: Buffer | Uint8Array,
  ) => Promise<{ text: string }>;
  const result = await pdfParse(Buffer.from(buffer));
  return result.text;
}

function parseUSD(s: string): Decimal | null {
  const cleaned = s.replace(/,/g, "").trim();
  if (!cleaned) return null;
  try {
    const d = new Decimal(cleaned);
    return d.isNaN() ? null : d;
  } catch {
    return null;
  }
}

// Joins multi-line description fragments, fixing hyphenated word breaks
function joinDescLines(lines: string[]): string {
  let result = "";
  for (const line of lines) {
    if (!line) continue;
    if (result.endsWith("-")) {
      result = result.slice(0, -1) + line;
    } else if (result) {
      result += " " + line;
    } else {
      result = line;
    }
  }
  return result.trim();
}

// Extracts ticker from a merged token like "COMAMD", "ETFSMH", "1QQQ".
// Returns isCommon=true when the COM type-code prefix is detected (→ stocks_intl).
function splitTypeAndTicker(token: string): { ticker: string; isCommon: boolean } {
  for (const prefix of TYPE_PREFIXES) {
    if (token.startsWith(prefix)) {
      const rest = token.slice(prefix.length);
      if (/^[A-Z]{3,6}$/.test(rest)) {
        return { ticker: rest, isCommon: prefix === "COM" };
      }
    }
  }
  // Numeric prefix case: "1QQQ" → extract trailing uppercase letters
  const m = token.match(/([A-Z]{3,6})$/);
  if (m?.[1]) return { ticker: m[1], isCommon: false };
  return { ticker: token.slice(-4), isCommon: false };
}

// Parses concatenated data line from pdf-parse v1 format.
// Qty has exactly 6 decimal places; price and mktVal have 2.
// Example: "1.942570354.49688.62395.1874.252.25"
function parseDataLine(
  line: string,
): { quantity: Decimal; price: Decimal | null; marketValue: Decimal } | null {
  const stripped = line.replace(/\s/g, "");
  const m = stripped.match(/^(\d+\.\d{6})([\d,]+\.\d{2})([\d,]+\.\d{2})/);
  if (!m) return null;
  const quantity = parseUSD(m[1] ?? "");
  const price = parseUSD(m[2] ?? "");
  const marketValue = parseUSD(m[3] ?? "");
  if (!quantity || !marketValue) return null;
  return { quantity, price, marketValue };
}

export async function extractNomadPdfOwner(buffer: ArrayBuffer): Promise<DocumentOwner> {
  const text = await extractText(buffer);
  const lines = text.split("\n");

  // Page 1 header: name appears in first 15 lines as an all-caps full name
  for (const line of lines.slice(0, 15)) {
    const trimmed = line.trim();
    if (
      trimmed.length > 5 &&
      /^[A-Z\s]+$/.test(trimmed) &&
      trimmed.split(/\s+/).length >= 2 &&
      !["NOMAD", "PHONE", "BR", "US"].some((s) => trimmed === s)
    ) {
      return { name: trimmed, cpf: null };
    }
  }
  return { name: null, cpf: null };
}

// exchangeRate is provided for API consistency with other parsers; positions store USD values
// and the action converts to BRL before inserting.
export async function parseNomadPdf(
  buffer: ArrayBuffer,
  _exchangeRate: Decimal,
): Promise<ParsedPosition[]> {
  const text = await extractText(buffer);
  const lines = text.split("\n").map((l) => l.trim());
  const positions: ParsedPosition[] = [];

  // 1. FDIC deposit — match header case-insensitively to handle v1 format variation
  for (let i = 0; i < lines.length; i++) {
    if ((lines[i]?.toUpperCase() ?? "").includes("FDIC INSURED DEPOSITS")) {
      for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
        const line = lines[j] ?? "";
        if (!line) continue;
        const upper = line.toUpperCase();
        if (upper.startsWith("TOTAL") || upper.includes("FDIC INSURED")) continue;

        // v1: numbers may be concatenated — match last two decimal values
        const stripped = line.replace(/\s+/g, "");
        const balMatch = stripped.match(/([\d,]+\.\d{2})([\d,]+\.\d{2})$/);
        if (balMatch) {
          const balance = parseUSD(balMatch[1] ?? "");
          if (balance && balance.gt(0)) {
            positions.push({
              ticker: null,
              name: "FDIC Insured Deposit",
              assetClass: "liquidity",
              currency: "USD",
              quantity: new Decimal(1),
              avgPrice: null,
              currentPrice: balance,
              marketValue: balance,
              maturityDate: null,
              indexer: null,
              indexerRate: null,
              liquidityDays: null,
              quotaValue: null,
              quotaDate: null,
              rawData: { section: "fdic_deposit" },
            });
          }
          break;
        }
        // Spaced format fallback
        const parts = line.split(/\s+/);
        const lastTwo = parts.slice(-2);
        if (lastTwo.length === 2 && lastTwo.every((p) => /^[\d,]+\.\d+$/.test(p))) {
          const balance = parseUSD(lastTwo[0] ?? "");
          if (balance && balance.gt(0)) {
            positions.push({
              ticker: null,
              name: "FDIC Insured Deposit",
              assetClass: "liquidity",
              currency: "USD",
              quantity: new Decimal(1),
              avgPrice: null,
              currentPrice: balance,
              marketValue: balance,
              maturityDate: null,
              indexer: null,
              indexerRate: null,
              liquidityDays: null,
              quotaValue: null,
              quotaDate: null,
              rawData: { section: "fdic_deposit" },
            });
          }
          break;
        }
      }
      break;
    }
  }

  // 2. PORTFOLIO section
  let portfolioStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === "PORTFOLIO") {
      portfolioStart = i;
      break;
    }
  }
  if (portfolioStart === -1) return positions;

  // 8 header lines follow "PORTFOLIO" before positions start
  let i = portfolioStart + 9;

  while (i < lines.length) {
    const line = lines[i];

    if (!line) { i++; continue; }
    if (line.startsWith("Total ")) break;
    if (line.startsWith("Page ") || line.startsWith("-- ")) { i++; continue; }

    // Collect description lines until we hit a CUSIP or data line
    const descLines: string[] = [];
    while (i < lines.length) {
      const l = lines[i] ?? "";
      if (
        !l ||
        l.startsWith("Total ") ||
        l.startsWith("Page ") ||
        l.startsWith("-- ") ||
        CUSIP_RE.test(l) ||
        DATA_LINE_RE.test(l)
      ) break;
      descLines.push(l);
      i++;
    }

    if (i >= lines.length) break;

    const stoppedAt = lines[i] ?? "";

    if (!stoppedAt || stoppedAt.startsWith("Total ")) break;
    if (stoppedAt.startsWith("Page ") || stoppedAt.startsWith("-- ")) { i++; continue; }
    // Data line without preceding CUSIP — off-track, skip
    if (DATA_LINE_RE.test(stoppedAt)) { i++; continue; }
    // Must be CUSIP
    if (!CUSIP_RE.test(stoppedAt)) { i++; continue; }
    i++; // skip CUSIP

    const dataLine = lines[i] ?? "";
    if (!dataLine || !DATA_LINE_RE.test(dataLine)) { if (dataLine) i++; continue; }
    i++;

    if (descLines.length === 0) continue;

    const parsed = parseDataLine(dataLine);
    if (!parsed || parsed.marketValue.lte(0)) continue;
    const { quantity, price, marketValue } = parsed;

    // Extract ticker from descLines
    let ticker: string;
    let nameLines: string[];
    let isCommon = false;

    const lastDescLine = descLines[descLines.length - 1] ?? "";

    if (TICKER_ONLY_RE.test(lastDescLine)) {
      // Ticker is on its own line (multi-line description with hyphenation)
      ticker = lastDescLine;
      nameLines = descLines.slice(0, -1);
    } else {
      const words = lastDescLine.split(/\s+/);
      const lastWord = words[words.length - 1] ?? "";

      if (TICKER_ONLY_RE.test(lastWord)) {
        // Ticker cleanly separated as last word
        ticker = lastWord;
        nameLines = [...descLines.slice(0, -1), words.slice(0, -1).join(" ")];
      } else {
        // Merged token: type-code prefix + ticker (e.g. "COMAMD", "ETFSMH", "1QQQ")
        const extracted = splitTypeAndTicker(lastWord);
        ticker = extracted.ticker;
        isCommon = extracted.isCommon;
        nameLines = [...descLines.slice(0, -1), words.slice(0, -1).join(" ")];
      }
    }

    const name = joinDescLines(nameLines) || ticker;
    const assetClass: AssetClass = isCommon ? "stocks_intl" : "etf_intl";

    positions.push({
      ticker,
      name,
      assetClass,
      currency: "USD",
      quantity,
      avgPrice: null,
      currentPrice: price,
      marketValue,
      maturityDate: null,
      indexer: null,
      indexerRate: null,
      liquidityDays: null,
      quotaValue: null,
      quotaDate: null,
      rawData: { section: "portfolio" },
    });
  }

  return positions;
}
