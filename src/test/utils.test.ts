import { describe, it, expect } from "vitest";
import { cn, formatBRL, formatPct, formatChange } from "@/lib/utils";

describe("cn", () => {
  it("mescla classes sem conflito", () => {
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("ignora valores falsy", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});

describe("formatBRL", () => {
  it("formata valor positivo", () => {
    const result = formatBRL(1234.56);
    expect(result).toContain("1.234,56");
  });

  it("formata zero", () => {
    const result = formatBRL(0);
    expect(result).toContain("0,00");
  });

  it("aceita string numérica", () => {
    const result = formatBRL("9999.99");
    expect(result).toContain("9.999,99");
  });
});

describe("formatPct", () => {
  it("formata positivo com sinal +", () => {
    expect(formatPct(0.123)).toBe("+12.3%");
  });

  it("formata negativo com sinal -", () => {
    expect(formatPct(-0.05)).toBe("-5.0%");
  });

  it("respeita casas decimais", () => {
    expect(formatPct(0.1, 2)).toBe("+10.00%");
  });
});

describe("formatChange", () => {
  it("usa − (U+2212) para negativo", () => {
    const result = formatChange(-10.5);
    expect(result.startsWith("−")).toBe(true);
  });

  it("usa + para positivo", () => {
    expect(formatChange(5.25)).toBe("+5.25");
  });
});
