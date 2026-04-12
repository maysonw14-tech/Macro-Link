const INCOME_IDS = new Set([
  "REVENUE",
  "GROSS_PROFIT",
  "OTHER_INCOME",
  "EBITDA",
  "EBIT",
  "NPBT",
  "NPAT",
]);

const EXPENSE_IDS = new Set([
  "COGS",
  "PAYROLL",
  "RENT",
  "MARKETING",
  "UTILITIES",
  "OTHER_OPEX",
  "TOTAL_OPEX",
  "DEPRECIATION",
  "INTEREST",
  "INCOME_TAX",
]);

const DOLLAR_NEUTRAL_EPS = 1;

/**
 * Whether the macro scenario total dollar delta for this line is favourable for the operator.
 * Row-level only (sum over periods); null when unmappable or negligible.
 */
export function plLineDeltaFavourable(canonicalId: string, totalDelta: number): boolean | null {
  if (canonicalId === "UNMAPPED") return null;
  if (!Number.isFinite(totalDelta)) return null;
  if (Math.abs(totalDelta) < DOLLAR_NEUTRAL_EPS) return null;

  if (INCOME_IDS.has(canonicalId)) return totalDelta > 0;
  if (EXPENSE_IDS.has(canonicalId)) return totalDelta < 0;
  return null;
}
