import type { MacroDriverId } from "./registry";

/** Month growth (M[t]/M[t-1]-1), capped; first period 0. */
export function momGrowthSeries(levels: number[], cap = 0.06): number[] {
  const g: number[] = [];
  for (let t = 0; t < levels.length; t++) {
    if (t === 0 || levels[t - 1] === 0) {
      g.push(0);
      continue;
    }
    const raw = levels[t] / levels[t - 1] - 1;
    const clipped = Math.max(-cap, Math.min(cap, raw));
    g.push(clipped);
  }
  return g;
}

/** Forward-fill levels to match `periodKeys` (YYYY-MM). */
export function alignLevelsToPeriods(
  periodKeys: string[],
  observations: { period: string; value: number }[],
): number[] {
  const map = new Map(observations.map((o) => [o.period, o.value]));
  const sorted = [...observations].sort((a, b) => a.period.localeCompare(b.period));
  let last = sorted.length ? sorted[sorted.length - 1]!.value : 100;
  const out: number[] = [];
  for (const p of periodKeys) {
    if (map.has(p)) last = map.get(p)!;
    out.push(last);
  }
  return out;
}

/** Must match overlay MoM cap in `applyMacroOverlay` so forward path is consistent. */
export const MACRO_MOM_CAP = 0.08;

/**
 * Like {@link alignLevelsToPeriods}, then projects levels after the last month with an
 * exact observation so MoM is not stuck at zero on the forward-filled plateau: each step
 * applies the last realised month-on-month change from the observation history (clipped).
 */
export function alignLevelsToPeriodsWithForwardMom(
  periodKeys: string[],
  observations: { period: string; value: number }[],
  momCap = MACRO_MOM_CAP,
): number[] {
  const map = new Map(observations.map((o) => [o.period, o.value]));
  const sorted = [...observations].sort((a, b) => a.period.localeCompare(b.period));
  let last = sorted.length ? sorted[sorted.length - 1]!.value : 100;
  const out: number[] = [];
  let lastMatchedIndex = -1;
  for (let i = 0; i < periodKeys.length; i++) {
    const p = periodKeys[i]!;
    if (map.has(p)) {
      last = map.get(p)!;
      lastMatchedIndex = i;
    }
    out.push(last);
  }

  let forwardMom = 0;
  if (sorted.length >= 2) {
    const a = sorted[sorted.length - 2]!.value;
    const b = sorted[sorted.length - 1]!.value;
    if (a !== 0) {
      forwardMom = Math.max(-momCap, Math.min(momCap, b / a - 1));
    }
  }

  if (forwardMom === 0) return out;

  if (lastMatchedIndex >= 0 && lastMatchedIndex < periodKeys.length - 1) {
    for (let i = lastMatchedIndex + 1; i < periodKeys.length; i++) {
      out[i] = out[i - 1]! * (1 + forwardMom);
    }
    return out;
  }

  if (lastMatchedIndex < 0 && sorted.length >= 2 && periodKeys.length > 1) {
    for (let i = 1; i < periodKeys.length; i++) {
      out[i] = out[i - 1]! * (1 + forwardMom);
    }
  }

  return out;
}

export type MacroAligned = Record<MacroDriverId, number[]>;

/** Shown in overlay forwardRule / results UI — keep in sync with {@link alignLevelsToPeriodsWithForwardMom}. */
export const MACRO_FORWARD_PATH_DISCLOSURE =
  "Months after the last month with a published observation in the macro cache use the same clipped month-on-month change as the last two observed months, projected forward so horizon columns are not frozen at zero growth.";

