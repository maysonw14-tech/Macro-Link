/** Informational notes (not problems): coercion, multi-sheet note. */
export function isInformationalWarning(w: string): boolean {
  if (/^Coerced \d+ blank/i.test(w)) return true;
  if (/^Scanned \d+ sheet\(s\)/i.test(w)) return true;
  return false;
}

/** Plain-language line for the parse summary list. */
export function humanizeWarning(w: string): string {
  const coerced = /^Coerced (\d+) blank cell\(s\) to 0 in numeric columns\./i.exec(w);
  if (coerced) {
    return `We read ${coerced[1]} empty number cells as zero so every row stays numeric (common for sparse budgets).`;
  }
  return w;
}
