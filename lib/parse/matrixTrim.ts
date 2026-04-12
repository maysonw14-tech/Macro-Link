import { isEmptyCell } from "./cellNormalize";

export interface TrimmedSheet {
  rows: unknown[][];
  /** Original sheet row index of trimmed row 0 (for mapping meta back to Excel). */
  rowOffset: number;
  /** Original sheet column index of trimmed column 0. */
  colOffset: number;
}

/** Drop leading/trailing empty rows and columns so detection starts on real content. */
export function trimMatrixEdges(rows: unknown[][]): TrimmedSheet {
  if (!rows.length) return { rows, rowOffset: 0, colOffset: 0 };
  const mc = Math.max(0, ...rows.map((r) => r?.length ?? 0));
  if (mc === 0) return { rows, rowOffset: 0, colOffset: 0 };

  let r0 = 0;
  for (; r0 < rows.length; r0++) {
    const row = rows[r0];
    let n = 0;
    for (let c = 0; c < mc; c++) {
      if (!isEmptyCell(row?.[c])) n++;
    }
    if (n >= 2) break;
  }

  let r1 = rows.length - 1;
  for (; r1 > r0; r1--) {
    const row = rows[r1];
    let any = false;
    for (let c = 0; c < mc; c++) {
      if (!isEmptyCell(row?.[c])) {
        any = true;
        break;
      }
    }
    if (any) break;
  }

  let c0 = 0;
  for (; c0 < mc; c0++) {
    let any = false;
    for (let r = r0; r <= r1; r++) {
      if (!isEmptyCell(rows[r]?.[c0])) {
        any = true;
        break;
      }
    }
    if (any) break;
  }

  let c1 = mc - 1;
  for (; c1 > c0; c1--) {
    let any = false;
    for (let r = r0; r <= r1; r++) {
      if (!isEmptyCell(rows[r]?.[c1])) {
        any = true;
        break;
      }
    }
    if (any) break;
  }

  const out: unknown[][] = [];
  for (let r = r0; r <= r1; r++) {
    const row = rows[r] ?? [];
    out.push(row.slice(c0, c1 + 1));
  }
  return { rows: out, rowOffset: r0, colOffset: c0 };
}
