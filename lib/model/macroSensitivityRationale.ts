import { MACRO_DRIVERS } from "../macro/registry";

const TOTAL_DELTA_EPS = 1e-6;
const BASELINE_EPS = 1e-6;

const COST_IDS = new Set([
  "COGS",
  "PAYROLL",
  "RENT",
  "MARKETING",
  "UTILITIES",
  "OTHER_OPEX",
  "DEPRECIATION",
  "INTEREST",
]);

const REVENUE_IDS = new Set(["REVENUE", "OTHER_INCOME"]);

function driverLabel(id: string): string {
  return MACRO_DRIVERS.find((d) => d.id === id)?.label ?? id;
}

/** |Δ| / |baseline row total| as a percentage — macro overlay depth on this line. */
export function macroImpactPctOfBaseline(totalDelta: number, totalBaseline: number): number {
  return (Math.abs(totalDelta) / Math.max(Math.abs(totalBaseline), BASELINE_EPS)) * 100;
}

/** Human-readable % of baseline affected (avoids one-size-fits-all “<0.1%” for every row). */
export function formatMacroImpactPct(impactPct: number): string {
  if (!Number.isFinite(impactPct) || impactPct === 0) return "0.0";
  if (impactPct >= 10) return impactPct.toFixed(1);
  if (impactPct >= 1) return impactPct.toFixed(1);
  if (impactPct >= 0.1) return impactPct.toFixed(2);
  return impactPct.toFixed(3);
}

function linkStrengthLabel(totalDelta: number, totalBaseline: number): string {
  const r = Math.abs(totalDelta) / Math.max(Math.abs(totalBaseline), BASELINE_EPS);
  if (r >= 0.02) return "strong";
  if (r >= 0.002) return "moderate";
  return "weak";
}

/** Row total overlay as % of |baseline row total| (signed). */
export function rowPctVsBaseline(totalDelta: number, totalBaseline: number): number {
  const denom = Math.max(Math.abs(totalBaseline), BASELINE_EPS);
  return (totalDelta / denom) * 100;
}

/** Better / worse for the business at this line, or null for neutral wording. */
function betterWorseLabel(totalDelta: number, canonicalId: string): "better" | "worse" | null {
  if (Math.abs(totalDelta) <= TOTAL_DELTA_EPS) return null;
  const up = totalDelta > 0;
  if (REVENUE_IDS.has(canonicalId)) return up ? "better" : "worse";
  if (COST_IDS.has(canonicalId)) return up ? "worse" : "better";
  return null;
}

function upDown(totalDelta: number): "higher" | "lower" {
  return totalDelta > 0 ? "higher" : "lower";
}

function impactPhrase(
  totalDelta: number,
  totalBaseline: number,
  variant: "rollup" | "tax" | "leaf",
): string {
  const pct = formatMacroImpactPct(macroImpactPctOfBaseline(totalDelta, totalBaseline));
  if (variant === "rollup") return `~${pct}% vs baseline (subtotal)`;
  if (variant === "tax") return `~${pct}% vs baseline (tax line)`;
  const link = linkStrengthLabel(totalDelta, totalBaseline);
  return `~${pct}% of baseline (${link} macro link)`;
}

/**
 * Short rationale: outcome + dominant driver; link strength only on leaf revenue/cost lines.
 * (No macro index “as at / data cached” snippet here — that stays on Top 3 drivers only.)
 */
export function shortEconomicRationale(input: {
  canonicalId: string;
  canonicalLabel: string;
  dominantDriverId: string | null;
  totalDelta: number;
  totalBaseline: number;
  isRollup: boolean;
  isIncomeTax: boolean;
}): string {
  const { canonicalId, dominantDriverId, totalDelta, totalBaseline, isRollup, isIncomeTax, canonicalLabel } =
    input;

  if (canonicalId === "UNMAPPED") return "";
  if (Math.abs(totalDelta) <= TOTAL_DELTA_EPS) return "";

  const bw = betterWorseLabel(totalDelta, canonicalId);
  const favourable =
    bw === "better" ? "Favourable" : bw === "worse" ? "Unfavourable" : "Net move";

  if (isIncomeTax) {
    const dir = upDown(totalDelta);
    return `Income tax ${dir}; ${impactPhrase(totalDelta, totalBaseline, "tax")}.`;
  }

  if (isRollup) {
    const dir = totalDelta > 0 ? "up" : "down";
    return `${canonicalLabel} ${dir}; ${impactPhrase(totalDelta, totalBaseline, "rollup")}.`;
  }

  const driver = dominantDriverId ? driverLabel(dominantDriverId) : null;
  if (driver) {
    return `${favourable} due to ${driver}; ${impactPhrase(totalDelta, totalBaseline, "leaf")}.`;
  }
  return `${favourable}; ${impactPhrase(totalDelta, totalBaseline, "leaf")}.`;
}
