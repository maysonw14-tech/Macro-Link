import type { RowMapping } from "../types";

/**
 * Canonical detail lines treated as **positive dollar magnitudes** (management P&L style).
 * Rollups in `recalculatePresentationTotals` subtract these: rev − COGS, GP − OpEx, EBIT − interest, NPBT − tax.
 * When uploads store costs as negatives, flip to positive so formulas stay correct.
 *
 * Not applied to profit subtotals (losses may be negative) or revenue. Tax credits entered as
 * negative tax expense are indistinguishable from “wrong sign” uploads; those stay flipped to positive here.
 */
const EXPENSE_MAGNITUDE_IDS = new Set([
  "COGS",
  "PAYROLL",
  "RENT",
  "MARKETING",
  "UTILITIES",
  "OTHER_OPEX",
  "DEPRECIATION",
  "INTEREST",
  "INCOME_TAX",
]);

export function normalizePlExpenseSigns(matrix: number[][], mapping: RowMapping[]): void {
  const byRow = new Map<number, string>();
  for (const m of mapping) {
    byRow.set(m.rowIndex, m.canonicalId);
  }
  for (let i = 0; i < matrix.length; i++) {
    const id = byRow.get(i);
    if (!id || !EXPENSE_MAGNITUDE_IDS.has(id)) continue;
    const row = matrix[i]!;
    for (let t = 0; t < row.length; t++) {
      const v = row[t]!;
      if (v < 0) row[t] = -v;
    }
  }
}
