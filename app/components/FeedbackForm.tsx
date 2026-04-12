"use client";

import { useState } from "react";

const FORMSPREE_ACTION = "https://formspree.io/f/mrelnjza";

export function FeedbackForm() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(FORMSPREE_ACTION, {
        method: "POST",
        body: fd,
        headers: { Accept: "application/json" },
      });
      const j = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok) {
        throw new Error(typeof j?.error === "string" ? j.error : "Could not send feedback");
      }
      setDone(true);
      e.currentTarget.reset();
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Could not send feedback");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-sm font-semibold">Feedback</h2>
      {done ? (
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Thanks — your message was sent.</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-900 dark:text-neutral-100">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:placeholder:text-neutral-500"
              placeholder="Optional — only if you want a reply"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-900 dark:text-neutral-100">Your feedback</span>
            <textarea
              name="message"
              required
              rows={4}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              placeholder="Questions or comments…"
            />
          </label>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <button
            type="submit"
            disabled={busy}
            aria-busy={busy}
            className="w-fit rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:focus-visible:ring-neutral-500 dark:ring-offset-neutral-950"
          >
            {busy ? "Sending…" : "Send feedback"}
          </button>
        </form>
      )}
    </section>
  );
}
