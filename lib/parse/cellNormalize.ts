/** Empty spreadsheet cells (not numeric zero). */
export function isEmptyCell(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") {
    const t = v.replace(/\u00a0/g, " ").trim();
    return t === "" || t === "-" || t === "—" || t === "n/a" || t.toLowerCase() === "na";
  }
  if (typeof v === "number") return false;
  return false;
}

/**
 * Parse a cell to a finite number, or null if not numeric.
 * Supports accounting negatives (1,234) and currency symbols.
 */
export function parseNumberLoose(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return null;
  let s = v.replace(/\u00a0/g, " ").trim();
  if (s === "" || s === "-" || s === "—") return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[$€£]/g, "").replace(/,/g, "").trim();
  if (s.endsWith("%")) {
    const n = Number(s.slice(0, -1).trim());
    if (!Number.isFinite(n)) return null;
    const v2 = n / 100;
    return neg ? -v2 : v2;
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

export function cellToLabel(v: unknown): string {
  if (v == null) return "";
  return String(v).replace(/\u00a0/g, " ").trim();
}
