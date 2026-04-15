import { describe, expect, it } from "vitest";
import { applyMacroOverlay } from "@/lib/model/applyMacroOverlay";
import type { MacroAligned } from "@/lib/macro/alignment";
import type { ParsedGrid, RowMapping, SessionAnswers } from "@/lib/types";

const answers: SessionAnswers = {
  currency: "AUD",
  fyStartMonth: 7,
  baseIncludesInflation: false,
  industrySegment: "OTHER_RETAIL",
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

/** Rising series on revenue-linked drivers; flat on COGS so only revenue moves. */
function alignedRevenueMomOnly(n: number): MacroAligned {
  const rise = Array.from({ length: n }, (_, t) => 100 + 10 * t);
  const flat = Array.from({ length: n }, () => 100);
  return {
    RETAIL_TURNOVER_INDEX: rise,
    CPI_ALL_GROUPS: rise,
    CPI_TRADABLE_GOODS: flat,
    WPI: flat,
    CPI_RENT: flat,
    CPI_ELECTRICITY: flat,
  };
}

describe("presentation rollups", () => {
  /** Uploaded GP cell (999) is wrong on purpose; engine must replace with Revenue − COGS. */
  it("replaces wrong uploaded gross profit with Revenue minus COGS and recomputes total OpEx from detail", () => {
    const grid: ParsedGrid = {
      rowLabels: ["Revenue", "COGS", "Gross Profit", "Other OpEx", "Total OpEx"],
      periodLabels: ["M1"],
      values: [[100], [40], [999], [10], [500]],
    };
    const mapping: RowMapping[] = [
      { rowIndex: 0, canonicalId: "REVENUE", confidence: 1 },
      { rowIndex: 1, canonicalId: "COGS", confidence: 1 },
      { rowIndex: 2, canonicalId: "GROSS_PROFIT", confidence: 1 },
      { rowIndex: 3, canonicalId: "OTHER_OPEX", confidence: 1 },
      { rowIndex: 4, canonicalId: "TOTAL_OPEX", confidence: 1 },
    ];
    const overlay = applyMacroOverlay({
      grid,
      mapping,
      aligned: flatAligned(100, 1),
      answers,
      macroSnapshotIso: "2026-01-01T00:00:00.000Z",
    });
    expect(overlay.baseline[2]![0]).toBe(60);
    expect(overlay.baseline[4]![0]).toBe(10);
    expect(overlay.adjusted[2]![0]).toBe(60);
    expect(overlay.adjusted[4]![0]).toBe(10);
  });

  it("infers Gross profit from the row label when that row is UNMAPPED and overwrites a bad upload", () => {
    const grid: ParsedGrid = {
      rowLabels: ["Total revenue", "COGS", "Gross profit", "Wages"],
      periodLabels: ["M1"],
      values: [[102_223], [34_981], [169_464], [28_519]],
    };
    const mapping: RowMapping[] = [
      { rowIndex: 0, canonicalId: "REVENUE", confidence: 1 },
      { rowIndex: 1, canonicalId: "COGS", confidence: 1 },
      { rowIndex: 2, canonicalId: "UNMAPPED", confidence: 0 },
      { rowIndex: 3, canonicalId: "PAYROLL", confidence: 1 },
    ];
    const overlay = applyMacroOverlay({
      grid,
      mapping,
      aligned: flatAligned(100, 1),
      answers,
      macroSnapshotIso: null,
    });
    expect(overlay.baseline[2]![0]).toBe(102_223 - 34_981);
    expect(overlay.layoutWarnings?.some((w) => w.includes("unmapped"))).toBe(true);
  });

  it("subtracts COGS when the COGS row sits below Gross profit (mis-ordered sheet)", () => {
    const grid: ParsedGrid = {
      rowLabels: ["Total revenue", "Gross profit", "COGS"],
      periodLabels: ["M1"],
      values: [[100_000], [0], [34_981]],
    };
    const mapping: RowMapping[] = [
      { rowIndex: 0, canonicalId: "REVENUE", confidence: 1 },
      { rowIndex: 1, canonicalId: "GROSS_PROFIT", confidence: 1 },
      { rowIndex: 2, canonicalId: "COGS", confidence: 1 },
    ];
    const overlay = applyMacroOverlay({
      grid,
      mapping,
      aligned: flatAligned(100, 1),
      answers,
      macroSnapshotIso: null,
    });
    expect(overlay.baseline[1]![0]).toBe(100_000 - 34_981);
    expect(overlay.layoutWarnings?.some((w) => w.includes("below your Gross profit"))).toBe(true);
  });

  it("recomputes npat from npbt minus tax lines below npbt", () => {
    const grid: ParsedGrid = {
      rowLabels: ["NPBT", "Tax", "NPAT"],
      periodLabels: ["M1"],
      values: [[100], [30], [0]],
    };
    const mapping: RowMapping[] = [
      { rowIndex: 0, canonicalId: "NPBT", confidence: 1 },
      { rowIndex: 1, canonicalId: "INCOME_TAX", confidence: 1 },
      { rowIndex: 2, canonicalId: "NPAT", confidence: 1 },
    ];
    const overlay = applyMacroOverlay({
      grid,
      mapping,
      aligned: flatAligned(100, 1),
      answers,
      macroSnapshotIso: null,
    });
    expect(overlay.baseline[2]![0]).toBe(70);
    expect(overlay.adjusted[2]![0]).toBe(70);
  });

  it("rescales adjusted income tax when roll-up NPBT moves with macro", () => {
    const periodLabels = ["2025-01", "2025-02"];
    const R = (a: number, b: number) => [a, b];
    const grid: ParsedGrid = {
      rowLabels: [
        "Revenue",
        "COGS",
        "Gross profit",
        "Other opex",
        "Total opex",
        "EBITDA",
        "D&A",
        "EBIT",
        "Interest",
        "NPBT",
        "Tax",
        "NPAT",
      ],
      periodLabels,
      values: [
        R(1000, 1000),
        R(400, 400),
        R(0, 0),
        R(100, 100),
        R(0, 0),
        R(0, 0),
        R(50, 50),
        R(0, 0),
        R(20, 20),
        R(0, 0),
        R(129, 129),
        R(0, 0),
      ],
    };
    const mapping: RowMapping[] = [
      { rowIndex: 0, canonicalId: "REVENUE", confidence: 1 },
      { rowIndex: 1, canonicalId: "COGS", confidence: 1 },
      { rowIndex: 2, canonicalId: "GROSS_PROFIT", confidence: 1 },
      { rowIndex: 3, canonicalId: "OTHER_OPEX", confidence: 1 },
      { rowIndex: 4, canonicalId: "TOTAL_OPEX", confidence: 1 },
      { rowIndex: 5, canonicalId: "EBITDA", confidence: 1 },
      { rowIndex: 6, canonicalId: "DEPRECIATION", confidence: 1 },
      { rowIndex: 7, canonicalId: "EBIT", confidence: 1 },
      { rowIndex: 8, canonicalId: "INTEREST", confidence: 1 },
      { rowIndex: 9, canonicalId: "NPBT", confidence: 1 },
      { rowIndex: 10, canonicalId: "INCOME_TAX", confidence: 1 },
      { rowIndex: 11, canonicalId: "NPAT", confidence: 1 },
    ];
    const overlay = applyMacroOverlay({
      grid,
      mapping,
      aligned: alignedRevenueMomOnly(2),
      answers,
      macroSnapshotIso: "2026-01-01T00:00:00.000Z",
    });
    const npbt = overlay.adjusted[9]![1]!;
    const tax = overlay.adjusted[10]![1]!;
    const npat = overlay.adjusted[11]![1]!;
    const rate = 129 / 430;
    expect(tax).toBeCloseTo(npbt * rate, 4);
    expect(npat).toBeCloseTo(npbt - tax, 4);
    expect(overlay.baseline[10]![1]).toBe(129);
  });
});

describe("pl expense sign normalization (negative uploads)", () => {
  it("treats negative COGS as positive magnitude for gross profit", () => {
    const grid: ParsedGrid = {
      rowLabels: ["Revenue", "COGS", "Gross Profit", "Other OpEx", "Total OpEx"],
      periodLabels: ["M1"],
      values: [[100], [-40], [999], [-10], [500]],
    };
    const mapping: RowMapping[] = [
      { rowIndex: 0, canonicalId: "REVENUE", confidence: 1 },
      { rowIndex: 1, canonicalId: "COGS", confidence: 1 },
      { rowIndex: 2, canonicalId: "GROSS_PROFIT", confidence: 1 },
      { rowIndex: 3, canonicalId: "OTHER_OPEX", confidence: 1 },
      { rowIndex: 4, canonicalId: "TOTAL_OPEX", confidence: 1 },
    ];
    const overlay = applyMacroOverlay({
      grid,
      mapping,
      aligned: flatAligned(100, 1),
      answers,
      macroSnapshotIso: null,
    });
    expect(overlay.baseline[1]![0]).toBe(40);
    expect(overlay.baseline[3]![0]).toBe(10);
    expect(overlay.baseline[2]![0]).toBe(60);
    expect(overlay.baseline[4]![0]).toBe(10);
  });

  it("treats negative income tax like positive tax expense for NPAT", () => {
    const grid: ParsedGrid = {
      rowLabels: ["NPBT", "Tax", "NPAT"],
      periodLabels: ["M1"],
      values: [[100], [-30], [0]],
    };
    const mapping: RowMapping[] = [
      { rowIndex: 0, canonicalId: "NPBT", confidence: 1 },
      { rowIndex: 1, canonicalId: "INCOME_TAX", confidence: 1 },
      { rowIndex: 2, canonicalId: "NPAT", confidence: 1 },
    ];
    const overlay = applyMacroOverlay({
      grid,
      mapping,
      aligned: flatAligned(100, 1),
      answers,
      macroSnapshotIso: null,
    });
    expect(overlay.baseline[1]![0]).toBe(30);
    expect(overlay.baseline[2]![0]).toBe(70);
  });

  it("matches all-positive rollups when detail costs are uploaded negative", () => {
    const periodLabels = ["M1"];
    const positive: ParsedGrid = {
      rowLabels: [
        "Revenue",
        "COGS",
        "Gross profit",
        "Other opex",
        "Total opex",
        "EBITDA",
        "D&A",
        "EBIT",
        "Interest",
        "NPBT",
        "Tax",
        "NPAT",
      ],
      periodLabels,
      values: [[1000], [400], [0], [100], [0], [0], [50], [0], [20], [0], [129], [0]],
    };
    const negative: ParsedGrid = {
      ...positive,
      values: [[1000], [-400], [0], [-100], [0], [0], [-50], [0], [-20], [0], [-129], [0]],
    };
    const mapping: RowMapping[] = [
      { rowIndex: 0, canonicalId: "REVENUE", confidence: 1 },
      { rowIndex: 1, canonicalId: "COGS", confidence: 1 },
      { rowIndex: 2, canonicalId: "GROSS_PROFIT", confidence: 1 },
      { rowIndex: 3, canonicalId: "OTHER_OPEX", confidence: 1 },
      { rowIndex: 4, canonicalId: "TOTAL_OPEX", confidence: 1 },
      { rowIndex: 5, canonicalId: "EBITDA", confidence: 1 },
      { rowIndex: 6, canonicalId: "DEPRECIATION", confidence: 1 },
      { rowIndex: 7, canonicalId: "EBIT", confidence: 1 },
      { rowIndex: 8, canonicalId: "INTEREST", confidence: 1 },
      { rowIndex: 9, canonicalId: "NPBT", confidence: 1 },
      { rowIndex: 10, canonicalId: "INCOME_TAX", confidence: 1 },
      { rowIndex: 11, canonicalId: "NPAT", confidence: 1 },
    ];
    const a = applyMacroOverlay({
      grid: positive,
      mapping,
      aligned: flatAligned(100, 1),
      answers,
      macroSnapshotIso: null,
    });
    const b = applyMacroOverlay({
      grid: negative,
      mapping,
      aligned: flatAligned(100, 1),
      answers,
      macroSnapshotIso: null,
    });
    for (const idx of [2, 4, 5, 7, 9, 10, 11]) {
      expect(b.baseline[idx]![0]).toBe(a.baseline[idx]![0]);
      expect(b.adjusted[idx]![0]).toBe(a.adjusted[idx]![0]);
    }
  });
});
