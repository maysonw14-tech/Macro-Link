import type { ParsedGrid, RowMapping } from "../types";

const OPEX_DETAIL = new Set(["PAYROLL", "RENT", "MARKETING", "UTILITIES", "OTHER_OPEX"]);

const ROLLUP_IDS = new Set([
  "GROSS_PROFIT",
  "TOTAL_OPEX",
  "EBITDA",
  "EBIT",
  "NPBT",
  "NPAT",
]);

function canon(mapping: RowMapping[], i: number): string {
  return mapping.find((m) => m.rowIndex === i)?.canonicalId ?? "UNMAPPED";
}

function lastIndexLt(mapping: RowMapping[], i: number, id: string): number {
  let last = -1;
  for (let j = 0; j < i; j++) {
    if (canon(mapping, j) === id) last = j;
  }
  return last;
}

function lastIndexBetween(mapping: RowMapping[], lo: number, hi: number, id: string): number {
  let last = -1;
  for (let j = lo + 1; j < hi; j++) {
    if (canon(mapping, j) === id) last = j;
  }
  return last;
}

function lowerBoundForOpexWindow(mapping: RowMapping[], i: number): number {
  const gp = lastIndexLt(mapping, i, "GROSS_PROFIT");
  const cg = lastIndexLt(mapping, i, "COGS");
  return Math.max(gp, cg);
}

function sumOpexDetailInWindow(
  mapping: RowMapping[],
  i: number,
  t: number,
  matrix: number[][],
): number {
  const lo = lowerBoundForOpexWindow(mapping, i);
  let s = 0;
  for (let j = lo + 1; j < i; j++) {
    if (OPEX_DETAIL.has(canon(mapping, j))) s += matrix[j]![t]!;
  }
  return s;
}

function sumRevenueAbove(mapping: RowMapping[], i: number, t: number, matrix: number[][]): number {
  let s = 0;
  for (let j = 0; j < i; j++) {
    if (canon(mapping, j) === "REVENUE") s += matrix[j]![t]!;
  }
  return s;
}

function sumCogsAbove(mapping: RowMapping[], i: number, t: number, matrix: number[][]): number {
  let s = 0;
  for (let j = 0; j < i; j++) {
    if (canon(mapping, j) === "COGS") s += matrix[j]![t]!;
  }
  return s;
}

function setGp(mapping: RowMapping[], i: number, t: number, matrix: number[][]): void {
  matrix[i]![t] = sumRevenueAbove(mapping, i, t, matrix) - sumCogsAbove(mapping, i, t, matrix);
}

function setTotalOpex(mapping: RowMapping[], i: number, t: number, matrix: number[][]): void {
  matrix[i]![t] = sumOpexDetailInWindow(mapping, i, t, matrix);
}

/** GP row value if it exists above i; else revenue − COGS from detail lines. */
function gpScalar(mapping: RowMapping[], i: number, t: number, matrix: number[][]): number | null {
  const gpIdx = lastIndexLt(mapping, i, "GROSS_PROFIT");
  if (gpIdx >= 0) return matrix[gpIdx]![t]!;
  const rev = sumRevenueAbove(mapping, i, t, matrix);
  const cg = sumCogsAbove(mapping, i, t, matrix);
  if (rev === 0 && cg === 0) return null;
  return rev - cg;
}

/** Total opex row above i if it lies after the last GP (or after COGS if no GP); else sum of opex detail in window. */
function totalOpexScalar(mapping: RowMapping[], i: number, t: number, matrix: number[][]): number {
  const gpIdx = lastIndexLt(mapping, i, "GROSS_PROFIT");
  const toxIdx = lastIndexLt(mapping, i, "TOTAL_OPEX");
  if (toxIdx >= 0 && (gpIdx < 0 || toxIdx > gpIdx)) {
    return matrix[toxIdx]![t]!;
  }
  return sumOpexDetailInWindow(mapping, i, t, matrix);
}

function setEbitda(mapping: RowMapping[], i: number, t: number, matrix: number[][]): void {
  const gp = gpScalar(mapping, i, t, matrix);
  if (gp == null) return;
  const ox = totalOpexScalar(mapping, i, t, matrix);
  matrix[i]![t] = gp - ox;
}

function setEbit(mapping: RowMapping[], i: number, t: number, matrix: number[][]): void {
  const ebitdaIdx = lastIndexLt(mapping, i, "EBITDA");
  if (ebitdaIdx >= 0) {
    const daIdx = lastIndexBetween(mapping, ebitdaIdx, i, "DEPRECIATION");
    let v = matrix[ebitdaIdx]![t]!;
    if (daIdx >= 0) v -= matrix[daIdx]![t]!;
    matrix[i]![t] = v;
    return;
  }
  const gp = gpScalar(mapping, i, t, matrix);
  if (gp == null) return;
  const ox = totalOpexScalar(mapping, i, t, matrix);
  let v = gp - ox;
  const toxIdx = lastIndexLt(mapping, i, "TOTAL_OPEX");
  const depIdx = lastIndexLt(mapping, i, "DEPRECIATION");
  if (toxIdx >= 0 && depIdx > toxIdx && depIdx < i) v -= matrix[depIdx]![t]!;
  else if (toxIdx < 0 && depIdx >= 0 && depIdx < i) v -= matrix[depIdx]![t]!;
  matrix[i]![t] = v;
}

function setNpbt(mapping: RowMapping[], i: number, t: number, matrix: number[][]): void {
  const ebitIdx = lastIndexLt(mapping, i, "EBIT");
  if (ebitIdx < 0) return;
  let v = matrix[ebitIdx]![t]!;
  for (let j = ebitIdx + 1; j < i; j++) {
    const id = canon(mapping, j);
    if (id === "INTEREST") v -= matrix[j]![t]!;
    if (id === "OTHER_INCOME") v += matrix[j]![t]!;
  }
  matrix[i]![t] = v;
}

function setNpat(mapping: RowMapping[], i: number, t: number, matrix: number[][]): void {
  const npbtIdx = lastIndexLt(mapping, i, "NPBT");
  if (npbtIdx < 0) return;
  let v = matrix[npbtIdx]![t]!;
  for (let j = npbtIdx + 1; j < i; j++) {
    if (canon(mapping, j) === "INCOME_TAX") v -= matrix[j]![t]!;
  }
  matrix[i]![t] = v;
}

const NPBT_TAX_RATE_EPS = 1e-6;

/**
 * After macro rollups, NPBT on the adjusted matrix can move while tax stayed at spreadsheet deltas.
 * Rescale adjusted income tax using the effective rate implied by baseline NPBT vs baseline tax
 * (constant statutory rate per period MVP). If baseline NPBT is ~0, keep adjusted tax at baseline tax.
 */
function setAdjustedIncomeTaxFromNpbtRate(
  mapping: RowMapping[],
  taxRow: number,
  t: number,
  baseline: number[][],
  adjusted: number[][],
): void {
  const npbtIdx = lastIndexLt(mapping, taxRow, "NPBT");
  if (npbtIdx < 0) return;
  const npbtB = baseline[npbtIdx]![t]!;
  if (Math.abs(npbtB) > NPBT_TAX_RATE_EPS) {
    const rate = baseline[taxRow]![t]! / npbtB;
    adjusted[taxRow]![t] = adjusted[npbtIdx]![t]! * rate;
  } else {
    adjusted[taxRow]![t] = baseline[taxRow]![t]!;
  }
}

const RECALC_NOTE =
  "Subtotal recomputed from mapped detail lines above (macro drivers applied to components only; this row is not independently overlaid).";

/**
 * Overwrite baseline/adjusted for presentation / subtotal rows so totals roll up from detail lines.
 * Runs in phases so upstream subtotals exist before downstream (e.g. Total OpEx before EBITDA).
 */
export function recalculatePresentationTotals(
  grid: ParsedGrid,
  mapping: RowMapping[],
  baseline: number[][],
  adjusted: number[][],
): Set<number> {
  const touched = new Set<number>();
  const nR = baseline.length;
  const nP = grid.periodLabels.length;

  const runPhase = (ids: Set<string>, fn: (i: number, t: number, m: number[][]) => void) => {
    for (let i = 0; i < nR; i++) {
      if (!ids.has(canon(mapping, i))) continue;
      for (let t = 0; t < nP; t++) {
        fn(i, t, baseline);
        fn(i, t, adjusted);
      }
      touched.add(i);
    }
  };

  runPhase(new Set(["GROSS_PROFIT"]), (i, t, m) => setGp(mapping, i, t, m));
  runPhase(new Set(["TOTAL_OPEX"]), (i, t, m) => setTotalOpex(mapping, i, t, m));
  runPhase(new Set(["EBITDA"]), (i, t, m) => setEbitda(mapping, i, t, m));
  runPhase(new Set(["EBIT"]), (i, t, m) => setEbit(mapping, i, t, m));
  runPhase(new Set(["NPBT"]), (i, t, m) => setNpbt(mapping, i, t, m));

  for (let i = 0; i < nR; i++) {
    if (canon(mapping, i) !== "INCOME_TAX") continue;
    for (let t = 0; t < nP; t++) {
      setAdjustedIncomeTaxFromNpbtRate(mapping, i, t, baseline, adjusted);
    }
    touched.add(i);
  }

  runPhase(new Set(["NPAT"]), (i, t, m) => setNpat(mapping, i, t, m));

  return touched;
}

export function recalculatedRowNote(): string {
  return RECALC_NOTE;
}

export function isRollupCanonicalId(id: string): boolean {
  return ROLLUP_IDS.has(id);
}
