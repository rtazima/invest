import Decimal from "decimal.js";
import type { ParsedPosition, AssetClass, DocumentOwner } from "@/lib/csv/types";

// CUSIP: 9 alphanumeric characters
const CUSIP_RE = /^[A-Z0-9]{9}$/;

// Standalone ticker line: 1–6 uppercase letters only
const TICKER_ONLY_RE = /^[A-Z]{1,6}$/;

// Data line: starts with decimal number (quantity field)
const DATA_LINE_RE = /^\d+\.\d+ /;

async function extractText(buffer: ArrayBuffer): Promise<string> {
  // pdf-parse v1.1.1 embute pdfjs-dist v2 — sem workers, sem browser APIs.
  // module.exports = fn; dynamic import expõe como .default em ESM.
  const mod = await import("pdf-parse");
  const pdfParse = (mod.default ?? mod) as (
    data: Buffer | Uint8Array,
  ) => Promise<{ text: string }>;
  const result = await pdfParse(Buffer.from(buffer));
  // debug temporário — remover após validar formato
  console.log("[nomad-pdf] primeiros 1500 chars:\n", result.text.slice(0, 1500));
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

export async function extractNomadPdfOwner(buffer: ArrayBuffer): Promise<DocumentOwner> {
  const text = await extractText(buffer);
  const lines = text.split("\n");

  // Page 1 header: name appears at line ~5 as an all-caps full name
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

  // 1. FDIC deposit
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === "FDIC INSURED DEPOSITS BANK BALANCES") {
      // Skip header row, find first data row
      for (let j = i + 2; j < Math.min(i + 10, lines.length); j++) {
        const line = lines[j];
        if (!line || line.startsWith("Total") || line.startsWith("FDIC")) continue;

        // Format: "Merchants Bank of Indiana Carmel, IN 10,382.88 0.00"
        const parts = line.split(/\s+/);
        const lastTwo = parts.slice(-2);
        if (
          lastTwo.length === 2 &&
          lastTwo.every((p) => /^[\d,]+\.\d+$/.test(p))
        ) {
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
    if (line.startsWith("Total ")) break; // end of portfolio table
    if (line.startsWith("Page ") || line.startsWith("-- ")) { i++; continue; }

    // Collect description lines until we find a CUSIP
    const descLines: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      if (!l || l.startsWith("Total ") || l.startsWith("Page ") || CUSIP_RE.test(l)) break;
      descLines.push(l);
      i++;
    }

    if (i >= lines.length || !CUSIP_RE.test(lines[i] ?? "")) break;
    i++; // skip CUSIP line

    const dataLine = lines[i];
    if (!dataLine || !DATA_LINE_RE.test(dataLine)) continue;
    i++;

    if (descLines.length === 0) continue;

    // Extract ticker from descLines
    let ticker: string;
    let nameLines: string[];

    const lastDescLine = descLines[descLines.length - 1];
    if (!lastDescLine) continue;

    if (TICKER_ONLY_RE.test(lastDescLine)) {
      // Ticker is on its own line (multi-line description)
      ticker = lastDescLine;
      nameLines = descLines.slice(0, -1);
    } else {
      const words = lastDescLine.split(/\s+/);
      const lastWord = words[words.length - 1];
      if (!lastWord) continue;
      if (/^[A-Z]{1,6}$/.test(lastWord)) {
        ticker = lastWord;
        nameLines = [...descLines.slice(0, -1), words.slice(0, -1).join(" ")];
      } else {
        // Fallback: last 4 chars (truncated layout)
        ticker = lastWord.slice(-4);
        nameLines = [...descLines.slice(0, -1), words.slice(0, -1).join(" ")];
      }
    }

    const name = joinDescLines(nameLines) || ticker;

    // Data line: qty, secOnLoan, price, marketValue, prevMarketValue, pctChange, pctPortfolio
    const parts = dataLine.split(/\s+/);
    if (parts.length < 4) continue;

    const quantity = parseUSD(parts[0] ?? "");
    const price = parseUSD(parts[2] ?? "");
    const marketValue = parseUSD(parts[3] ?? "");

    if (!quantity || !marketValue || marketValue.lte(0)) continue;

    // "COM" suffix = individual common stock, everything else = ETF
    const assetClass: AssetClass = name.endsWith(" COM") ? "stocks_intl" : "etf_intl";

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
