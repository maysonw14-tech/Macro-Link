import { describe, expect, it } from "vitest";
import { stripAggregatePeriodColumns } from "@/lib/model/stripAggregatePeriodColumns";
import type { ParsedGrid } from "@/lib/types";

describe("stripAggregatePeriodColumns", () => {
  it("removes Total column and keeps time periods", () => {
    const grid: ParsedGrid = {
      rowLabels: ["A"],
      periodLabels: ["Mar-26", "Apr-26", "Total"],
      values: [[1, 2, 3]],
    };
    const out = stripAggregatePeriodColumns(grid);
    expect(out.periodLabels).toEqual(["Mar-26", "Apr-26"]);
    expect(out.values[0]).toEqual([1, 2]);
  });

  it("matches Total case-insensitively", () => {
    const grid: ParsedGrid = {
      rowLabels: ["A"],
      periodLabels: ["M1", "TOTAL", "m2"],
      values: [[10, 20, 30]],
    };
    const out = stripAggregatePeriodColumns(grid);
    expect(out.periodLabels).toEqual(["M1", "m2"]);
    expect(out.values[0]).toEqual([10, 30]);
  });

  it("strips Year to date label", () => {
    const grid: ParsedGrid = {
      rowLabels: ["A"],
      periodLabels: ["P1", "P2", "Year To Date"],
      values: [[5, 6, 7]],
    };
    const out = stripAggregatePeriodColumns(grid);
    expect(out.periodLabels).toEqual(["P1", "P2"]);
    expect(out.values[0]).toEqual([5, 6]);
  });

  it("strips YTD when at least two time columns remain", () => {
    const grid: ParsedGrid = {
      rowLabels: ["A"],
      periodLabels: ["Jan", "Feb", "YTD"],
      values: [[1, 2, 3]],
    };
    const out = stripAggregatePeriodColumns(grid);
    expect(out.periodLabels).toEqual(["Jan", "Feb"]);
    expect(out.values[0]).toEqual([1, 2]);
  });

  it("does not strip when fewer than two periods would remain", () => {
    const grid: ParsedGrid = {
      rowLabels: ["A"],
      periodLabels: ["Jan", "Total"],
      values: [[1, 2]],
    };
    const out = stripAggregatePeriodColumns(grid);
    expect(out.periodLabels).toEqual(["Jan", "Total"]);
    expect(out.values[0]).toEqual([1, 2]);
  });

  it("does not strip month-like labels containing total as substring", () => {
    const grid: ParsedGrid = {
      rowLabels: ["A"],
      periodLabels: ["total revenue", "Feb"],
      values: [[1, 2]],
    };
    const out = stripAggregatePeriodColumns(grid);
    expect(out.periodLabels).toEqual(["total revenue", "Feb"]);
  });
});
