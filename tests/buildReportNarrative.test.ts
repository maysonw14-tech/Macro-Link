import { describe, expect, it } from "vitest";
import { applyMacroOverlay } from "@/lib/model/applyMacroOverlay";
import { buildReportNarrative } from "@/lib/model/buildReportNarrative";
import type { MacroAligned } from "@/lib/macro/alignment";
import type { ParsedGrid, RowMapping, SessionAnswers } from "@/lib/types";

const answers: SessionAnswers = {
  currency: "AUD",
  fyStartMonth: 7,
  baseIncludesInflation: false,
  industrySegment: "FOOD_GROCERY",
};

function flatAligned(level: number, n: number): MacroAligned {
  const row = Array.from({ length: n }, () => level);
  return {
    RETAIL_TURNOVER_INDEX: row,
    CPI_ALL_GROUPS: row,
    CPI_TRADABLE_GOODS: row,
    WPI: row,
    CPI_RENT: row,
    CPI_ELECTRICITY: row,
  };
}

describe("buildReportNarrative closing sections", () => {
  it("fills four benchmark rows with null user % when revenue is zero", () => {
    const grid: ParsedGrid = {
      rowLabels: ["Payroll"],
      periodLabels: ["2025-01"],
      values: [[100]],
    };
    const mapping: RowMapping[] = [{ rowIndex: 0, canonicalId: "PAYROLL", confidence: 1 }];
    const overlay = applyMacroOverlay({
      grid,
      mapping,
      aligned: flatAligned(100, 1),
      answers,
      macroSnapshotIso: null,
    });
    const n = buildReportNarrative({
      overlay,
      mapping,
      grid,
      answers,
      macroFetchedAt: new Date("2025-01-01"),
    });
    expect(n.industryBenchmarkSummary.rows).toHaveLength(4);
    expect(n.industryBenchmarkSummary.rows.every((r) => r.userValuePct === null)).toBe(true);
    expect(n.industryBenchmarkSummary.rows.every((r) => r.variancePct === null)).toBe(true);
    expect(n.financialRecommendations.length).toBeGreaterThanOrEqual(2);
  });

  it("benchmark variance is user % minus benchmark when sales exist", () => {
    const grid: ParsedGrid = {
      rowLabels: ["Sales"],
      periodLabels: ["2025-01"],
      values: [[50_000]],
    };
    const mapping: RowMapping[] = [{ rowIndex: 0, canonicalId: "REVENUE", confidence: 1 }];
    const overlay = applyMacroOverlay({
      grid,
      mapping,
      aligned: flatAligned(100, 1),
      answers,
      macroSnapshotIso: null,
    });
    const n = buildReportNarrative({
      overlay,
      mapping,
      grid,
      answers,
      macroFetchedAt: new Date("2025-01-01"),
    });
    const r0 = n.industryBenchmarkSummary.rows[0]!;
    expect(r0.userValuePct).not.toBeNull();
    expect(r0.variancePct).not.toBeNull();
    expect(r0.variancePct).toBeCloseTo((r0.userValuePct ?? 0) - r0.benchmarkPct, 5);
  });
});
