import type { RowMapping } from "../types";
import { augmentMappingForRollup } from "./rollupMappingInference";
import { revenueSumAboveExclusive } from "./revenueRollupForGp";

/**
 * Sums one matrix row, or all rows mapped to a canonical id (same row order as overlay).
 */
function sumForCanonical(matrix: number[][], mapping: RowMapping[], canonicalId: string): number {
  let s = 0;
  for (const m of mapping) {
    if (m.canonicalId === canonicalId) {
      s += matrix[m.rowIndex]!.reduce((a, b) => a + b, 0);
    }
  }
  return s;
}

function firstRowIndexForCanonical(mapping: RowMapping[], canonicalId: string): number | null {
  const hit = mapping.find((m) => m.canonicalId === canonicalId);
  return hit != null ? hit.rowIndex : null;
}

export interface IndustryBenchmarkUserPcts {
  grossMarginPct: number | null;
  payrollPctOfSales: number | null;
  otherOpexPctOfSales: number | null;
  ebitdaMarginPct: number | null;
}

/**
 * Four KPIs on **adjusted** (post-overlay) values, using mapped canonical lines only.
 * Returns null when the denominator (total sales) is not positive.
 * When `rowLabels` is set and a Gross profit row exists, revenue totals match gross-profit rollups
 * (e.g. one “Total revenue” line instead of summing every Revenue-mapped row).
 */
export function computeIndustryBenchmarkUserPcts(
  adjusted: number[][],
  mapping: RowMapping[],
  rowLabels?: string[],
): IndustryBenchmarkUserPcts {
  const rollupMapping =
    rowLabels && rowLabels.length ? augmentMappingForRollup(mapping, rowLabels) : mapping;
  const gpIdx = firstRowIndexForCanonical(rollupMapping, "GROSS_PROFIT");
  const nP = adjusted[0]?.length ?? 0;

  let rev: number;
  if (gpIdx != null && rowLabels && rowLabels.length > 0) {
    rev = 0;
    for (let t = 0; t < nP; t++) {
      rev += revenueSumAboveExclusive(rollupMapping, gpIdx, t, adjusted, rowLabels);
    }
  } else {
    rev = sumForCanonical(adjusted, mapping, "REVENUE");
  }
  if (rev <= 0) {
    return {
      grossMarginPct: null,
      payrollPctOfSales: null,
      otherOpexPctOfSales: null,
      ebitdaMarginPct: null,
    };
  }

  const cogs = sumForCanonical(adjusted, mapping, "COGS");
  const otherIncome = sumForCanonical(adjusted, mapping, "OTHER_INCOME");
  const payroll = sumForCanonical(adjusted, mapping, "PAYROLL");
  const rent = sumForCanonical(adjusted, mapping, "RENT");
  const marketing = sumForCanonical(adjusted, mapping, "MARKETING");
  const utilities = sumForCanonical(adjusted, mapping, "UTILITIES");
  const otherOpex = sumForCanonical(adjusted, mapping, "OTHER_OPEX");
  const ebitdaMapped = sumForCanonical(adjusted, mapping, "EBITDA");
  const gpRollup = sumForCanonical(adjusted, mapping, "GROSS_PROFIT");
  const toxRollup = sumForCanonical(adjusted, mapping, "TOTAL_OPEX");
  const opexDetail = payroll + rent + marketing + utilities + otherOpex;

  const hasGpRow = mapping.some((m) => m.canonicalId === "GROSS_PROFIT");
  const grossProfitDollars =
    hasGpRow && Math.abs(gpRollup) > 1e-6 ? gpRollup : rev + otherIncome - cogs;

  const hasToxRow = mapping.some((m) => m.canonicalId === "TOTAL_OPEX");
  const operatingOpexDollars =
    hasToxRow && Math.abs(toxRollup) > 1e-6 ? toxRollup : opexDetail;

  const hasEbitdaRow = mapping.some((m) => m.canonicalId === "EBITDA");
  const derivedEbitda = grossProfitDollars - operatingOpexDollars;
  let ebitdaDollars = ebitdaMapped;
  if (!hasEbitdaRow) {
    ebitdaDollars = derivedEbitda;
  } else if (Math.abs(ebitdaMapped) < 1e-6 && Math.abs(derivedEbitda) > 1e-3) {
    ebitdaDollars = derivedEbitda;
  }

  const salesForMargin = rev + otherIncome;
  const grossMarginPct =
    Math.abs(salesForMargin) > 1e-9
      ? ((salesForMargin - cogs) / salesForMargin) * 100
      : ((rev - cogs) / rev) * 100;
  const payrollPctOfSales = (payroll / rev) * 100;
  const otherOpexPctOfSales = ((rent + marketing + utilities + otherOpex) / rev) * 100;
  const ebitdaMarginPct = (ebitdaDollars / rev) * 100;

  return {
    grossMarginPct,
    payrollPctOfSales,
    otherOpexPctOfSales,
    ebitdaMarginPct,
  };
}
