import { getMacroSnapshotDisplay } from "@/lib/macro/getMacroSnapshotDisplay";

function formatFetched(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export async function MacroDataAsOf() {
  const st = await getMacroSnapshotDisplay();

  return (
    <p className="text-sm text-neutral-600 dark:text-neutral-400">
      Last refreshed:{" "}
      <span className="font-mono text-neutral-900 dark:text-neutral-100">{formatFetched(st.lastFetchedAt)}</span>
    </p>
  );
}
