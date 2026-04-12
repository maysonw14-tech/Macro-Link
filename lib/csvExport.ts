import { formatAccountingInt } from "./accountingFormat";
import type { OverlayResult } from "./types";

function esc(s: string) {
  return `"${s.replace(/"/g, '""')}"`;
}

function sumRow(row: number[]): number {
  return row.reduce((s, v) => s + v, 0);
}

/** Plain CSV: P&amp;L table only (no narrative — use Excel export for a separate tab). */
export function overlayToCsv(overlay: OverlayResult): string {
  const rows: string[] = [];
  const head = ["Line", "Kind", ...overlay.periodLabels, "Total", "Rationale"];
  rows.push(head.map((h) => esc(h)).join(","));

  for (let i = 0; i < overlay.baseline.length; i++) {
    const label = overlay.explanations[i]?.rowLabel ?? `Row_${i}`;
    const ex = overlay.explanations[i];
    const b = overlay.baseline[i]!;
    const a = overlay.adjusted[i]!;
    const d = overlay.delta[i]!;

    rows.push([
      esc(label),
      "before",
      ...b.map((v) => esc(formatAccountingInt(v))),
      esc(formatAccountingInt(sumRow(b))),
      "",
    ].join(","));
    rows.push([
      esc(label),
      "after",
      ...a.map((v) => esc(formatAccountingInt(v))),
      esc(formatAccountingInt(sumRow(a))),
      "",
    ].join(","));
    rows.push(
      [
        esc(label),
        "difference",
        ...d.map((v) => esc(formatAccountingInt(v))),
        esc(formatAccountingInt(sumRow(d))),
        ex ? esc(ex.rationale) : "",
      ].join(","),
    );
  }

  return rows.join("\n");
}
