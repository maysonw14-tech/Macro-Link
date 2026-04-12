import type { RetailIndustrySegment } from "../types";

/**
 * Indicative industry-profile percentages for product comparison only.
 * Not a live ATO data feed — replace with authoritative ATO / industry tables when available.
 *
 * Metrics (same order as {@link computeIndustryBenchmarkUserPcts}):
 * 1. Gross margin % of sales
 * 2. Payroll % of sales
 * 3. Other operating expense % of sales (rent, marketing, utilities, other opex)
 * 4. EBITDA margin % of sales
 */
export const ATO_BENCHMARK_DISCLOSURE =
  "Benchmarks are simplified indicative percentages for comparison in Macro Link — not an official ATO extract. Verify against current ATO and industry publications before external use.";

type Four = [number, number, number, number];

const BENCHMARKS: Record<RetailIndustrySegment, Four> = {
  FOOD_GROCERY: [28, 12, 18, 5],
  CAFES_RESTAURANTS: [62, 32, 22, 12],
  CLOTHING_FOOTWEAR: [52, 15, 28, 8],
  HOUSEHOLD_HARDWARE: [38, 14, 24, 6],
  HEALTH_BEAUTY_PHARMACY: [35, 16, 26, 9],
  OTHER_RETAIL: [42, 17, 25, 7],
};

const METRIC_NAMES = [
  "Gross margin (% of sales)",
  "Payroll (% of sales)",
  "Other operating expenses (% of sales)",
  "EBITDA margin (% of sales)",
] as const;

/** For margins: higher user vs bench is favourable. For payroll/opex %: lower user vs bench is favourable. */
const HIGHER_IS_BETTER: readonly boolean[] = [true, false, false, true];

export function getAtoBenchmarkRows(segment: RetailIndustrySegment): {
  metricName: string;
  benchmarkPct: number;
  higherIsBetter: boolean;
}[] {
  const b = BENCHMARKS[segment];
  return METRIC_NAMES.map((metricName, i) => ({
    metricName,
    benchmarkPct: b[i]!,
    higherIsBetter: HIGHER_IS_BETTER[i]!,
  }));
}

export function benchmarkComparisonNote(
  userPct: number | null,
  benchmarkPct: number,
  higherIsBetter: boolean,
): string {
  if (userPct == null || !Number.isFinite(userPct)) return "Not computable from mapped lines (e.g. no sales total).";
  const diff = userPct - benchmarkPct;
  const tol = 2.5;
  if (Math.abs(diff) <= tol) return "Roughly in line with the indicative benchmark.";
  const favourable =
    (higherIsBetter && diff > 0) || (!higherIsBetter && diff < 0);
  return favourable ? "Favourable vs indicative benchmark." : "Less favourable vs indicative benchmark.";
}
