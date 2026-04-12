"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { humanizeWarning, isInformationalWarning } from "./parseMessages";
import { readJsonResponse } from "@/lib/readJsonResponse";
import type { ParseMeta } from "@/lib/types";
import { LayoutReview } from "./LayoutReview";

export function UploadForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    parseMeta: ParseMeta;
    rowCount: number;
    periodCount: number;
    showLayoutReview: boolean;
  } | null>(null);

  const { infoMsgs, headsUpMsgs } = useMemo(() => {
    if (!summary?.parseMeta.warnings.length) return { infoMsgs: [] as string[], headsUpMsgs: [] as string[] };
    const info: string[] = [];
    const headsUp: string[] = [];
    for (const w of summary.parseMeta.warnings) {
      const line = humanizeWarning(w);
      if (isInformationalWarning(w)) info.push(line);
      else headsUp.push(line);
    }
    return { infoMsgs: info, headsUpMsgs: headsUp };
  }, [summary]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const j = await readJsonResponse<Record<string, unknown>>(res);
      if (!res.ok) {
        const base = typeof j.error === "string" ? j.error : "Upload failed";
        const hint = typeof j.hint === "string" ? ` ${j.hint}` : "";
        throw new Error(base + hint);
      }
      setSummary({
        parseMeta: j.parseMeta as ParseMeta,
        rowCount: j.rowCount as number,
        periodCount: j.periodCount as number,
        showLayoutReview: Boolean(j.showLayoutReview),
      });
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!summary ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="text-sm font-medium">Spreadsheet (.xlsx or .csv)</label>
          <input
            name="file"
            type="file"
            accept=".xlsx,.xls,.csv"
            required
            className="text-sm file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1.5 dark:file:border-neutral-700 dark:file:bg-neutral-900"
          />
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            We auto-detect the P&amp;L block (header row, label column, period columns) across sheets. Blank numeric
            cells become 0. If detection looks wrong, use <strong>Advanced: fix table layout</strong> after upload.
          </p>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <button
            type="submit"
            disabled={busy}
            aria-busy={busy}
            className="inline-flex w-fit items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:focus-visible:ring-neutral-500 dark:ring-offset-neutral-950"
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-emerald-200/90 bg-emerald-50/50 p-4 dark:border-emerald-800/60 dark:bg-emerald-950/25">
          <div>
            <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">We understood your file</p>
            <p className="mt-1 text-xs text-emerald-900/90 dark:text-emerald-100/85">
              If totals or months look wrong, open <strong>Advanced: fix table layout</strong> below. Otherwise continue.
            </p>
            <p className="mt-2 text-xs">
              <Link
                href="/mapping"
                className="font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-200"
              >
                Go to account mapping
              </Link>
              <span className="text-emerald-800/80 dark:text-emerald-200/80"> — or answer questions first.</span>
            </p>
          </div>
          <ul className="text-xs text-neutral-600 dark:text-neutral-400">
            <li>Line items found: {summary.rowCount}</li>
            <li>Time periods (columns): {summary.periodCount}</li>
            <li>Match confidence: {(summary.parseMeta.confidence * 100).toFixed(0)}%</li>
            <li>Sheet used: {summary.parseMeta.sheetName}</li>
          </ul>
          {infoMsgs.length ? (
            <div className="rounded-md border border-sky-200/80 bg-sky-50/90 p-3 dark:border-sky-900/50 dark:bg-sky-950/40">
              <p className="text-xs font-medium text-sky-950 dark:text-sky-100">For your information</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-sky-900 dark:text-sky-100/95">
                {infoMsgs.map((w, i) => (
                  <li key={`i-${i}`}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {headsUpMsgs.length ? (
            <div className="rounded-md border border-amber-200/80 bg-amber-50/90 p-3 dark:border-amber-900/50 dark:bg-amber-950/40">
              <p className="text-xs font-medium text-amber-950 dark:text-amber-100">Heads-up</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-amber-950 dark:text-amber-100/95">
                {headsUpMsgs.map((w, i) => (
                  <li key={`h-${i}`}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {summary.showLayoutReview ? (
            <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
              Match confidence is modest — open “Advanced: fix table layout” if numbers look off.
            </p>
          ) : null}
          <LayoutReview
            parseMeta={summary.parseMeta}
            onReparsed={(meta) =>
              setSummary((s) => (s ? { ...s, parseMeta: meta, showLayoutReview: meta.confidence < 0.55 } : s))
            }
          />
          <button
            type="button"
            onClick={() => router.push("/questions")}
            className="w-fit rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            Continue to questions
          </button>
        </div>
      )}
    </div>
  );
}
