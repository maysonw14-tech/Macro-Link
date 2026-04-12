"use client";

import { Fragment, useEffect, useState } from "react";
import { Disclaimer } from "../components/Disclaimer";
import { Nav } from "../components/Nav";
import { formatAccountingInt } from "@/lib/accountingFormat";
import { MACRO_FORWARD_PATH_DISCLOSURE } from "@/lib/macro/alignment";
import { INDUSTRY_PASS_THROUGH_UI_NOTE } from "@/lib/model/industryDriverScaling";
import { RETAIL_INDUSTRY_OPTIONS } from "@/lib/retailIndustrySegments";
import { plLineDeltaFavourable } from "@/lib/model/plLineDeltaFavourable";
import type { LineExplanation, OverlayResult, SessionAnswers } from "@/lib/types";
import type { ReportNarrative } from "@/lib/model/buildReportNarrative";

function sumRow(row: number[]): number {
  return row.reduce((s, v) => s + v, 0);
}

function pctFmt(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "\u2013";
  return `${n.toFixed(1)}%`;
}

/** Signed variance vs benchmark, one decimal, % suffix (percentage-point gap shown as %). */
function pctFmtSignedVariance(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "\u2013";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

/** Null = neutral (near zero variance). */
function varianceFavourable(
  variancePct: number | null,
  higherIsBetter: boolean,
): boolean | null {
  if (variancePct == null || !Number.isFinite(variancePct)) return null;
  if (Math.abs(variancePct) < 0.05) return null;
  return higherIsBetter ? variancePct > 0 : variancePct < 0;
}

function LineBlock({
  ex,
  i,
  baseline,
  adjusted,
  delta,
}: {
  ex: LineExplanation;
  i: number;
  baseline: number[];
  adjusted: number[];
  delta: number[];
}) {
  const totalB = sumRow(baseline);
  const totalA = sumRow(adjusted);
  const totalD = sumRow(delta);

  const rationaleCell =
    "border-t border-neutral-100 bg-neutral-50/40 px-2 py-1 align-top text-[11px] leading-snug text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-400";

  const diffBg =
    "bg-sky-100/95 dark:bg-sky-950/45 border-t border-sky-200/90 dark:border-sky-900/60";

  const rationaleText =
    ex.rationale.trim().length > 0 ? ex.rationale : "\u2013";

  const plFav = plLineDeltaFavourable(ex.canonicalId, totalD);
  const diffLabelBorder =
    plFav === true
      ? "border-l-[3px] border-l-[var(--status-ok-border)] pl-1.5"
      : plFav === false
        ? "border-l-[3px] border-l-[var(--status-danger-border)] pl-1.5"
        : "";

  return (
    <Fragment key={i}>
      <tr className="border-t border-neutral-200 dark:border-neutral-800">
        <td className="border-t border-neutral-100 px-2 py-1 font-medium dark:border-neutral-800">
          <span className="text-neutral-900 dark:text-neutral-100">{ex.rowLabel}</span>
          {ex.lowMappingConfidence ? (
            <span
              className="ml-1.5 inline-flex items-center rounded border border-[var(--status-review-border)]/60 bg-[var(--status-review-bg)] px-1 py-0.5 text-[10px] font-medium text-orange-950 dark:text-orange-50"
              title="Mapping confidence for this line was below 45%. Review it on Mappings."
            >
              Low map
            </span>
          ) : null}
          <span className="ml-1 font-normal text-neutral-500 dark:text-neutral-400">· before</span>
        </td>
        {baseline.map((v, t) => (
          <td key={t} className="border-t border-neutral-100 px-2 py-1 text-right font-mono tabular-nums dark:border-neutral-800">
            {formatAccountingInt(v)}
          </td>
        ))}
        <td className="border-t border-neutral-100 px-2 py-1 text-right font-mono font-medium tabular-nums dark:border-neutral-800">
          {formatAccountingInt(totalB)}
        </td>
        <td className={`${rationaleCell} border-t border-neutral-100 dark:border-neutral-800`}>{"\u2013"}</td>
      </tr>
      <tr>
        <td className="px-2 py-1">
          <span className="text-neutral-900 dark:text-neutral-100">{ex.rowLabel}</span>
          <span className="ml-1 font-normal text-neutral-500 dark:text-neutral-400">· after</span>
        </td>
        {adjusted.map((v, t) => (
          <td key={t} className="px-2 py-1 text-right font-mono tabular-nums">
            {formatAccountingInt(v)}
          </td>
        ))}
        <td className="px-2 py-1 text-right font-mono font-medium tabular-nums">{formatAccountingInt(totalA)}</td>
        <td className={rationaleCell}>{"\u2013"}</td>
      </tr>
      <tr className={diffBg}>
        <td
          className={`px-2 py-1 text-neutral-800 dark:text-neutral-200 ${diffBg} ${diffLabelBorder}`}
        >
          <span className="font-medium text-neutral-900 dark:text-neutral-100">{ex.rowLabel}</span>
          <span className="ml-1 font-normal text-neutral-600 dark:text-neutral-400">· difference</span>
          {plFav === true ? (
            <span
              className="ml-1.5 text-green-600 dark:text-green-400"
              title="Better off under this macro scenario (row total)."
              aria-label="Better off under this macro scenario"
            >
              ▲
            </span>
          ) : plFav === false ? (
            <span
              className="ml-1.5 text-red-600 dark:text-red-400"
              title="Worse off under this macro scenario (row total)."
              aria-label="Worse off under this macro scenario"
            >
              ▼
            </span>
          ) : null}
        </td>
        {delta.map((v, t) => (
          <td
            key={t}
            className={`px-2 py-1 text-right font-mono tabular-nums text-neutral-900 dark:text-neutral-100 ${diffBg}`}
          >
            {formatAccountingInt(v)}
          </td>
        ))}
        <td
          className={`px-2 py-1 text-right font-mono font-medium tabular-nums ${diffBg} ${
            plFav === true
              ? "text-emerald-900 dark:text-emerald-200"
              : plFav === false
                ? "text-red-900 dark:text-red-200"
                : "text-neutral-900 dark:text-neutral-100"
          }`}
        >
          {formatAccountingInt(totalD)}
        </td>
        <td
          className={`${rationaleCell} min-w-[12rem] max-w-[min(28rem,45vw)] border-t-0 bg-sky-50/90 dark:bg-sky-950/35 dark:text-neutral-300`}
        >
          {rationaleText}
        </td>
      </tr>
    </Fragment>
  );
}

export default function ResultsPage() {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [overlay, setOverlay] = useState<OverlayResult | null>(null);
  const [narrative, setNarrative] = useState<ReportNarrative | null>(null);
  const [answers, setAnswers] = useState<SessionAnswers | null>(null);
  const [macroFetchedAt, setMacroFetchedAt] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setBusy(true);
      setErr(null);
      const res = await fetch("/api/compute", { method: "POST", credentials: "include" });
      const j = await res.json();
      setBusy(false);
      if (!res.ok) {
        setErr(j.error || "Compute failed");
        return;
      }
      setOverlay(j.overlay);
      setNarrative(j.narrative);
      setAnswers(j.answers ?? null);
      setMacroFetchedAt(j.macroFetchedAt ?? null);
    })();
  }, []);

  return (
    <main className="mx-auto flex max-w-[100rem] flex-col gap-6 p-6">
      <Nav />
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Macro-overlaid P&amp;L</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Each line shows <strong className="font-medium">before</strong> (baseline),{" "}
          <strong className="font-medium">after</strong> (macro-adjusted), and{" "}
          <strong className="font-medium">difference</strong> by period. The <strong className="font-medium">Total</strong>{" "}
          column sums periods only (sheet total columns are excluded from the horizon). Rationale appears on the
          difference row. {MACRO_FORWARD_PATH_DISCLOSURE} Macro snapshot:{" "}
          <span className="font-mono text-xs">{macroFetchedAt ?? "unknown"}</span>
        </p>
        {answers ? (
          <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
            <span className="font-medium text-neutral-800 dark:text-neutral-200">
              Industry for this run:{" "}
              {RETAIL_INDUSTRY_OPTIONS.find((o) => o.id === answers.industrySegment)?.label ?? answers.industrySegment}
            </span>
            . {INDUSTRY_PASS_THROUGH_UI_NOTE}
          </p>
        ) : null}
      </header>
      <Disclaimer />
      {busy ? <p className="text-sm text-neutral-600">Computing…</p> : null}
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {overlay && narrative ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/api/export"
              className="w-fit rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium dark:border-neutral-700 dark:bg-neutral-950"
            >
              Download Excel (P&amp;L + Narrative tabs)
            </a>
            <a
              href="/api/export?format=csv"
              className="w-fit rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300"
            >
              CSV — P&amp;L only
            </a>
          </div>

          <section className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-900/60">
                <tr>
                  <th className="sticky left-0 z-10 bg-neutral-50 px-2 py-2 dark:bg-neutral-900/60">Line</th>
                  {overlay.periodLabels.map((p) => (
                    <th key={p} className="whitespace-nowrap px-2 py-2 text-right">
                      {p}
                    </th>
                  ))}
                  <th className="whitespace-nowrap border-l border-neutral-200 px-2 py-2 text-right dark:border-neutral-700">
                    Total
                  </th>
                  <th className="min-w-[12rem] border-l border-neutral-200 px-2 py-2 dark:border-neutral-700">
                    Rationale
                  </th>
                </tr>
              </thead>
              <tbody>
                {overlay.explanations.map((ex, i) => (
                  <LineBlock
                    key={i}
                    ex={ex}
                    i={i}
                    baseline={overlay.baseline[i]!}
                    adjusted={overlay.adjusted[i]!}
                    delta={overlay.delta[i]!}
                  />
                ))}
              </tbody>
            </table>
          </section>

          <section className="flex flex-col gap-6">
            <div className="rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
              <h2 className="text-base font-semibold">Top 3 Material Drivers</h2>
              <ul className="mt-2 list-disc space-y-2 pl-4 text-xs text-neutral-700 dark:text-neutral-300">
                {narrative.topMaterialDrivers.map((m) => (
                  <li key={m.driverId}>{m.summary}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
              <h2 className="text-base font-semibold">Financial Risks and Limitations</h2>
              <ul className="mt-2 list-disc space-y-2 pl-4 text-xs text-neutral-700 dark:text-neutral-300">
                {narrative.financialRisksAndLimitations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
              <h2 className="text-base font-semibold">Financial Recommendations</h2>
              <ul className="mt-2 list-disc space-y-2 pl-4 text-xs text-neutral-700 dark:text-neutral-300">
                {narrative.financialRecommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
              <h2 className="text-base font-semibold">Industry Benchmark Summary</h2>
              <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                Benchmark rows use the same industry profile. Pass-through on the P&L table above is also scaled by that choice (see header note and
                forward rule at the bottom).
              </p>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                {narrative.industryBenchmarkSummary.disclosure}
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <th className="py-2 pr-4 font-medium">Metric</th>
                      <th className="py-2 pr-4 text-right font-medium">Your % (after overlay)</th>
                      <th className="py-2 pr-4 text-right font-medium">Indicative benchmark %</th>
                      <th className="py-2 pr-4 text-right font-medium">Variance (your − bench, %)</th>
                      <th className="py-2 font-medium">Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {narrative.industryBenchmarkSummary.rows.map((row) => (
                      <tr
                        key={row.metricName}
                        className="border-b border-neutral-100 dark:border-neutral-800/80"
                      >
                        <td className="py-2 pr-4 text-neutral-800 dark:text-neutral-200">{row.metricName}</td>
                        <td className="py-2 pr-4 text-right font-mono tabular-nums">{pctFmt(row.userValuePct)}</td>
                        <td className="py-2 pr-4 text-right font-mono tabular-nums">{pctFmt(row.benchmarkPct)}</td>
                        <td className="py-2 pr-4 text-right font-mono tabular-nums">
                          {row.variancePct != null && Number.isFinite(row.variancePct) ? (
                            <span className="inline-flex w-full items-center justify-end gap-1.5">
                              {(() => {
                                const fav = varianceFavourable(row.variancePct, row.higherIsBetter);
                                if (fav === true) {
                                  return (
                                    <span
                                      className="text-green-600 dark:text-green-400"
                                      title="Favourable vs benchmark"
                                      aria-label="Favourable variance"
                                    >
                                      ▲
                                    </span>
                                  );
                                }
                                if (fav === false) {
                                  return (
                                    <span
                                      className="text-red-600 dark:text-red-400"
                                      title="Unfavourable vs benchmark"
                                      aria-label="Unfavourable variance"
                                    >
                                      ▼
                                    </span>
                                  );
                                }
                                return <span className="inline-block w-[0.65em]" aria-hidden />;
                              })()}
                              <span>{pctFmtSignedVariance(row.variancePct)}</span>
                            </span>
                          ) : (
                            "\u2013"
                          )}
                        </td>
                        <td className="py-2 text-neutral-600 dark:text-neutral-400">{row.comparisonNote}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <p className="text-xs text-neutral-500">{overlay.forwardRule}</p>
        </>
      ) : null}
    </main>
  );
}
