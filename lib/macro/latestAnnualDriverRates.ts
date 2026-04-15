import { MACRO_MOM_CAP } from "./alignment";

export function shiftIsoMonth(period: string, deltaMonths: number): string | null {
  const m = /^(\d{4})-(\d{2})$/.exec(period.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const month0 = Number(m[2]) - 1;
  if (!Number.isFinite(y) || month0 < 0 || month0 > 11) return null;
  const d = new Date(Date.UTC(y, month0 + deltaMonths, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Latest observed annual change on the index from macro cache history (uncapped when finite).
 * YoY when the same calendar month one year earlier exists; else annualized last MoM without clipping the one-month move.
 */
export function latestAnnualRateFromObservations(
  observations: { period: string; value: number }[],
): number | null {
  const sorted = [...observations].sort((a, b) => a.period.localeCompare(b.period));
  if (sorted.length < 2) return null;

  const last = sorted[sorted.length - 1]!;
  const prev = sorted[sorted.length - 2]!;
  const map = new Map(sorted.map((o) => [o.period, o.value]));

  const yoyPeriod = shiftIsoMonth(last.period, -12);
  if (yoyPeriod) {
    const vYoY = map.get(yoyPeriod);
    if (vYoY != null && vYoY !== 0 && Number.isFinite(vYoY) && Number.isFinite(last.value)) {
      const r = last.value / vYoY - 1;
      if (Number.isFinite(r)) return r;
    }
  }

  if (prev.value === 0 || !Number.isFinite(prev.value) || !Number.isFinite(last.value)) return null;
  const rMomRaw = last.value / prev.value - 1;
  const rAnn = (1 + rMomRaw) ** 12 - 1;
  return Number.isFinite(rAnn) ? rAnn : null;
}

/** Compound monthly rate equivalent to annual `r` (MoM cap only applies to this legacy helper). */
export function annualRateToUniformMonthlyMom(rAnnual: number): number {
  if (!Number.isFinite(rAnnual)) return 0;
  const g = (1 + rAnnual) ** (1 / 12) - 1;
  return Math.max(-MACRO_MOM_CAP, Math.min(MACRO_MOM_CAP, g));
}

/**
 * Constant `mom` each period: latest YoY or MoM-annualised fallback as observed (no annual band clip).
 */
export function uniformMonthlyMomFromObservations(
  observations: { period: string; value: number }[],
): number {
  const rAnn = latestAnnualRateFromObservations(observations);
  if (rAnn == null) return 0;
  return rAnn;
}
