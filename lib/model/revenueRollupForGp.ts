import { normalizeLabelForMatch } from "../mapping/labelNormalize";
import type { RowMapping } from "../types";

/** Relative spread threshold: treat multiple Revenue rows as duplicate display of one total when max−min ≤ this × scale (per period). */
const DUPLICATE_REVENUE_REL_TOL = 0.001;

function canon(mapping: RowMapping[], i: number): string {
  return mapping.find((m) => m.rowIndex === i)?.canonicalId ?? "UNMAPPED";
}

/**
 * Labels that usually denote a **rolled-up** revenue line on the sheet (already includes detail rows above).
 * When several rows are mapped as REVENUE and one matches, we use that row only for gross profit to avoid
 * double-counting Sales + Other + Total Revenue.
 */
export function isRevenueSheetSubtotalLabel(label: string): boolean {
  const n = normalizeLabelForMatch(label);
  if (!n) return false;
  if (n.includes("total revenue") || n.includes("revenue total")) return true;
  if (n.includes("total turnover") || n.includes("turnover total")) return true;
  if (n.includes("consolidated revenue") || n.includes("revenue consolidated")) return true;
  if (n.includes("total net sales") || n.includes("net sales total")) return true;
  // "Total sales" alone is ambiguous (e.g. "total sales and marketing"); require revenue/sales context.
  if (/\btotal sales\b/.test(n) && !/(marketing|expense|cost|commission|fee)/.test(n)) return true;
  return false;
}

/**
 * Sum of mapped `REVENUE` cells strictly above `exclusiveEndRow` for period `t`, with duplicate protection:
 * if two or more revenue rows have nearly identical values in that period, use their mean (one economic stream).
 * If several revenue rows include a sheet-style **total** line (see `isRevenueSheetSubtotalLabel`), use that row only.
 * Otherwise sum all rows (e.g. additive product lines).
 */
export function revenueSumAboveExclusive(
  mapping: RowMapping[],
  exclusiveEndRow: number,
  t: number,
  matrix: number[][],
  rowLabels?: string[],
): number {
  const idxs: number[] = [];
  for (let j = 0; j < exclusiveEndRow; j++) {
    if (canon(mapping, j) === "REVENUE") idxs.push(j);
  }
  if (idxs.length === 0) return 0;
  if (idxs.length === 1) return matrix[idxs[0]!]![t]!;

  if (rowLabels) {
    const subtotalIdxs = idxs.filter((j) => isRevenueSheetSubtotalLabel(rowLabels[j] ?? ""));
    const nonSubtotalIdxs = idxs.filter((j) => !isRevenueSheetSubtotalLabel(rowLabels[j] ?? ""));
    /** Sheet total + detail lines (e.g. Sales + Other + Total revenue)—use the total row only. */
    if (subtotalIdxs.length > 0 && nonSubtotalIdxs.length > 0) {
      const pick = subtotalIdxs[subtotalIdxs.length - 1]!;
      return matrix[pick]![t]!;
    }
  }

  const vals = idxs.map((j) => matrix[j]![t]!);
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  const spread = mx - mn;
  const scale = Math.max(1, ...vals.map((v) => Math.abs(v)));
  const threshold = Math.max(0.5, DUPLICATE_REVENUE_REL_TOL * scale);
  if (spread <= threshold) {
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  return vals.reduce((a, b) => a + b, 0);
}

/** Operating “other income” lines above the GP row (included in gross margin with sales). */
export function otherIncomeSumAboveExclusive(
  mapping: RowMapping[],
  exclusiveEndRow: number,
  t: number,
  matrix: number[][],
): number {
  let s = 0;
  for (let j = 0; j < exclusiveEndRow; j++) {
    if (canon(mapping, j) === "OTHER_INCOME") s += matrix[j]![t]!;
  }
  return s;
}

export interface CogsForGpResult {
  /** Positive magnitude to subtract from revenue for gross profit. */
  value: number;
  /** True when COGS rows appeared only below the GP row (common sheet layout mistake). */
  usedCogsBelowGp: boolean;
}

/**
 * Cost of goods sold for gross profit: sum mapped COGS **above** the GP row (usual case).
 * If none are above, use COGS rows **below** the GP row (mis-ordered sheets where GP appears before COGS).
 * Uses absolute value per cell so negative expense entries cannot flip subtraction into addition.
 */
export function cogsSumForGrossProfit(
  mapping: RowMapping[],
  gpRow: number,
  t: number,
  matrix: number[][],
  nR: number,
): CogsForGpResult {
  let fromAbove = 0;
  for (let j = 0; j < gpRow; j++) {
    if (canon(mapping, j) === "COGS") fromAbove += Math.abs(matrix[j]![t]!);
  }
  if (fromAbove > 1e-9) {
    return { value: fromAbove, usedCogsBelowGp: false };
  }

  let fromBelow = 0;
  let seenCogs = false;
  for (let j = gpRow + 1; j < nR; j++) {
    const id = canon(mapping, j);
    if (id === "COGS") {
      fromBelow += Math.abs(matrix[j]![t]!);
      seenCogs = true;
    } else if (seenCogs) {
      break;
    }
  }
  if (fromBelow > 1e-9) {
    return { value: fromBelow, usedCogsBelowGp: true };
  }

  for (let j = gpRow + 1; j < nR; j++) {
    if (canon(mapping, j) === "COGS") fromBelow += Math.abs(matrix[j]![t]!);
  }
  return { value: fromBelow, usedCogsBelowGp: fromBelow > 1e-9 };
}

/**
 * User-facing warnings when multiple Revenue rows sit above a Gross profit row.
 * Uses `matrix` (typically baseline) to classify duplicate vs summed periods.
 */
export function collectRevenueLayoutWarnings(
  mapping: RowMapping[],
  nR: number,
  nP: number,
  matrix: number[][],
  rowLabels?: string[],
): string[] {
  const out: string[] = [];
  let pushDedupe = false;
  let pushSum = false;
  let pushSubtotalPreferred = false;

  for (let gpRow = 0; gpRow < nR; gpRow++) {
    if (canon(mapping, gpRow) !== "GROSS_PROFIT") continue;
    const revIdx: number[] = [];
    for (let j = 0; j < gpRow; j++) {
      if (canon(mapping, j) === "REVENUE") revIdx.push(j);
    }
    if (revIdx.length < 2) continue;

    if (
      rowLabels &&
      revIdx.some((j) => isRevenueSheetSubtotalLabel(rowLabels[j] ?? "")) &&
      revIdx.some((j) => !isRevenueSheetSubtotalLabel(rowLabels[j] ?? ""))
    ) {
      pushSubtotalPreferred = true;
      continue;
    }

    for (let t = 0; t < nP; t++) {
      const vals = revIdx.map((j) => matrix[j]![t]!);
      const mn = Math.min(...vals);
      const mx = Math.max(...vals);
      const spread = mx - mn;
      const scale = Math.max(1, ...vals.map((v) => Math.abs(v)));
      const threshold = Math.max(0.5, DUPLICATE_REVENUE_REL_TOL * scale);
      if (spread <= threshold) pushDedupe = true;
      else pushSum = true;
    }
  }

  if (pushSubtotalPreferred) {
    out.push(
      "Several lines are mapped as Revenue above Gross profit, including one whose label looks like a sheet total (e.g. Total revenue). Gross profit used that total only so component revenue lines above it were not added again—map those detail lines to Unmapped or Other income if you instead want them summed separately.",
    );
  }

  if (pushDedupe) {
    out.push(
      "Multiple lines are mapped as Revenue above Gross profit. Where those amounts match within tolerance in a period, only one stream is used for gross profit so duplicate totals are not double-counted—check Mappings if that is wrong for your file.",
    );
  }
  if (pushSum) {
    out.push(
      "Multiple Revenue lines appear above Gross profit and are summed where values differ materially—confirm each line should add to sales.",
    );
  }

  return out;
}

/** Warn when COGS only appears below the Gross profit row (mis-ordered upload). */
export function collectCogsBelowGpWarnings(
  mapping: RowMapping[],
  nR: number,
  nP: number,
  matrix: number[][],
): string[] {
  for (let gpRow = 0; gpRow < nR; gpRow++) {
    if (canon(mapping, gpRow) !== "GROSS_PROFIT") continue;
    for (let t = 0; t < nP; t++) {
      if (cogsSumForGrossProfit(mapping, gpRow, t, matrix, nR).usedCogsBelowGp) {
        return [
          "Cost of goods sold rows appear below your Gross profit line in row order. They were still subtracted for gross profit using those amounts—prefer putting COGS above Gross profit to match a standard P&L layout.",
        ];
      }
    }
  }
  return [];
}
