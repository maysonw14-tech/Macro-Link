import { describe, expect, it } from "vitest";
import {
  formatMacroImpactPct,
  macroImpactPctOfBaseline,
  rowPctVsBaseline,
  shortEconomicRationale,
} from "@/lib/model/macroSensitivityRationale";

describe("macroImpactPctOfBaseline", () => {
  it("expresses |delta| over |baseline| as percent", () => {
    expect(macroImpactPctOfBaseline(500, 100_000)).toBeCloseTo(0.5, 5);
  });
});

describe("formatMacroImpactPct", () => {
  it("uses more decimals for small impacts", () => {
    expect(formatMacroImpactPct(0.015)).toMatch(/^0\.0/);
    expect(Number.parseFloat(formatMacroImpactPct(5.5))).toBeCloseTo(5.5, 5);
  });
});

describe("rowPctVsBaseline", () => {
  it("scales signed delta by absolute baseline with floor", () => {
    expect(rowPctVsBaseline(500, 100_000)).toBeCloseTo(0.5, 5);
  });
});

describe("shortEconomicRationale", () => {
  it("returns empty for UNMAPPED", () => {
    expect(
      shortEconomicRationale({
        canonicalId: "UNMAPPED",
        canonicalLabel: "Misc",
        dominantDriverId: "RETAIL_TURNOVER_INDEX",
        totalDelta: 100,
        totalBaseline: 1000,
        isRollup: false,
        isIncomeTax: false,
      }),
    ).toBe("");
  });

  it("returns empty when total delta is negligible", () => {
    expect(
      shortEconomicRationale({
        canonicalId: "REVENUE",
        canonicalLabel: "Revenue",
        dominantDriverId: "RETAIL_TURNOVER_INDEX",
        totalDelta: 0,
        totalBaseline: 1000,
        isRollup: false,
        isIncomeTax: false,
      }),
    ).toBe("");
  });

  it("leaf line names driver and macro link strength without index snapshot", () => {
    const s = shortEconomicRationale({
      canonicalId: "REVENUE",
      canonicalLabel: "Sales revenue",
      dominantDriverId: "CPI_ALL_GROUPS",
      totalDelta: 500,
      totalBaseline: 100_000,
      isRollup: false,
      isIncomeTax: false,
    });
    expect(s).toContain("Favourable");
    expect(s).toContain("CPI — all groups");
    expect(s).toContain("macro link");
    expect(s).not.toContain("as at");
    expect(s).not.toContain("data cached");
    expect(s).not.toMatch(/YoY|MoM/i);
  });

  it("rollup omits macro link strength wording", () => {
    const s = shortEconomicRationale({
      canonicalId: "EBITDA",
      canonicalLabel: "EBITDA",
      dominantDriverId: null,
      totalDelta: -1000,
      totalBaseline: 20_000,
      isRollup: true,
      isIncomeTax: false,
    });
    expect(s).toContain("down");
    expect(s).toContain("subtotal");
    expect(s).not.toContain("macro link");
  });

  it("income tax omits macro link strength wording", () => {
    const s = shortEconomicRationale({
      canonicalId: "INCOME_TAX",
      canonicalLabel: "Income tax",
      dominantDriverId: null,
      totalDelta: 50,
      totalBaseline: 500,
      isRollup: false,
      isIncomeTax: true,
    });
    expect(s).toMatch(/Income tax (higher|lower)/);
    expect(s).toContain("tax line");
    expect(s).not.toContain("macro link");
  });
});
