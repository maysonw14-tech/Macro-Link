/** 0-based index to Excel column letters (A, B, …, Z, AA, …). */
export function columnLetter(idx0: number): string {
  let n = idx0 + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Excel letters (e.g. A, BC) to 0-based column index. */
export function columnLetterToIndex(letters: string): number {
  const s = letters.trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (!s.length) throw new Error("Enter a column letter like A or BC.");
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i) - 64;
    if (c < 1 || c > 26) throw new Error(`Invalid column “${letters}”. Use letters A–Z only.`);
    n = n * 26 + c;
  }
  return n - 1;
}
