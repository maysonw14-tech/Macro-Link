import { MACRO_DRIVERS, type MacroDriverId } from "../macro/registry";
import { materialDriverFinancialSummary } from "./materialDriverNarrative";
import { benchmarkComparisonNote, ATO_BENCHMARK_DISCLOSURE, getAtoBenchmarkRows } from "./atoBenchmarkReference";
import { computeIndustryBenchmarkUserPcts } from "./industryBenchmarkMetrics";
import { driverSnapshotSnippet } from "./macroDriverSnapshot";
import { INDUSTRY_PASS_THROUGH_RISK_BULLET } from "./industryDriverScaling";
import type { OverlayResult, ParsedGrid, RowMapping, SessionAnswers } from "../types";

const STALE_DAYS = 45;
const PAYROLL_SHARE_THRESHOLD = 0.35;
const RETAIL_SHARE_THRESHOLD = 0.35;

export interface TopMaterialDriver {
  driverId: string;
  label: string;
  approxImpact: number;
  summary: string;
}

export interface BenchmarkRow {
  metricName: string;
  userValuePct: number | null;
  benchmarkPct: number;
  /** Your % minus benchmark % (percentage points). */
  variancePct: number | null;
  /** For variance vs benchmark: higher user % is better (e.g. margin) or lower is better (e.g. cost %). */
  higherIsBetter: boolean;
  comparisonNote: string;
}

export interface ReportNarrative {
  topMaterialDrivers: TopMaterialDriver[];
  financialRisksAndLimitations: string[];
  financialRecommendations: string[];
  industryBenchmarkSummary: {
    disclosure: string;
    rows: BenchmarkRow[];
  };
}

function plainMaterialDriverSummary(input: {
  driverId: MacroDriverId;
  label: string;
  overlay: OverlayResult;
}): string {
  const { driverId, label, overlay } = input;
  const story = materialDriverFinancialSummary(driverId);
  const snap = driverSnapshotSnippet(
    driverId,
    overlay.macroAligned,
    overlay.periodLabels,
    overlay.macroSnapshotIso,
  );
  return snap ? `${label}: ${snap}. ${story}` : `${label}: ${story}`;
}

const REC_PAD = [
  "Sense-check margins and cash against management accounts.",
  "Reconcile any material unmapped lines before external or board use.",
  "Ensure the macro cache reflects major ABS releases when the horizon is material to decisions.",
];

export function buildReportNarrative(input: {
  overlay: OverlayResult;
  mapping: RowMapping[];
  grid: ParsedGrid;
  answers: SessionAnswers;
  macroFetchedAt: Date | null;
}): ReportNarrative {
  const { overlay, mapping, answers, macroFetchedAt, grid } = input;

  const drivers = MACRO_DRIVERS.map((d) => {
    const approx = overlay.driverBridgeApprox[d.id] ?? 0;
    return { driverId: d.id, label: d.label, approxImpact: approx };
  }).sort((a, b) => Math.abs(b.approxImpact) - Math.abs(a.approxImpact));

  const significant = drivers.filter((d) => Math.abs(d.approxImpact) > 1e-6).slice(0, 3);
  const topMaterialDrivers: TopMaterialDriver[] =
    significant.length > 0
      ? significant.map((d) => ({
          driverId: d.driverId,
          label: d.label,
          approxImpact: d.approxImpact,
          summary: plainMaterialDriverSummary({
            driverId: d.driverId as MacroDriverId,
            label: d.label,
            overlay,
          }),
        }))
      : [
          {
            driverId: "NONE",
            label: "—",
            approxImpact: 0,
            summary:
              "Macro series were flat or unchanged in the cache over your months, so nothing material was passed through to mapped lines.",
          },
        ];

  const financialRisksAndLimitations: string[] = [];
  if (!macroFetchedAt) {
    financialRisksAndLimitations.push(
      "We don’t know when macro was last saved — overlays may not match the ABS/RBA data you expect until the macro cache is refreshed on the server.",
    );
  } else {
    const ageDays = (Date.now() - macroFetchedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > STALE_DAYS) {
      financialRisksAndLimitations.push(
        `Macro snapshot is about ${Math.round(ageDays)} days old — dollar impacts can be stale versus the latest releases.`,
      );
    }
  }
  financialRisksAndLimitations.push(
    "Macro pass-through replays the latest published annual change on each cached index as the same per-period shock on every month in your file (full chart β and industry scaling apply) — scenario overlay only; extreme inputs can produce large dollar swings.",
  );
  financialRisksAndLimitations.push(INDUSTRY_PASS_THROUGH_RISK_BULLET);
  if (mapping.some((m) => m.confidence < 0.45 && m.canonicalId !== "UNMAPPED")) {
    financialRisksAndLimitations.push(
      "Some mapped rows are low-confidence; unmapped rows stay on your baseline, so group totals can understate true macro sensitivity.",
    );
  }
  if (answers.baseIncludesInflation) {
    financialRisksAndLimitations.push(
      "You said the base already includes inflation — sensitivities (β) are scaled down here, so dollar moves are scenario-only, not a second full pass of inflation.",
    );
  }
  financialRisksAndLimitations.push(
    "Ratios and the benchmark table follow your upload and mapping — bad mapping or layout flows straight into comparability.",
  );

  const rawRecs: string[] = [];
  const wpiShare =
    Math.abs(overlay.driverBridgeApprox["WPI"] ?? 0) /
    (Object.values(overlay.driverBridgeApprox).reduce((s, v) => s + Math.abs(v), 0) || 1);
  if (wpiShare > PAYROLL_SHARE_THRESHOLD) {
    rawRecs.push(
      "Payroll-linked drivers explain a large share of the bridge — revisit wage growth and roster assumptions outside this tool.",
    );
  }
  const retailShare =
    Math.abs(overlay.driverBridgeApprox["RETAIL_TURNOVER_INDEX"] ?? 0) /
    (Object.values(overlay.driverBridgeApprox).reduce((s, v) => s + Math.abs(v), 0) || 1);
  if (retailShare > RETAIL_SHARE_THRESHOLD) {
    rawRecs.push(
      "Revenue is sensitive to the retail turnover proxy — consider an explicit downside case if consumer spending weakens.",
    );
  }
  if (mapping.some((m) => m.canonicalId === "UNMAPPED")) {
    rawRecs.push("Map remaining rows or accept that unmapped lines do not reflect macro movements.");
  }
  if (rawRecs.length === 0) {
    rawRecs.push("Review mapped categories and rerun after refreshing macro data following major ABS releases.");
  }

  let financialRecommendations = rawRecs.slice(0, 3);
  let padI = 0;
  while (financialRecommendations.length < 2) {
    financialRecommendations.push(REC_PAD[padI % REC_PAD.length]!);
    padI++;
  }
  financialRecommendations = financialRecommendations.slice(0, 3);

  const userPcts = computeIndustryBenchmarkUserPcts(overlay.adjusted, mapping, grid.rowLabels);
  const benchDefs = getAtoBenchmarkRows(answers.industrySegment);
  const userValues = [
    userPcts.grossMarginPct,
    userPcts.payrollPctOfSales,
    userPcts.otherOpexPctOfSales,
    userPcts.ebitdaMarginPct,
  ];
  const rows: BenchmarkRow[] = benchDefs.map((def, i) => {
    const u = userValues[i]!;
    const variancePct =
      u != null && Number.isFinite(u) ? u - def.benchmarkPct : null;
    return {
      metricName: def.metricName,
      userValuePct: u,
      benchmarkPct: def.benchmarkPct,
      variancePct,
      higherIsBetter: def.higherIsBetter,
      comparisonNote: benchmarkComparisonNote(u, def.benchmarkPct, def.higherIsBetter),
    };
  });

  return {
    topMaterialDrivers,
    financialRisksAndLimitations,
    financialRecommendations,
    industryBenchmarkSummary: {
      disclosure: ATO_BENCHMARK_DISCLOSURE,
      rows,
    },
  };
}
