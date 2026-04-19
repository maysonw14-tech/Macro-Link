"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readJsonResponse } from "@/lib/readJsonResponse";

export function MacroRefreshPanel() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function onRefresh(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/macro/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ secret }),
      });
      const j = await readJsonResponse<Record<string, unknown>>(res);
      if (!res.ok) {
        const err = typeof j.error === "string" ? j.error : "Refresh failed";
        setMsg({ kind: "err", text: err });
        return;
      }
      setMsg({
        kind: "ok",
        text:
          typeof j.seriesCount === "number"
            ? `Macro cache updated (${j.seriesCount as number} series).`
            : "Macro cache updated.",
      });
      setSecret("");
      router.refresh();
    } catch {
      setMsg({ kind: "err", text: "Network error — try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Refresh macro data</h2>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
        Loads cached macro series into the server database (needed after a new deploy or empty DB). Enter the secret
        configured as <span className="font-mono">MACRO_REFRESH_SECRET</span> on the host.
      </p>
      <form onSubmit={onRefresh} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
          Password
          <input
            type="password"
            name="macro-refresh-secret"
            autoComplete="off"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Your MACRO_REFRESH_SECRET"
            className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 font-mono text-sm dark:border-neutral-600 dark:bg-neutral-950"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !secret.trim()}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
        >
          {busy ? "Refreshing…" : "Run refresh"}
        </button>
      </form>
      {msg ? (
        <p
          className={
            msg.kind === "ok"
              ? "mt-2 text-xs text-emerald-700 dark:text-emerald-300"
              : "mt-2 text-xs text-red-600 dark:text-red-400"
          }
        >
          {msg.text}
        </p>
      ) : null}
    </section>
  );
}
