import type { MacroDriverId } from "../macro/registry";
import type { RetailIndustrySegment } from "../types";

/**
 * Indicative pass-through intensity by industry × macro driver (multiplies chart β before inflation scaling).
 * OTHER_RETAIL = neutral 1.00×. Values are scenario assumptions, not ABS calibration.
 */
const SCALES: Record<RetailIndustrySegment, Partial<Record<MacroDriverId, number>>> = {
  FOOD_GROCERY: {
    RETAIL_TURNOVER_INDEX: 1.08,
    CPI_ALL_GROUPS: 1.06,
    CPI_TRADABLE_GOODS: 1.14,
    WPI: 0.95,
    CPI_RENT: 1.0,
    CPI_ELECTRICITY: 1.02,
    UNEMPLOYMENT_RATE: 0.88,
    CONSUMER_CONFIDENCE: 0.92,
    RBA_CASH_RATE: 0.9,
  },
  CAFES_RESTAURANTS: {
    RETAIL_TURNOVER_INDEX: 1.12,
    CPI_ALL_GROUPS: 1.05,
    CPI_TRADABLE_GOODS: 1.06,
    WPI: 1.4,
    CPI_RENT: 1.14,
    CPI_ELECTRICITY: 1.05,
    UNEMPLOYMENT_RATE: 1.22,
    CONSUMER_CONFIDENCE: 1.2,
    RBA_CASH_RATE: 1.08,
  },
  CLOTHING_FOOTWEAR: {
    RETAIL_TURNOVER_INDEX: 1.06,
    CPI_ALL_GROUPS: 1.04,
    CPI_TRADABLE_GOODS: 1.16,
    WPI: 1.0,
    CPI_RENT: 1.08,
    CPI_ELECTRICITY: 1.0,
    UNEMPLOYMENT_RATE: 1.18,
    CONSUMER_CONFIDENCE: 1.16,
    RBA_CASH_RATE: 1.16,
  },
  HOUSEHOLD_HARDWARE: {
    RETAIL_TURNOVER_INDEX: 1.04,
    CPI_ALL_GROUPS: 1.03,
    CPI_TRADABLE_GOODS: 1.12,
    WPI: 1.0,
    CPI_RENT: 1.05,
    CPI_ELECTRICITY: 1.02,
    UNEMPLOYMENT_RATE: 1.12,
    CONSUMER_CONFIDENCE: 1.1,
    RBA_CASH_RATE: 1.22,
  },
  HEALTH_BEAUTY_PHARMACY: {
    RETAIL_TURNOVER_INDEX: 1.05,
    CPI_ALL_GROUPS: 1.06,
    CPI_TRADABLE_GOODS: 1.1,
    WPI: 1.05,
    CPI_RENT: 1.06,
    CPI_ELECTRICITY: 1.0,
    UNEMPLOYMENT_RATE: 0.92,
    CONSUMER_CONFIDENCE: 0.95,
    RBA_CASH_RATE: 0.93,
  },
  OTHER_RETAIL: {},
};

export function industryDriverMultiplier(segment: RetailIndustrySegment, driverId: MacroDriverId): number {
  const raw = SCALES[segment]?.[driverId] ?? 1;
  if (!Number.isFinite(raw)) return 1;
  return raw;
}

/** One line for UI (Questions / Results). */
export const INDUSTRY_PASS_THROUGH_UI_NOTE =
  "Your industry choice scales each macro driver’s pass-through on top of the retail chart β (OTHER_RETAIL = 1.00× everywhere; configured multipliers are not clamped). Benchmarks still use the same segment profile.";

/** Appended to overlay forwardRule for audit trail. */
export function industryPassThroughForwardClause(segment: RetailIndustrySegment): string {
  return `Industry driver scaling: ${segment} (chart β × per-driver multipliers; OTHER_RETAIL uses 1.00× on all drivers). Indicative scenario only.`;
}

/** Narrative “Financial risks” bullet (kept in sync with UI note). */
export const INDUSTRY_PASS_THROUGH_RISK_BULLET =
  "Industry-specific pass-through multipliers sit on top of retail chart β (see overlay forward rule); OTHER_RETAIL uses 1.00× on every driver — illustrative scenario assumptions, not econometrically fitted.";
