"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Disclaimer } from "../components/Disclaimer";
import { Nav } from "../components/Nav";
import { RETAIL_CANONICAL } from "@/lib/retailChart";
import type { ParseMeta, ParsedGrid, RowMapping } from "@/lib/types";

const HIGH_CONF = 0.85;
const REVIEW_MAX = 0.45;

type AttentionTier = "unmapped" | "review" | "medium" | "high";

function rowAttention(m: RowMapping): AttentionTier {
  if (m.canonicalId === "UNMAPPED") return "unmapped";
  if (m.confidence < REVIEW_MAX) return "review";
  if (m.confidence >= HIGH_CONF) return "high";
  return "medium";
}

function tierRowClass(tier: AttentionTier): string {
  switch (tier) {
    case "unmapped":
      return "border-l-4 border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]";
    case "review":
      return "border-l-4 border-[var(--status-review-border)] bg-[var(--status-review-bg)]";
    case "high":
      return "border-l-4 border-[var(--status-ok-border)] bg-[var(--status-ok-bg)]";
    case "medium":
      return "border-l-4 border-[var(--status-medium-border)]/80 bg-[var(--status-medium-bg)]";
  }
}

export default function MappingPage() {
  const router = useRouter();
  const [grid, setGrid] = useState<ParsedGrid | null>(null);
  const [parseMeta, setParseMeta] = useState<ParseMeta | null>(null);
  const [mapping, setMapping] = useState<RowMapping[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mappingReviewed, setMappingReviewed] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/session", { credentials: "include" });
      if (!res.ok) {
        setErr("No active session — upload from Home.");
        return;
      }
      const j = await res.json();
      setGrid(j.parsedGrid);
      setParseMeta(j.parseMeta ?? null);
      setMapping(j.mapping);
      setMappingReviewed(false);
    })();
  }, []);

  const attentionSummary = useMemo(() => {
    if (!mapping) return { unmapped: 0, review: 0, high: 0, medium: 0, needsAck: false };
    let unmapped = 0;
    let review = 0;
    let high = 0;
    let medium = 0;
    for (const m of mapping) {
      const t = rowAttention(m);
      if (t === "unmapped") unmapped++;
      else if (t === "review") review++;
      else if (t === "high") high++;
      else medium++;
    }
    return { unmapped, review, high, medium, needsAck: unmapped > 0 || review > 0 };
  }, [mapping]);

  const canSave =
    mapping &&
    (!attentionSummary.needsAck || mappingReviewed) &&
    !busy;

  async function save() {
    if (!mapping || !canSave) return;
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/session", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapping }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Save failed");
      return;
    }
    router.push("/results");
  }

  function setCanonical(rowIndex: number, canonicalId: string) {
    setMappingReviewed(false);
    setMapping((prev) => {
      if (!prev) return prev;
      return prev.map((m) => (m.rowIndex === rowIndex ? { ...m, canonicalId, confidence: 1 } : m));
    });
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <Nav />
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Account mapping</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Suggested categories are heuristic only (not tax or accounting advice). Review each row, especially
          those highlighted, then save.
        </p>
      </header>
      <Disclaimer />
      {parseMeta?.warnings?.length ? (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-50">
          <p className="font-medium">Parse notes</p>
          <ul className="list-disc space-y-1 pl-4">
            {parseMeta.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {grid && mapping ? (
        <>
          {attentionSummary.needsAck ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900/50">
              <span className="text-neutral-700 dark:text-neutral-300">
                {attentionSummary.unmapped > 0 ? (
                  <span className="mr-3 font-medium text-red-800 dark:text-red-200">
                    {attentionSummary.unmapped} need mapping
                  </span>
                ) : null}
                {attentionSummary.review > 0 ? (
                  <span className="font-medium text-orange-900 dark:text-orange-100">
                    {attentionSummary.review} need review (confidence under {(REVIEW_MAX * 100).toFixed(0)}%)
                  </span>
                ) : null}
              </span>
            </div>
          ) : (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              No blocking issues — rows are mapped with at least {(REVIEW_MAX * 100).toFixed(0)}% confidence. Still
              confirm each dropdown before continuing.
            </p>
          )}
          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-neutral-200 bg-neutral-50/90 px-3 py-2 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-300"
            role="note"
          >
            <span className="font-medium text-neutral-900 dark:text-neutral-100">Row colours</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[var(--status-ok-border)]" aria-hidden />
              Strong match (≥{(HIGH_CONF * 100).toFixed(0)}%)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[var(--status-medium-border)]" aria-hidden />
              Medium
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[var(--status-review-border)]" aria-hidden />
              Review
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[var(--status-danger-border)]" aria-hidden />
              Unmapped
            </span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/95">
                <tr>
                  <th className="px-3 py-2 font-medium">Uploaded label</th>
                  <th className="px-3 py-2 font-medium">Canonical</th>
                  <th className="px-3 py-2 font-medium">Confidence</th>
                  <th className="w-36 px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {grid.rowLabels.map((label, idx) => {
                  const m = mapping.find((x) => x.rowIndex === idx)!;
                  const tier = rowAttention(m);
                  const pct = Math.round(m.confidence * 100);
                  return (
                    <tr
                      key={idx}
                      className={`border-t border-neutral-100 transition-colors hover:bg-neutral-100/70 dark:border-neutral-800 dark:hover:bg-neutral-800/50 ${tierRowClass(tier)}`}
                    >
                      <td className="px-3 py-2 align-top">{label}</td>
                      <td className="px-3 py-2">
                        <select
                          className="w-full max-w-md rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-950 dark:focus-visible:ring-neutral-500 dark:ring-offset-neutral-950"
                          value={m.canonicalId}
                          onChange={(e) => setCanonical(idx, e.target.value)}
                          aria-label={`Canonical account for ${label}`}
                        >
                          {RETAIL_CANONICAL.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label} ({c.id})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex min-w-[5.5rem] items-center gap-2">
                          <div
                            className="h-1.5 flex-1 max-w-[4rem] overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
                            role="presentation"
                            aria-hidden
                          >
                            <div
                              className="h-full rounded-full bg-neutral-600 dark:bg-neutral-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-neutral-600 dark:text-neutral-400">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {tier === "unmapped" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-950 dark:bg-red-950/50 dark:text-red-50">
                            <span aria-hidden>!</span>
                            Unmapped
                          </span>
                        ) : tier === "review" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-orange-100 px-1.5 py-0.5 font-medium text-orange-950 dark:bg-orange-950/45 dark:text-orange-50">
                            <span aria-hidden>!</span>
                            Review
                          </span>
                        ) : tier === "high" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-50">
                            <span aria-hidden>✓</span>
                            Strong
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-800 dark:bg-slate-800/80 dark:text-slate-100">
                            <span aria-hidden>○</span>
                            Medium
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {attentionSummary.needsAck ? (
            <label className="flex max-w-xl cursor-pointer items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                className="mt-1"
                checked={mappingReviewed}
                onChange={(e) => setMappingReviewed(e.target.checked)}
              />
              <span>
                I have reviewed the highlighted rows and confirmed the canonical mapping for each. I
                understand suggestions are not professional tax or accounting advice.
              </span>
            </label>
          ) : null}
          <button
            type="button"
            onClick={() => void save()}
            disabled={!canSave}
            aria-busy={busy}
            className="w-fit rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:focus-visible:ring-neutral-500 dark:ring-offset-neutral-950"
          >
            {busy ? "Saving…" : "Save and view results"}
          </button>
        </>
      ) : !err ? (
        <p className="text-sm text-neutral-600">Loading…</p>
      ) : null}
    </main>
  );
}
