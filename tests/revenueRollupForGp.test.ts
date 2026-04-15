import { describe, expect, it } from "vitest";
import { applyMacroOverlay } from "@/lib/model/applyMacroOverlay";
import type { MacroAligned } from "@/lib/macro/alignment";
import type { ParsedGrid, RowMapping, SessionAnswers } from "@/lib/types";
import {
  collectRevenueLayoutWarnings,
  revenueSumAboveExclusive,
} from "@/lib/model/revenueRollupForGp";

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

function canonMapping(rows: { rowIndex: number; canonicalId: string }[]): RowMapping[] {
  return rows.map((r) => ({ ...r, confidence: 1 }));
}

describe("revenueSumAboveExclusive", () => {
  it("uses mean when two revenue rows are duplicate-sized in a period", () => {
    const mapping = canonMapping([
      { rowIndex: 0, canonicalId: "REVENUE" },
      { rowIndex: 1, canonicalId: "REVENUE" },
    ]);
    const matrix = [
      [98_000],
      [98_000],
    ];
    expect(revenueSumAboveExclusive(mapping, 2, 0, matrix)).toBe(98_000);
  });

  it("sums when two revenue rows differ materially", () => {
    const mapping = canonMapping([
      { rowIndex: 0, canonicalId: "REVENUE" },
      { rowIndex: 1, canonicalId: "REVENUE" },
    ]);
    const matrix = [
      [50_000],
      [48_000],
    ];
    expect(revenueSumAboveExclusive(mapping, 2, 0, matrix)).toBe(98_000);
  });

  it("uses only the sheet total revenue row when multiple revenues include a subtotal label", () => {
    const mapping = canonMapping([
      { rowIndex: 0, canonicalId: "REVENUE" },
      { rowIndex: 1, canonicalId: "REVENUE" },
      { rowIndex: 2, canonicalId: "REVENUE" },
    ]);
    const matrix = [[50_000], [2_241], [102_223]];
    const rowLabels = ["Sales Revenue", "Other Revenue", "Total Revenue"];
    expect(revenueSumAboveExclusive(mapping, 3, 0, matrix, rowLabels)).toBe(102_223);
  });
});

describe("collectRevenueLayoutWarnings", () => {
  it("flags duplicate and summed patterns when applicable", () => {
    const mapping = canonMapping([
      { rowIndex: 0, canonicalId: "REVENUE" },
      { rowIndex: 1, canonicalId: "REVENUE" },
      { rowIndex: 2, canonicalId: "COGS" },
      { rowIndex: 3, canonicalId: "GROSS_PROFIT" },
    ]);
    const matrix = [
      [98_000],
      [50_000],
      [10_000],
      [0],
    ];
    const w = collectRevenueLayoutWarnings(mapping, 4, 1, matrix);
    expect(w.some((s) => s.includes("summed"))).toBe(true);
  });

  it("warns when a revenue subtotal label is preferred among multiple revenue rows", () => {
    const mapping = canonMapping([
      { rowIndex: 0, canonicalId: "REVENUE" },
      { rowIndex: 1, canonicalId: "REVENUE" },
      { rowIndex: 2, canonicalId: "COGS" },
      { rowIndex: 3, canonicalId: "GROSS_PROFIT" },
    ]);
    const matrix = [
      [50_000],
      [52_000],
      [10_000],
      [0],
    ];
    const rowLabels = ["Sales Revenue", "Total Revenue", "COGS", "Gross profit"];
    const w = collectRevenueLayoutWarnings(mapping, 4, 1, matrix, rowLabels);
    expect(w.some((s) => s.includes("sheet total"))).toBe(true);
  });
});

describe("applyMacroOverlay duplicate revenue above GP", () => {
  it("replaces inflated gross profit when two identical revenue rows are mapped", () => {
    const grid: ParsedGrid = {
      rowLabels: ["Total revenue A", "Total revenue B", "COGS", "Gross profit"],
      periodLabels: ["M1"],
      values: [[98_000], [98_000], [52_000], [999]],
    };
    const mapping: RowMapping[] = [
      { rowIndex: 0, canonicalId: "REVENUE", confidence: 1 },
      { rowIndex: 1, canonicalId: "REVENUE", confidence: 1 },
      { rowIndex: 2, canonicalId: "COGS", confidence: 1 },
      { rowIndex: 3, canonicalId: "GROSS_PROFIT", confidence: 1 },
    ];
    const overlay = applyMacroOverlay({
      grid,
      mapping,
      aligned: flatAligned(100, 1),
      answers,
      macroSnapshotIso: null,
    });
    expect(overlay.baseline[3]![0]).toBe(46_000);
    expect(overlay.layoutWarnings?.some((s) => s.includes("double-counted"))).toBe(true);
  });

  it("sums two distinct revenue streams for gross profit", () => {
    const grid: ParsedGrid = {
      rowLabels: ["Product A", "Product B", "COGS", "Gross profit"],
      periodLabels: ["M1"],
      values: [[50_000], [48_000], [10_000], [0]],
    };
    const mapping: RowMapping[] = [
      { rowIndex: 0, canonicalId: "REVENUE", confidence: 1 },
      { rowIndex: 1, canonicalId: "REVENUE", confidence: 1 },
      { rowIndex: 2, canonicalId: "COGS", confidence: 1 },
      { rowIndex: 3, canonicalId: "GROSS_PROFIT", confidence: 1 },
    ];
    const overlay = applyMacroOverlay({
      grid,
      mapping,
      aligned: flatAligned(100, 1),
      answers,
      macroSnapshotIso: null,
    });
    expect(overlay.baseline[3]![0]).toBe(88_000);
    expect(overlay.layoutWarnings?.some((s) => s.includes("summed"))).toBe(true);
  });

  it("does not triple-count when Sales, Other, and Total revenue are all mapped as Revenue", () => {
    const grid: ParsedGrid = {
      rowLabels: ["Sales Revenue", "Other Revenue", "Total Revenue", "COGS", "Gross profit"],
      periodLabels: ["M1"],
      values: [[65_000], [2_241], [102_223], [34_981], [169_464]],
    };
    const mapping: RowMapping[] = [
      { rowIndex: 0, canonicalId: "REVENUE", confidence: 1 },
      { rowIndex: 1, canonicalId: "REVENUE", confidence: 1 },
      { rowIndex: 2, canonicalId: "REVENUE", confidence: 1 },
      { rowIndex: 3, canonicalId: "COGS", confidence: 1 },
      { rowIndex: 4, canonicalId: "GROSS_PROFIT", confidence: 1 },
    ];
    const overlay = applyMacroOverlay({
      grid,
      mapping,
      aligned: flatAligned(100, 1),
      answers,
      macroSnapshotIso: null,
    });
    expect(overlay.baseline[4]![0]).toBe(102_223 - 34_981);
    expect(overlay.layoutWarnings?.some((s) => s.includes("sheet total"))).toBe(true);
  });
});
