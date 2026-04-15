import * as XLSX from "xlsx";
import { accountingCell } from "./accountingFormat";
import type { OverlayResult } from "./types";
import type { ReportNarrative } from "./model/buildReportNarrative";

function sumRow(row: number[]): number {
  return row.reduce((s, v) => s + v, 0);
}

/** Sheet 1: P&L only (after + difference + totals + rationale on diff row). */
function overlayToAoA(overlay: OverlayResult): (string | number)[][] {
  const head: (string | number)[] = ["Line", "Kind", ...overlay.periodLabels, "Total", "Rationale"];
  const rows: (string | number)[][] = [head];

  for (let i = 0; i < overlay.baseline.length; i++) {
    const label = overlay.explanations[i]?.rowLabel ?? `Row_${i}`;
    const ex = overlay.explanations[i];
    const a = overlay.adjusted[i]!;
    const d = overlay.delta[i]!;

    rows.push([label, "after", ...a.map((v) => accountingCell(v)), accountingCell(sumRow(a)), ""]);
    rows.push([
      label,
      "difference",
      ...d.map((v) => accountingCell(v)),
      accountingCell(sumRow(d)),
      ex?.rationale ?? "",
    ]);
  }
  return rows;
}

function pctCell(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "–";
  return `${n.toFixed(1)}%`;
}

function pctCellSignedVariance(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "–";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

/** Sheet 2: four closing sections in fixed order. */
function narrativeToAoA(narrative: ReportNarrative): (string | number)[][] {
  const rows: (string | number)[][] = [["Macro Link — analysis report"]];
  rows.push([]);

  rows.push(["1. Top 3 Material Drivers"]);
  for (const m of narrative.topMaterialDrivers) {
    rows.push([m.summary]);
  }
  rows.push([]);

  rows.push(["2. Financial Risks and Limitations"]);
  for (const r of narrative.financialRisksAndLimitations) {
    rows.push([r]);
  }
  rows.push([]);

  rows.push(["3. Financial Recommendations"]);
  for (const r of narrative.financialRecommendations) {
    rows.push([r]);
  }
  rows.push([]);

  rows.push(["4. Industry Benchmark Summary"]);
  rows.push([narrative.industryBenchmarkSummary.disclosure]);
  rows.push([
    "Metric",
    "Your % (after overlay)",
    "Indicative benchmark %",
    "Variance (your − bench, %)",
    "Comment",
  ]);
  for (const row of narrative.industryBenchmarkSummary.rows) {
    rows.push([
      row.metricName,
      pctCell(row.userValuePct),
      pctCell(row.benchmarkPct),
      pctCellSignedVariance(row.variancePct),
      row.comparisonNote,
    ]);
  }

  return rows;
}

export function buildMacroLinkWorkbookBuffer(overlay: OverlayResult, narrative: ReportNarrative): Buffer {
  const wb = XLSX.utils.book_new();
  const pl = XLSX.utils.aoa_to_sheet(overlayToAoA(overlay));
  const nar = XLSX.utils.aoa_to_sheet(narrativeToAoA(narrative));
  XLSX.utils.book_append_sheet(wb, pl, "P_and_L");
  XLSX.utils.book_append_sheet(wb, nar, "Narrative");
  return Buffer.from(XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as ArrayBuffer);
}
