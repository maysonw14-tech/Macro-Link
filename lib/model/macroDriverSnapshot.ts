import type { MacroAligned } from "../macro/alignment";
import type { MacroDriverId } from "../macro/registry";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function formatPeriodKey(periodKey: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(periodKey.trim());
  if (!m) return periodKey;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!y || mo < 1 || mo > 12) return periodKey;
  return `${MONTHS[mo - 1]} ${y}`;
}

function formatCacheDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Latest YoY (if ≥13 periods) or MoM % move in the dominant series, observation month, optional cache date.
 */
export function driverSnapshotSnippet(
  driverId: MacroDriverId,
  aligned: MacroAligned,
  periodLabels: string[],
  macroSnapshotIso: string | null,
): string {
  const series = aligned[driverId];
  if (!series?.length) return "";
  const t = series.length - 1;
  const period = periodLabels[t] ?? "";
  const asAt = formatPeriodKey(period);
  const v = series[t]!;
  const prev = t >= 1 ? series[t - 1]! : null;
  const y1 = t >= 12 ? series[t - 12]! : null;

  let headline = "";
  if (y1 != null && y1 !== 0 && Number.isFinite(y1)) {
    const yoy = (v / y1 - 1) * 100;
    headline = `${yoy >= 0 ? "+" : ""}${yoy.toFixed(1)}% YoY`;
  } else if (prev != null && prev !== 0 && Number.isFinite(prev)) {
    const mom = (v / prev - 1) * 100;
    headline = `${mom >= 0 ? "+" : ""}${mom.toFixed(1)}% MoM`;
  } else if (Number.isFinite(v)) {
    headline = `index ${Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(2)}`;
  } else {
    return "";
  }

  let out = `${headline} as at ${asAt}`;
  const cache = formatCacheDate(macroSnapshotIso);
  if (cache) out += `; data cached ${cache}`;
  return out;
}
