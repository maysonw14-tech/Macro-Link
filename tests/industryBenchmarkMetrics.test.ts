import { describe, expect, it } from "vitest";
import { computeIndustryBenchmarkUserPcts } from "@/lib/model/industryBenchmarkMetrics";
import type { RowMapping } from "@/lib/types";

describe("computeIndustryBenchmarkUserPcts", () => {
  it("derives EBITDA margin when no EBITDA row is mapped", () => {
    const adjusted = [
      [10_000],
      [4_000],
      [1_500],
    ];
    const mapping: RowMapping[] = [
      { rowIndex: 0, canonicalId: "REVENUE", confidence: 1 },
      { rowIndex: 1, canonicalId: "COGS", confidence: 1 },
      { rowIndex: 2, canonicalId: "PAYROLL", confidence: 1 },
    ];
    const p = computeIndustryBenchmarkUserPcts(adjusted, mapping);
    expect(p.grossMarginPct).toBeCloseTo(60, 5);
    expect(p.ebitdaMarginPct).not.toBeNull();
    expect(p.ebitdaMarginPct).toBeCloseTo(((10_000 - 4_000 - 1_500) / 10_000) * 100, 5);
  });

  it("uses mapped EBITDA when present", () => {
    const adjusted = [
      [10_000],
      [4_000],
      [1_500],
      [2_000],
    ];
    const mapping: RowMapping[] = [
      { rowIndex: 0, canonicalId: "REVENUE", confidence: 1 },
      { rowIndex: 1, canonicalId: "COGS", confidence: 1 },
      { rowIndex: 2, canonicalId: "PAYROLL", confidence: 1 },
      { rowIndex: 3, canonicalId: "EBITDA", confidence: 1 },
    ];
    const p = computeIndustryBenchmarkUserPcts(adjusted, mapping);
    expect(p.ebitdaMarginPct).toBeCloseTo(20, 5);
  });

  it("does not sum every revenue row into the sales denominator when a total revenue line is present", () => {
    const adjusted = [
      [65_000],
      [2_241],
      [102_223],
      [34_981],
      [67_242],
    ];
    const rowLabels = ["Sales Revenue", "Other Revenue", "Total Revenue", "COGS", "Gross profit"];
    const mapping: RowMapping[] = [
      { rowIndex: 0, canonicalId: "REVENUE", confidence: 1 },
      { rowIndex: 1, canonicalId: "REVENUE", confidence: 1 },
      { rowIndex: 2, canonicalId: "REVENUE", confidence: 1 },
      { rowIndex: 3, canonicalId: "COGS", confidence: 1 },
      { rowIndex: 4, canonicalId: "GROSS_PROFIT", confidence: 1 },
    ];
    const p = computeIndustryBenchmarkUserPcts(adjusted, mapping, rowLabels);
    expect(p.grossMarginPct).toBeCloseTo(((102_223 - 34_981) / 102_223) * 100, 5);
  });
});
