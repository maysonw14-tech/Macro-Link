const DASH = "\u2013"; // en dash for zero / empty numeric display

/** Rounded integer; strict accounting: zero prints as en dash. */
export function formatAccountingInt(n: number): string {
  const r = Math.round(n);
  if (r === 0) return DASH;
  return r.toLocaleString("en-AU", { maximumFractionDigits: 0, useGrouping: true });
}

/** For CSV/XLSX cells that must stay numeric when non-zero; use string column for dash. */
export function accountingCell(n: number): string | number {
  const r = Math.round(n);
  if (r === 0) return DASH;
  return r;
}
