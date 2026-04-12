"use client";

import { readJsonResponse } from "@/lib/readJsonResponse";
import { columnLetter, columnLetterToIndex } from "@/lib/parse/columnLetters";
import type { LayoutOverrides, ParseMeta } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

interface Props {
  parseMeta: ParseMeta;
  onReparsed?: (meta: ParseMeta) => void;
}

export function LayoutReview({ parseMeta, onReparsed }: Props) {
  const [open, setOpen] = useState(parseMeta.confidence < 0.55);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const defaults = useMemo(
    () => ({
      sheetTab1: parseMeta.sheetIndex + 1,
      headerRow1: parseMeta.headerRow0Based + 1,
      labelLetters: columnLetter(parseMeta.labelCol0Based),
      firstPeriodLetters: columnLetter(parseMeta.periodColStart0Based),
      lastPeriodLetters: columnLetter(parseMeta.periodColEnd0Based),
    }),
    [parseMeta],
  );

  const [sheetTab1, setSheetTab1] = useState(defaults.sheetTab1);
  const [headerRow1, setHeaderRow1] = useState(defaults.headerRow1);
  const [labelLetters, setLabelLetters] = useState(defaults.labelLetters);
  const [firstPeriodLetters, setFirstPeriodLetters] = useState(defaults.firstPeriodLetters);
  const [lastPeriodLetters, setLastPeriodLetters] = useState(defaults.lastPeriodLetters);
  const [lastDataRow1, setLastDataRow1] = useState<string>("");

  useEffect(() => {
    setSheetTab1(defaults.sheetTab1);
    setHeaderRow1(defaults.headerRow1);
    setLabelLetters(defaults.labelLetters);
    setFirstPeriodLetters(defaults.firstPeriodLetters);
    setLastPeriodLetters(defaults.lastPeriodLetters);
    setLastDataRow1("");
  }, [defaults]);

  useEffect(() => {
    setOpen(parseMeta.confidence < 0.55);
  }, [parseMeta]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file");
    if (!file || !(file instanceof File) || file.size === 0) {
      setErr("Choose your spreadsheet again (the same file you just uploaded).");
      return;
    }

    let labelCol0Based: number;
    let firstPeriodCol0Based: number;
    let lastPeriodCol0Based: number;
    try {
      labelCol0Based = columnLetterToIndex(labelLetters);
      firstPeriodCol0Based = columnLetterToIndex(firstPeriodLetters);
      lastPeriodCol0Based = columnLetterToIndex(lastPeriodLetters);
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Check column letters (e.g. A, B, AA).");
      return;
    }

    const hr = Number(headerRow1);
    const st = Number(sheetTab1);
    const layout: LayoutOverrides = {
      sheetIndex: Math.max(0, (Number.isFinite(st) ? st : 1) - 1),
      headerRow0Based: Math.max(0, (Number.isFinite(hr) ? hr : 1) - 1),
      labelCol0Based,
      firstPeriodCol0Based,
      lastPeriodCol0Based,
      lastDataRow0Based:
        lastDataRow1 === "" || lastDataRow1 == null
          ? null
          : Math.max(0, (Number(lastDataRow1) || 1) - 1),
    };

    if (layout.lastPeriodCol0Based < layout.firstPeriodCol0Based) {
      setErr("The last period column must be the same as or to the right of the first period column in Excel.");
      return;
    }

    setBusy(true);
    try {
      const post = new FormData();
      post.set("file", file);
      post.set("layout", JSON.stringify(layout));
      const res = await fetch("/api/reparse", { method: "POST", body: post, credentials: "include" });
      const j = await readJsonResponse<Record<string, unknown>>(res);
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Reparse failed");
      onReparsed?.(j.parseMeta as ParseMeta);
      setOpen(false);
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Reparse failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium"
      >
        <span>Advanced: fix table layout</span>
        <span className="text-xs text-neutral-500">{open ? "▼" : "▶"}</span>
      </button>
      {open ? (
        <form onSubmit={onSubmit} className="space-y-3 border-t border-neutral-200 p-3 text-sm dark:border-neutral-800">
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Use the <strong>same row numbers and column letters</strong> as in Excel. Choose your file again below,
            then adjust only if the preview on the previous step looked wrong.
          </p>
          <label className="grid gap-1">
            <span className="text-xs font-medium">Which sheet tab?</span>
            <span className="text-[11px] text-neutral-500">1 = first tab, 2 = second tab, …</span>
            <input
              className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700"
              type="number"
              min={1}
              value={sheetTab1}
              onChange={(e) => setSheetTab1(Number(e.target.value))}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium">Row that has your month / period headers</span>
            <span className="text-[11px] text-neutral-500">Count from the top of the sheet (row 1 is the first row).</span>
            <input
              className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700"
              type="number"
              min={1}
              value={headerRow1}
              onChange={(e) => setHeaderRow1(Number(e.target.value))}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium">Column with account / line descriptions</span>
            <span className="text-[11px] text-neutral-500">Letter only, e.g. A or B.</span>
            <input
              className="rounded border border-neutral-300 px-2 py-1 font-mono uppercase dark:border-neutral-700"
              type="text"
              maxLength={3}
              value={labelLetters}
              onChange={(e) => setLabelLetters(e.target.value.toUpperCase())}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1">
              <span className="text-xs font-medium">First period column</span>
              <span className="text-[11px] text-neutral-500">e.g. B</span>
              <input
                className="rounded border border-neutral-300 px-2 py-1 font-mono uppercase dark:border-neutral-700"
                type="text"
                maxLength={3}
                value={firstPeriodLetters}
                onChange={(e) => setFirstPeriodLetters(e.target.value.toUpperCase())}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium">Last period column</span>
              <span className="text-[11px] text-neutral-500">e.g. N</span>
              <input
                className="rounded border border-neutral-300 px-2 py-1 font-mono uppercase dark:border-neutral-700"
                type="text"
                maxLength={3}
                value={lastPeriodLetters}
                onChange={(e) => setLastPeriodLetters(e.target.value.toUpperCase())}
              />
            </label>
          </div>
          <label className="grid gap-1">
            <span className="text-xs font-medium">Last row of data (optional)</span>
            <span className="text-[11px] text-neutral-500">Leave blank to let us find the end of the table automatically.</span>
            <input
              className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700"
              type="number"
              min={1}
              placeholder="Auto"
              value={lastDataRow1}
              onChange={(e) => setLastDataRow1(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium">Spreadsheet file</span>
            <input name="file" type="file" accept=".xlsx,.xls,.csv" required className="text-xs" />
          </label>
          {err ? <p className="text-xs text-red-600">{err}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-neutral-200 dark:text-neutral-900"
          >
            {busy ? "Applying…" : "Apply and read file again"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
