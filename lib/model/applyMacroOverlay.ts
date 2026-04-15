import {
  MACRO_FORWARD_PATH_DISCLOSURE,
  MACRO_MOM_CAP,
  momGrowthSeries,
} from "../macro/alignment";
import type { MacroAligned } from "../macro/alignment";
import { ALL_DRIVER_IDS, type MacroDriverId } from "../macro/registry";
import { normalizePeriodLabels } from "../periods";
import { getCanonicalById } from "../retailChart";
import type { LineExplanation, OverlayResult, ParsedGrid, RowMapping, SessionAnswers } from "../types";
import {
  industryDriverMultiplier,
  industryPassThroughForwardClause,
} from "./industryDriverScaling";
import { normalizePlExpenseSigns } from "./normalizePlExpenseSigns";
import {
  augmentMappingForRollup,
  collectRollupInferenceWarnings,
} from "./rollupMappingInference";
import { collectCogsBelowGpWarnings, collectRevenueLayoutWarnings } from "./revenueRollupForGp";
import { isRollupCanonicalId, recalculatePresentationTotals } from "./recalculatePresentationTotals";
import { shortEconomicRationale } from "./macroSensitivityRationale";

const MOM_CAP = MACRO_MOM_CAP;

function applyBetaScale(baseIncludesInflation: boolean): number {
  return baseIncludesInflation ? 0.55 : 1;
}

/** First-order row bridge per driver; pick largest |signed sum| (same terms as global driverBridgeApprox). */
function dominantDriverIdForRow(input: {
  baselineRow: number[];
  drivers: { driverId: MacroDriverId; beta: number }[];
  driverMom: Record<MacroDriverId, number[]>;
  betaScale: number;
  industrySegment: SessionAnswers["industrySegment"];
  nP: number;
}): MacroDriverId | null {
  const { baselineRow, drivers, driverMom, betaScale, industrySegment, nP } = input;
  if (!drivers.length) return null;
  let best: MacroDriverId | null = null;
  let bestMag = 0;
  for (const d of drivers) {
    const mom = driverMom[d.driverId] ?? [];
    const ind = industryDriverMultiplier(industrySegment, d.driverId);
    let s = 0;
    for (let t = 0; t < nP; t++) {
      s += baselineRow[t]! * d.beta * ind * betaScale * (mom[t] ?? 0);
    }
    const mag = Math.abs(s);
    if (mag > bestMag) {
      bestMag = mag;
      best = d.driverId;
    }
  }
  return bestMag > 1e-12 ? best : null;
}

/**
 * Multiplicative overlay: adjusted = baseline * Π_d (1 + beta_d * mom_d[t]).
 * Driver bridge uses first-order approx sum baseline * beta * mom per row/period/driver.
 */
export function applyMacroOverlay(input: {
  grid: ParsedGrid;
  mapping: RowMapping[];
  aligned: MacroAligned;
  answers: SessionAnswers;
  macroSnapshotIso: string | null;
  /** When set (production), constant monthly `mom` per driver from latest YoY on macro cache. When omitted (tests), use MoM from aligned levels. */
  uniformMonthlyMom?: Record<MacroDriverId, number>;
}): OverlayResult {
  const { grid, mapping, aligned, answers, macroSnapshotIso, uniformMonthlyMom } = input;
  normalizePeriodLabels(grid.periodLabels);
  const nR = grid.rowLabels.length;
  const nP = grid.periodLabels.length;

  const baseline = grid.values.map((r) => [...r]);
  const adjusted = baseline.map((row) => [...row]);
  normalizePlExpenseSigns(baseline, mapping);
  normalizePlExpenseSigns(adjusted, mapping);
  const driverMom: Record<MacroDriverId, number[]> = {} as Record<MacroDriverId, number[]>;
  if (uniformMonthlyMom) {
    for (const id of ALL_DRIVER_IDS) {
      const g = uniformMonthlyMom[id] ?? 0;
      driverMom[id] = Array.from({ length: nP }, () => g);
    }
  } else {
    (Object.keys(aligned) as MacroDriverId[]).forEach((id) => {
      driverMom[id] = momGrowthSeries(aligned[id]!, MACRO_MOM_CAP);
    });
  }

  const betaScale = applyBetaScale(answers.baseIncludesInflation);
  const driverBridgeApprox: Record<string, number> = {};
  const segment = answers.industrySegment;

  for (let i = 0; i < nR; i++) {
    const map = mapping.find((m) => m.rowIndex === i);
    const canonicalId = map?.canonicalId ?? "UNMAPPED";
    const canonical = getCanonicalById(canonicalId);

    for (let t = 0; t < nP; t++) {
      if (isRollupCanonicalId(canonicalId)) {
        adjusted[i]![t] = baseline[i]![t]!;
        continue;
      }
      let mult = 1;
      if (canonical && canonical.drivers.length) {
        for (const d of canonical.drivers) {
          const mom = driverMom[d.driverId]?.[t] ?? 0;
          const ind = industryDriverMultiplier(segment, d.driverId);
          const eff = d.beta * ind * betaScale * mom;
          // Numeric floor only so 1+eff stays positive (no economic cap on pass-through).
          const safeEff = Number.isFinite(eff) ? Math.max(eff, -0.999) : 0;
          mult *= 1 + safeEff;
          const approx = baseline[i]![t]! * d.beta * ind * betaScale * mom;
          driverBridgeApprox[d.driverId] = (driverBridgeApprox[d.driverId] ?? 0) + approx;
        }
      }
      adjusted[i]![t] = baseline[i]![t]! * mult;
    }
  }

  const rollupMapping = augmentMappingForRollup(mapping, grid.rowLabels);
  recalculatePresentationTotals(grid, rollupMapping, baseline, adjusted);

  const layoutWarnings = [
    ...collectRollupInferenceWarnings(mapping, rollupMapping, grid.rowLabels),
    ...collectRevenueLayoutWarnings(rollupMapping, nR, nP, baseline, grid.rowLabels),
    ...collectCogsBelowGpWarnings(rollupMapping, nR, nP, baseline),
  ];

  const delta = adjusted.map((row, i) => row.map((v, t) => v - baseline[i]![t]!));

  const explanations: LineExplanation[] = [];
  for (let i = 0; i < nR; i++) {
    const map = mapping.find((m) => m.rowIndex === i);
    const canonicalId = map?.canonicalId ?? "UNMAPPED";
    const canonical = getCanonicalById(canonicalId);
    const lowMappingConfidence = (map?.confidence ?? 0) < 0.45 && canonicalId !== "UNMAPPED";

    const totalDelta = delta[i]!.reduce((s, v) => s + v, 0);
    const totalBaseline = baseline[i]!.reduce((s, v) => s + v, 0);

    let rationale = "";
    if (canonicalId === "UNMAPPED") {
      rationale = "";
    } else if (Math.abs(totalDelta) <= 1e-6) {
      rationale = "";
    } else if (canonicalId === "INCOME_TAX" && canonical) {
      rationale = shortEconomicRationale({
        canonicalId,
        canonicalLabel: canonical.label,
        dominantDriverId: null,
        totalDelta,
        totalBaseline,
        isRollup: false,
        isIncomeTax: true,
      });
    } else if (isRollupCanonicalId(canonicalId) && canonical) {
      rationale = shortEconomicRationale({
        canonicalId,
        canonicalLabel: canonical.label,
        dominantDriverId: null,
        totalDelta,
        totalBaseline,
        isRollup: true,
        isIncomeTax: false,
      });
    } else if (canonical?.drivers.length) {
      const dominantDriverId = dominantDriverIdForRow({
        baselineRow: baseline[i]!,
        drivers: canonical.drivers,
        driverMom,
        betaScale,
        industrySegment: segment,
        nP,
      });
      rationale = shortEconomicRationale({
        canonicalId,
        canonicalLabel: canonical.label,
        dominantDriverId,
        totalDelta,
        totalBaseline,
        isRollup: false,
        isIncomeTax: false,
      });
    }

    explanations.push({
      rowIndex: i,
      rowLabel: grid.rowLabels[i]!,
      canonicalId,
      rationale,
      driversDetail: canonical?.drivers.map((d) => d.driverId) ?? [],
      lowMappingConfidence,
    });
  }

  return {
    periodLabels: grid.periodLabels,
    baseline,
    adjusted,
    delta,
    explanations,
    driverBridgeApprox,
    macroAligned: aligned,
    macroSnapshotIso,
    forwardRule: `Latest YoY (or MoM-annualised fallback) on each cached macro index is applied as the same per-period shock on every forecast month on your upload (full chart β × industry × inflation scale × that rate, compounded across drivers per period; only a numeric floor prevents non-positive multipliers). β scaled by ${betaScale}× (base includes inflation = ${answers.baseIncludesInflation}). ${industryPassThroughForwardClause(segment)} ${MACRO_FORWARD_PATH_DISCLOSURE}`,
    layoutWarnings: layoutWarnings.length ? [...new Set(layoutWarnings)] : undefined,
  };
}
