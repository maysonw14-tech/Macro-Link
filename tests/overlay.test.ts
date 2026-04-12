import { describe, expect, it } from "vitest";
import { applyMacroOverlay } from "@/lib/model/applyMacroOverlay";
import { buildReportNarrative } from "@/lib/model/buildReportNarrative";
import type { MacroAligned } from "@/lib/macro/alignment";
import type { ParsedGrid, RowMapping, SessionAnswers } from "@/lib/types";

const grid: ParsedGrid = {
  rowLabels: ["Revenue", "COGS"],
  periodLabels: ["2025-01", "2025-02"],
  values: [
    [1000, 1000],
    [400, 400],
  ],
};

const mapping: RowMapping[] = [
  { rowIndex: 0, canonicalId: "REVENUE", confidence: 0.9 },
  { rowIndex: 1, canonicalId: "COGS", confidence: 0.9 },
];

const answers: SessionAnswers = {
  currency: "AUD",
  fyStartMonth: 7,
  baseIncludesInflation: false,
  industrySegment: "OTHER_RETAIL",
};

function flatAligned(level: number): MacroAligned {
  return {
    RETAIL_TURNOVER_INDEX: [level, level],
    CPI_ALL_GROUPS: [level, level],
    CPI_TRADABLE_GOODS: [level, level],
    WPI: [level, level],
    CPI_RENT: [level, level],
    CPI_ELECTRICITY: [level, level],
  };
}

describe("applyMacroOverlay", () => {
  it("leaves baseline when macro flat (no mom)", () => {
    const overlay = applyMacroOverlay({
      grid,
      mapping,
      aligned: flatAligned(100),
      answers,
      macroSnapshotIso: "2025-01-01T00:00:00.000Z",
    });
    expect(overlay.baseline[0]?.[0]).toBe(1000);
    expect(overlay.adjusted[0]?.[0]).toBe(1000);
  });

  it("COGS overlay differs by industry when CPI tradables MoM is non-zero", () => {
    const aligned: MacroAligned = {
      RETAIL_TURNOVER_INDEX: [100, 100],
      CPI_ALL_GROUPS: [100, 100],
      CPI_TRADABLE_GOODS: [100, 104],
      WPI: [100, 100],
      CPI_RENT: [100, 100],
      CPI_ELECTRICITY: [100, 100],
    };
    const neutral = applyMacroOverlay({
      grid,
      mapping,
      aligned,
      answers: { ...answers, industrySegment: "OTHER_RETAIL" },
      macroSnapshotIso: null,
    });
    const food = applyMacroOverlay({
      grid,
      mapping,
      aligned,
      answers: { ...answers, industrySegment: "FOOD_GROCERY" },
      macroSnapshotIso: null,
    });
    expect(food.adjusted[1]?.[1]).not.toBe(neutral.adjusted[1]?.[1]);
    expect(food.forwardRule).toContain("FOOD_GROCERY");
    expect(neutral.forwardRule).toContain("OTHER_RETAIL");
  });
});

describe("buildReportNarrative", () => {
  it("returns risks and recommendations arrays", () => {
    const overlay = applyMacroOverlay({
      grid,
      mapping,
      aligned: flatAligned(100),
      answers,
      macroSnapshotIso: "2025-01-01T00:00:00.000Z",
    });
    const n = buildReportNarrative({
      overlay,
      mapping,
      grid,
      answers,
      macroFetchedAt: new Date("2025-01-01"),
    });
    expect(n.financialRisksAndLimitations.length).toBeGreaterThan(0);
    expect(n.financialRecommendations.length).toBeGreaterThanOrEqual(2);
    expect(n.financialRecommendations.length).toBeLessThanOrEqual(3);
    expect(n.topMaterialDrivers.length).toBeGreaterThanOrEqual(1);
    expect(n.topMaterialDrivers.length).toBeLessThanOrEqual(3);
    expect(n.industryBenchmarkSummary.rows).toHaveLength(4);
  });
});
