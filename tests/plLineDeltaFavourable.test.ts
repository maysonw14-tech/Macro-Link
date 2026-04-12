import { describe, expect, it } from "vitest";
import { plLineDeltaFavourable } from "@/lib/model/plLineDeltaFavourable";

describe("plLineDeltaFavourable", () => {
  it("returns null for UNMAPPED", () => {
    expect(plLineDeltaFavourable("UNMAPPED", 1_000)).toBeNull();
  });

  it("returns null for unknown canonical id", () => {
    expect(plLineDeltaFavourable("UNKNOWN", 1_000)).toBeNull();
  });

  it("returns null when total delta is within dollar neutral band", () => {
    expect(plLineDeltaFavourable("REVENUE", 0)).toBeNull();
    expect(plLineDeltaFavourable("REVENUE", 0.5)).toBeNull();
    expect(plLineDeltaFavourable("COGS", -0.5)).toBeNull();
  });

  it("income-like: positive delta is favourable", () => {
    expect(plLineDeltaFavourable("REVENUE", 100)).toBe(true);
    expect(plLineDeltaFavourable("REVENUE", -100)).toBe(false);
    expect(plLineDeltaFavourable("NPAT", 50)).toBe(true);
  });

  it("expense-like: negative delta is favourable", () => {
    expect(plLineDeltaFavourable("COGS", -80)).toBe(true);
    expect(plLineDeltaFavourable("COGS", 80)).toBe(false);
    expect(plLineDeltaFavourable("PAYROLL", -1.5)).toBe(true);
  });
});
