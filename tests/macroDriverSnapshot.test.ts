import { describe, expect, it } from "vitest";
import type { MacroAligned } from "@/lib/macro/alignment";
import { driverSnapshotSnippet } from "@/lib/model/macroDriverSnapshot";

describe("driverSnapshotSnippet", () => {
  it("prefers YoY when 13+ points", () => {
    const series = Array.from({ length: 13 }, (_, i) => 100 * Math.pow(1.035, i / 12));
    const aligned: MacroAligned = {
      RETAIL_TURNOVER_INDEX: series,
      CPI_ALL_GROUPS: series,
      CPI_TRADABLE_GOODS: series,
      WPI: series,
      CPI_RENT: series,
      CPI_ELECTRICITY: series,
    };
    const labels = Array.from({ length: 13 }, (_, i) => `2024-${String(i + 1).padStart(2, "0")}`);
    const s = driverSnapshotSnippet("CPI_ALL_GROUPS", aligned, labels, "2026-04-10T00:00:00.000Z");
    expect(s).toContain("YoY");
    expect(s).toContain("as at");
    expect(s).toContain("data cached");
  });

  it("uses MoM when fewer than 13 periods", () => {
    const aligned: MacroAligned = {
      RETAIL_TURNOVER_INDEX: [100, 101],
      CPI_ALL_GROUPS: [100, 101.5],
      CPI_TRADABLE_GOODS: [100, 100],
      WPI: [100, 100],
      CPI_RENT: [100, 100],
      CPI_ELECTRICITY: [100, 100],
    };
    const labels = ["2025-01", "2025-02"];
    const s = driverSnapshotSnippet("CPI_ALL_GROUPS", aligned, labels, null);
    expect(s).toContain("MoM");
    expect(s).toContain("as at");
  });
});
