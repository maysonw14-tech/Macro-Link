/**
 * True if the cell text looks like a period / time bucket header (not a line label).
 */
export function cellLooksLikePeriodHeader(s: string): boolean {
  const t = s.replace(/\u00a0/g, " ").trim();
  if (!t) return false;
  if (/^\d{4}-\d{2}$/.test(t)) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(t)) return true;
  if (/^\d{4}-Q[1-4]$/i.test(t)) return true;
  if (/^Q[1-4]\s*['']?\d{2,4}$/i.test(t)) return true;
  if (/^FY\s?\d{2,4}\s*Q[1-4]$/i.test(t)) return true;
  if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s.\-/]+\d{2,4}$/i.test(t.replace(/\s+/g, " "))) return true;
  if (/^\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}$/i.test(t)) return true;
  if (/^20\d{2}$/.test(t) && t.length === 4) return true;
  if (/^FY\s?20\d{2}$/i.test(t)) return true;
  if (/^FY\d{2}$/i.test(t)) return true;
  if (/^H[12]\s*FY?\s?\d{2,4}$/i.test(t)) return true;
  if (/^P\d{1,2}$/i.test(t) && t.length <= 4) return true;
  if (/^M\d{1,2}$/i.test(t)) return true;
  if (/^Q[1-4]FY\d{2,4}$/i.test(t.replace(/\s+/g, ""))) return true;
  if (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(t)) return true;
  return false;
}
