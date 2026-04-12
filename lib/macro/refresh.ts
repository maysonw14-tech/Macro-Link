import { MACRO_DRIVERS } from "./registry";
import { buildSyntheticObservations, tryFetchAbsLive } from "./absClient";
import { replaceObservations, upsertMacroSeries, writeSnapshotMeta } from "./localStore";

/** Batch refresh: writes macro cache only (no network on normal path except optional ABS). */
export async function refreshMacroData(): Promise<{ source: string; seriesCount: number }> {
  const live = await tryFetchAbsLive();
  const data = live ?? buildSyntheticObservations(60);
  const source = live ? "ABS" : "synthetic_seed";

  await upsertMacroSeries(
    MACRO_DRIVERS.map((d) => ({
      id: d.id,
      label: d.label,
      source: "ABS-proxy",
    })),
  );

  for (const d of MACRO_DRIVERS) {
    await replaceObservations(d.id, data[d.id] ?? []);
  }

  await writeSnapshotMeta(source, live ? "Live ABS fetch" : "Synthetic series for offline MVP / fallback");

  return { source, seriesCount: MACRO_DRIVERS.length };
}
