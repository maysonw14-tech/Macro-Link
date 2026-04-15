import type { MacroDriverId } from "./registry";
import { MACRO_DRIVERS } from "./registry";

/** Generate deterministic synthetic index levels for local cache when ABS is unavailable. */
export function buildSyntheticObservations(monthsBack = 48): Record<MacroDriverId, { period: string; value: number }[]> {
  const out = {} as Record<MacroDriverId, { period: string; value: number }[]>;
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCMonth(start.getUTCMonth() - (monthsBack - 1));

  const seeds: Record<MacroDriverId, number> = {
    RETAIL_TURNOVER_INDEX: 100,
    CPI_ALL_GROUPS: 100,
    CPI_TRADABLE_GOODS: 100,
    WPI: 100,
    CPI_RENT: 100,
    CPI_ELECTRICITY: 100,
    UNEMPLOYMENT_RATE: 100,
    CONSUMER_CONFIDENCE: 100,
    RBA_CASH_RATE: 100,
  };

  for (const d of MACRO_DRIVERS) {
    const series: { period: string; value: number }[] = [];
    let v = seeds[d.id];
    for (let i = 0; i < monthsBack; i++) {
      const dt = new Date(start);
      dt.setUTCMonth(start.getUTCMonth() + i);
      const y = dt.getUTCFullYear();
      const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
      const period = `${y}-${m}`;
      const drift =
        d.id === "RETAIL_TURNOVER_INDEX"
          ? 0.0012
          : d.id === "WPI"
            ? 0.0009
            : d.id === "CPI_ELECTRICITY"
              ? 0.0018
              : d.id === "UNEMPLOYMENT_RATE"
                ? 0.0005
                : d.id === "CONSUMER_CONFIDENCE"
                  ? 0.001
                  : d.id === "RBA_CASH_RATE"
                    ? 0.0004
                    : 0.0014;
      const wave = 0.0004 * Math.sin(i / 4 + (d.id.length % 3));
      v = v * (1 + drift + wave);
      series.push({ period, value: Math.round(v * 1000) / 1000 });
    }
    out[d.id] = series;
  }
  return out;
}

/**
 * Optional live fetch (placeholder). When ABS keys/endpoints are configured, implement here.
 * MUST NOT be called from upload path — only from refresh job.
 */
export async function tryFetchAbsLive(): Promise<Record<MacroDriverId, { period: string; value: number }[]> | null> {
  void tryFetchAbsLive;
  return null;
}
