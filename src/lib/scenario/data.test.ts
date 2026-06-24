import { describe, it, expect } from "vitest";
import { computeFreshness } from "./data";

// Regra do PRD v2.3: stale após 8 dias, unavailable após 15 dias ou duas execuções falhas.
describe("computeFreshness", () => {
  it("fica current dentro de 8 dias", () => {
    expect(computeFreshness(0, false)).toBe("current");
    expect(computeFreshness(7, false)).toBe("current");
  });

  it("fica stale entre 8 e 15 dias", () => {
    expect(computeFreshness(8, false)).toBe("stale");
    expect(computeFreshness(15, false)).toBe("stale");
  });

  it("fica unavailable após 15 dias", () => {
    expect(computeFreshness(16, false)).toBe("unavailable");
    expect(computeFreshness(40, false)).toBe("unavailable");
  });

  it("fica unavailable com duas execuções falhas, mesmo com dado fresco", () => {
    expect(computeFreshness(1, true)).toBe("unavailable");
  });
});
