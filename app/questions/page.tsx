"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Disclaimer } from "../components/Disclaimer";
import { Nav } from "../components/Nav";
import { INDUSTRY_PASS_THROUGH_UI_NOTE } from "@/lib/model/industryDriverScaling";
import { RETAIL_INDUSTRY_OPTIONS } from "@/lib/retailIndustrySegments";
import type { SessionAnswers } from "@/lib/types";

export default function QuestionsPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<SessionAnswers | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/session", { credentials: "include" });
      if (!res.ok) {
        setErr("No active session — upload a spreadsheet from Home.");
        return;
      }
      const j = await res.json();
      setAnswers(j.answers);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!answers) return;
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/session", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Save failed");
      return;
    }
    router.push("/mapping");
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <Nav />
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Questions</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Choose the industry that best matches your business. It drives both the <span className="font-medium">indicative benchmarks</span> and{" "}
          <span className="font-medium">macro pass-through intensity</span> on your P&L (chart β × per-driver multipliers). Pick{" "}
          <span className="font-medium">one</span> option.
        </p>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">{INDUSTRY_PASS_THROUGH_UI_NOTE}</p>
      </header>
      <Disclaimer />
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {answers ? (
        <form onSubmit={save} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
            <legend className="px-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Industry (choose one)
            </legend>
            <div className="flex flex-col gap-2">
              {RETAIL_INDUSTRY_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                >
                  <input
                    type="radio"
                    name="industrySegment"
                    className="mt-1"
                    checked={answers.industrySegment === opt.id}
                    onChange={() => setAnswers({ ...answers, industrySegment: opt.id })}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
              Re-run compute on Results after changing this so overlays and benchmarks refresh. Multipliers are indicative scenario assumptions, not ABS
              estimates.
            </p>
          </fieldset>
          <label className="text-sm">
            <span className="font-medium">Reporting currency</span>
            <input
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              value={answers.currency}
              onChange={(e) => setAnswers({ ...answers, currency: e.target.value })}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Fiscal year starts (month 1–12)</span>
            <input
              type="number"
              min={1}
              max={12}
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              value={answers.fyStartMonth}
              onChange={(e) => setAnswers({ ...answers, fyStartMonth: Number(e.target.value) })}
            />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={answers.baseIncludesInflation}
              onChange={(e) => setAnswers({ ...answers, baseIncludesInflation: e.target.checked })}
            />
            <span>
              <span className="font-medium">Base forecast already embeds broad inflation</span>
              <span className="mt-1 block text-xs text-neutral-600 dark:text-neutral-400">
                When checked, macro betas are scaled down (scenario-only interpretation).
              </span>
            </span>
          </label>
          <button
            type="submit"
            disabled={busy}
            aria-busy={busy}
            className="w-fit rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:focus-visible:ring-neutral-500 dark:ring-offset-neutral-950"
          >
            {busy ? "Saving…" : "Save and map accounts"}
          </button>
        </form>
      ) : !err ? (
        <p className="text-sm text-neutral-600">Loading…</p>
      ) : null}
    </main>
  );
}
