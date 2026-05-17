import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { toDecimal, formatBRL, formatPct, formatMono, toBRL, sumDecimals } from "@/lib/decimal";

describe("toDecimal", () => {
  it("converts string", () => {
    expect(toDecimal("1234.56").toString()).toBe("1234.56");
  });

  it("converts number", () => {
    expect(toDecimal(42).toString()).toBe("42");
  });

  it("returns zero for null", () => {
    expect(toDecimal(null).isZero()).toBe(true);
  });

  it("returns zero for undefined", () => {
    expect(toDecimal(undefined).isZero()).toBe(true);
  });
});

describe("formatBRL", () => {
  it("formats with pt-BR currency style", () => {
    expect(formatBRL(new Decimal("1234567.89"))).toBe("R$ 1.234.567,89");
  });

  it("accepts raw number", () => {
    expect(formatBRL(0)).toBe("R$ 0,00");
  });

  it("accepts string", () => {
    expect(formatBRL("100")).toBe("R$ 100,00");
  });
});

describe("formatPct", () => {
  it("positive value shows + sign", () => {
    expect(formatPct(new Decimal("0.1234"))).toBe("+12.34%");
  });

  it("negative value shows - sign", () => {
    expect(formatPct(new Decimal("-0.05"))).toBe("-5.00%");
  });

  it("zero shows +0.00%", () => {
    expect(formatPct(0)).toBe("+0.00%");
  });
});

describe("formatMono", () => {
  it("negative uses unicode minus", () => {
    expect(formatMono(new Decimal("-1.5"))).toBe("−1.50");
  });

  it("positive without sign", () => {
    expect(formatMono(new Decimal("3.14"))).toBe("3.14");
  });
});

describe("toBRL", () => {
  it("multiplies by exchange rate", () => {
    const usd = new Decimal("100");
    const rate = new Decimal("5.5");
    expect(toBRL(usd, rate).toString()).toBe("550");
  });
});

describe("sumDecimals", () => {
  it("sums array", () => {
    const result = sumDecimals([new Decimal("1"), new Decimal("2"), new Decimal("3")]);
    expect(result.toString()).toBe("6");
  });

  it("ignores null and undefined", () => {
    const result = sumDecimals([new Decimal("5"), null, undefined]);
    expect(result.toString()).toBe("5");
  });

  it("returns zero for empty array", () => {
    expect(sumDecimals([]).isZero()).toBe(true);
  });
});
