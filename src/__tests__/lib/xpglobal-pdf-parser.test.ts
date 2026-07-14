// @vitest-environment node
// pdf-parse (pdfjs v1) exige worker quando roda em jsdom; em Node (igual à
// Server Action em produção) funciona sem worker.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import {
  parseXpGlobalLines,
  parseXpGlobalPdf,
  extractXpGlobalPdfOwner,
} from "@/lib/pdf/xpglobal-pdf-parser";
import Decimal from "decimal.js";

// Separador de coluna usado internamente pelo parser (reconstrução por coordenadas).
const COL = "\u0001";
const j = (...cols: string[]) => cols.join(COL);

function must<T>(v: T | undefined, msg: string): T {
  if (v === undefined) throw new Error(`esperava ${msg}`);
  return v;
}

// ── Teste puro (sem PDF, sem PII, sempre roda) ─────────────────────────────
describe("parseXpGlobalLines", () => {
  // Linhas sintéticas no formato que o renderByColumns produz: colunas separadas
  // por COL, CUSIP na linha seguinte, descrição podendo quebrar em duas linhas.
  const lines = [
    "ACCOUNT SUMMARY",
    j("Cash Balance", "50.00", "75.00"), // abertura, fechamento → usa 75.00
    "PORTFOLIO",
    j("Description", "Symbol", "Quantity", "Securities on", "Price($)", "Market Value", "Previous Period's", "% Change", "% of Total"),
    j("CUSIP", "Loan", "Market Value", "Portfolio"),
    j("GLOBAL X FDS GLOBAL X COPPER", "COPX", "10.00", "0", "80.00", "800.00", "900.00", "-11.11", "40.00"),
    "37954Y830",
    // descrição que quebra: continuação " DEV MKT" vem junto do CUSIP na próxima linha
    j("VANGUARD TAX-MANAGED FDS VAN FTSE", "VEA", "20.00", "0", "40.00", "800.00", "700.00", "14.28", "40.00"),
    j(" DEV MKT", "921943858"),
    // ação comum (sem palavra de fundo) → stocks_intl
    j("INTERNATIONAL BUSINESS MACHS COM", "IBM", "2.00", "0", "200.00", "400.00", "380.00", "5.26", "20.00"),
    "459200101",
    j("Total", "2,000.00", "1,980.00"),
  ];

  const { positions, errors } = parseXpGlobalLines(lines);

  it("não produz erros de parsing", () => {
    expect(errors).toHaveLength(0);
  });

  it("extrai caixa (fechamento) como posição de liquidez em USD", () => {
    const cash = must(positions.find((p) => p.rawData.section === "cash_balance"), "caixa");
    expect(cash.assetClass).toBe("liquidity");
    expect(cash.currency).toBe("USD");
    expect(cash.marketValue.toNumber()).toBe(75);
  });

  it("extrai as 3 posições do portfolio + caixa", () => {
    expect(positions).toHaveLength(4);
  });

  it("separa ticker colado no nome e captura CUSIP", () => {
    const copx = must(positions.find((p) => p.ticker === "COPX"), "COPX");
    expect(copx.name).toBe("GLOBAL X FDS GLOBAL X COPPER");
    expect(copx.quantity.toNumber()).toBe(10);
    expect(copx.currentPrice?.toNumber()).toBe(80);
    expect(copx.marketValue.toNumber()).toBe(800);
    expect(copx.currency).toBe("USD");
    expect(copx.avgPrice).toBeNull(); // extrato não traz custo médio
    expect(copx.rawData.cusip).toBe("37954Y830");
    expect(copx.assetClass).toBe("etf_intl");
  });

  it("junta a continuação da descrição quebrada em duas linhas", () => {
    const vea = must(positions.find((p) => p.ticker === "VEA"), "VEA");
    expect(vea.name).toBe("VANGUARD TAX-MANAGED FDS VAN FTSE DEV MKT");
    expect(vea.rawData.cusip).toBe("921943858");
  });

  it("classifica ação comum (sem palavra de fundo) como stocks_intl", () => {
    const ibm = must(positions.find((p) => p.ticker === "IBM"), "IBM");
    expect(ibm.assetClass).toBe("stocks_intl");
  });

  it("soma posições + caixa fecha com o patrimônio", () => {
    const total = positions.reduce((a, p) => a + p.marketValue.toNumber(), 0);
    expect(total).toBe(75 + 800 + 800 + 400);
  });
});

// ── Integração contra extrato real (pulado quando o fixture não existe) ─────
const FIXTURE = "/Users/tazima/Documents/projects/Invest/XPGLOBAL.pdf";
const hasFixture = existsSync(FIXTURE);

function loadBuffer(): ArrayBuffer {
  const buf = readFileSync(FIXTURE);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

describe.skipIf(!hasFixture)("parseXpGlobalPdf (extrato real)", () => {
  it("identifica o titular", async () => {
    const owner = await extractXpGlobalPdfOwner(loadBuffer());
    expect(owner.name).toMatch(/RODRIGO/i);
  });

  it("extrai posições + caixa e a soma fecha com o Total Net Worth", async () => {
    const positions = await parseXpGlobalPdf(loadBuffer(), new Decimal(1));
    // 5 posições + caixa
    expect(positions.length).toBeGreaterThanOrEqual(6);
    const tickers = positions.map((p) => p.ticker);
    expect(tickers).toContain("COPX");
    expect(tickers).toContain("VOO");
    expect(tickers).toContain("VEA");
    const total = positions.reduce((a, p) => a + p.marketValue.toNumber(), 0);
    expect(total).toBeCloseTo(9741.26, 2);
  });
});
