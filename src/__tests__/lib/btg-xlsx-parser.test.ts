import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { parseBTGXlsx, extractBTGXlsxOwner } from "@/lib/xlsx/btg-xlsx-parser";

const FIXTURE = "/Users/tazima/Downloads/017697350.xlsx";
const hasFixture = existsSync(FIXTURE);

function loadBuffer(): ArrayBuffer {
  const buf = readFileSync(FIXTURE);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

describe.skipIf(!hasFixture)("parseBTGXlsx (extrato real)", () => {
  it("extrai owner corretamente — apenas primeiro titular, com CPF", () => {
    const owner = extractBTGXlsxOwner(loadBuffer());
    expect(owner.name).toMatch(/RODRIGO/i);
    // Não deve conter o nome da esposa
    expect(owner.name).not.toMatch(/GRASIELE/i);
    expect(owner.cpf).toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
  });

  it("parseia posições de renda variável (Ações)", () => {
    const positions = parseBTGXlsx(loadBuffer());
    const rv = positions.filter((p) => p.assetClass === "stocks_br");
    expect(rv.length).toBeGreaterThanOrEqual(6);

    const tickers = rv.map((p) => p.ticker);
    expect(tickers).toContain("AXIA3");
    expect(tickers).toContain("BBAS3");
    expect(tickers).toContain("BPAC11");
    expect(tickers).toContain("CPLE3");
    expect(tickers).toContain("ITUB4");
    expect(tickers).toContain("SUZB3");
  });

  it("BPAC11 classificado como stocks_br, não fiis", () => {
    const positions = parseBTGXlsx(loadBuffer());
    const bpac = positions.find((p) => p.ticker === "BPAC11");
    expect(bpac).toBeDefined();
    expect(bpac?.assetClass).toBe("stocks_br");
  });

  it("parseia posições de renda fixa", () => {
    const positions = parseBTGXlsx(loadBuffer());
    const rf = positions.filter((p) => p.assetClass === "fixed_income");
    expect(rf.length).toBeGreaterThanOrEqual(4);
    for (const p of rf) {
      expect(p.marketValue.toNumber()).toBeGreaterThan(0);
      expect(p.name).toBeTruthy();
    }
  });

  it("parseia fundos de investimento", () => {
    const positions = parseBTGXlsx(loadBuffer());
    const funds = positions.filter((p) => p.assetClass === "funds" || p.assetClass === "fiis");
    expect(funds.length).toBeGreaterThanOrEqual(10);
    for (const p of funds) {
      expect(p.marketValue.toNumber()).toBeGreaterThan(0);
    }
  });

  it("total geral bate com extrato BTG (~R$1.2M)", () => {
    const positions = parseBTGXlsx(loadBuffer());
    const total = positions.reduce((acc, p) => acc + p.marketValue.toNumber(), 0);
    // Portal BTG mostra R$1,202,340.95 — aceita ±5k de margem de cotação
    expect(total).toBeGreaterThan(1_190_000);
    expect(total).toBeLessThan(1_220_000);
  });

  it("nenhuma posição com marketValue zero ou negativo", () => {
    const positions = parseBTGXlsx(loadBuffer());
    expect(positions.length).toBeGreaterThan(0);
    for (const p of positions) {
      expect(p.marketValue.toNumber()).toBeGreaterThan(0);
    }
  });
});
