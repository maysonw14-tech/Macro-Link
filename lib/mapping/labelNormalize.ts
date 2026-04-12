/**
 * Normalize uploaded P&amp;L row labels for dictionary and fuzzy matching.
 * Display text is unchanged; this is matching-only.
 */
export function normalizeLabelForMatch(raw: string): string {
  let s = raw.trim().normalize("NFKC").toLowerCase();
  s = s.replace(/\s+/g, " ");
  s = s.replace(/\s*&\s*/g, " and ");
  // Strip parenthetical rates like "(25%)" or "( 12.5 % )"
  s = s.replace(/\(\s*\d+(?:\.\d+)?\s*%\s*\)/gi, "");
  s = s.replace(/[–—]/g, "-");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}
