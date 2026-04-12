import { columnLetter } from "./columnLetters";
import { cellToLabel, isEmptyCell, parseNumberLoose } from "./cellNormalize";
import { trimMatrixEdges } from "./matrixTrim";
import { cellLooksLikePeriodHeader } from "./periodHeader";
import type { ParseMeta, ParsedGrid } from "@/lib/types";

const HEADER_SCAN_MAX = 28;
const LABEL_COL_MAX = 22;
const LOOKBELOW = 10;
const MIN_PERIOD_COLS = 1;
const MIN_PERIOD_HEADERS_PREFERENCE = 2;
const STOP_EMPTY_LABEL_RUN = 3;
const BODY_NUMERIC_RATIO = 0.22;
const BAD_COL_STREAK = 3;
const RERANK_TOP = 14;

export interface DetectedCandidate {
  score: number;
  headerRow: number;
  labelCol: number;
  periodCols: number[];
  mergeHeaderAbove: boolean;
}

function maxCols(rows: unknown[][]): number {
  let m = 0;
  for (const r of rows) m = Math.max(m, r?.length ?? 0);
  return m;
}

function nonEmptyCount(row: unknown[] | undefined): number {
  if (!row) return 0;
  let n = 0;
  for (const c of row) {
    if (!isEmptyCell(c)) n++;
  }
  return n;
}

function periodHeaderAt(rows: unknown[][], h: number, c: number, mergeHeaderAbove: boolean): string {
  if (mergeHeaderAbove && h > 0) {
    const a = cellToLabel(rows[h - 1]?.[c]);
    const b = cellToLabel(rows[h]?.[c]);
    return [a, b].filter(Boolean).join(" ").trim();
  }
  return cellToLabel(rows[h]?.[c]);
}

function columnBodyNumericRatio(rows: unknown[][], h: number, c: number): number {
  let num = 0;
  let tot = 0;
  const end = Math.min(rows.length - 1, h + LOOKBELOW);
  for (let r = h + 1; r <= end; r++) {
    const v = rows[r]?.[c];
    tot++;
    if (parseNumberLoose(v) != null) num++;
  }
  return tot === 0 ? 0 : num / tot;
}

/** Prefer label columns that look like account names, not dates or pure numbers. */
function labelColumnTextRatio(rows: unknown[][], h: number, lc: number): number {
  let ok = 0;
  let tot = 0;
  const end = Math.min(rows.length - 1, h + 45);
  for (let r = h + 1; r <= end; r++) {
    const lab = cellToLabel(rows[r]?.[lc]);
    if (!lab) continue;
    tot++;
    if (cellLooksLikePeriodHeader(lab)) continue;
    const soloNum = parseNumberLoose(lab);
    if (soloNum != null && lab.replace(/[$,]/g, "").trim().length <= 4) continue;
    ok++;
  }
  return tot === 0 ? 0 : ok / tot;
}

function collectPeriodColumns(
  rows: unknown[][],
  h: number,
  lc: number,
  mc: number,
  mergeHeaderAbove: boolean,
): number[] {
  const cols: number[] = [];
  let streakBad = 0;
  for (let c = lc + 1; c < mc; c++) {
    const hs = periodHeaderAt(rows, h, c, mergeHeaderAbove);
    const looksPeriod = cellLooksLikePeriodHeader(hs);
    const ratio = columnBodyNumericRatio(rows, h, c);
    const ok = looksPeriod || ratio >= BODY_NUMERIC_RATIO;
    if (ok) {
      cols.push(c);
      streakBad = 0;
    } else {
      streakBad++;
      if (cols.length >= MIN_PERIOD_COLS && streakBad >= BAD_COL_STREAK) break;
      if (cols.length === 0 && c - lc > 36) break;
    }
  }
  return cols;
}

function scoreCandidate(
  rows: unknown[][],
  h: number,
  lc: number,
  periodCols: number[],
  mergeHeaderAbove: boolean,
): number {
  if (periodCols.length < MIN_PERIOD_COLS) return -1;
  let dataRows = 0;
  let emptyRun = 0;
  for (let r = h + 1; r < rows.length; r++) {
    const label = cellToLabel(rows[r]?.[lc]);
    if (!label) {
      emptyRun++;
      if (emptyRun >= STOP_EMPTY_LABEL_RUN) break;
      continue;
    }
    emptyRun = 0;
    let num = 0;
    for (const c of periodCols) {
      const v = rows[r]?.[c];
      if (parseNumberLoose(v) != null || isEmptyCell(v)) num++;
    }
    const share = num / periodCols.length;
    if (share >= 0.2) dataRows++;
  }
  let periodHeaderHits = 0;
  for (const c of periodCols) {
    if (cellLooksLikePeriodHeader(periodHeaderAt(rows, h, c, mergeHeaderAbove))) periodHeaderHits++;
  }
  const labelBoost = labelColumnTextRatio(rows, h, lc) * 28;
  return dataRows * 6 + periodCols.length * 3 + periodHeaderHits + labelBoost;
}

function extractedQuality(grid: ParsedGrid, skippedRows: number): number {
  const cells = grid.rowLabels.length * grid.periodLabels.length;
  return cells - skippedRows * 8;
}

function enumerateCandidates(rows: unknown[][]): DetectedCandidate[] {
  const mc = maxCols(rows);
  const out: DetectedCandidate[] = [];
  const maxH = Math.min(rows.length - 1, HEADER_SCAN_MAX - 1);
  for (let h = 0; h <= maxH; h++) {
    if (nonEmptyCount(rows[h]) < 2) continue;
    const mergeOptions: boolean[] = [false];
    if (h > 0 && nonEmptyCount(rows[h - 1]) <= 5) mergeOptions.push(true);

    for (const mergeHeaderAbove of mergeOptions) {
      if (mergeHeaderAbove && nonEmptyCount(rows[h]) < 2) continue;
      for (let lc = 0; lc <= Math.min(LABEL_COL_MAX, mc - 2); lc++) {
        const periodCols = collectPeriodColumns(rows, h, lc, mc, mergeHeaderAbove);
        const sc = scoreCandidate(rows, h, lc, periodCols, mergeHeaderAbove);
        if (sc > 0) {
          out.push({ score: sc, headerRow: h, labelCol: lc, periodCols, mergeHeaderAbove });
        }
      }
    }
  }
  out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.headerRow !== b.headerRow) return a.headerRow - b.headerRow;
    if (a.labelCol !== b.labelCol) return a.labelCol - b.labelCol;
    if (a.mergeHeaderAbove !== b.mergeHeaderAbove) return Number(a.mergeHeaderAbove) - Number(b.mergeHeaderAbove);
    return a.periodCols.length - b.periodCols.length;
  });
  return out;
}

export interface LayoutBounds {
  sheetIndex: number;
  headerRow0Based: number;
  labelCol0Based: number;
  periodCols0Based: number[];
  /** When true, period labels combine row above + header row (subtitle + month row). */
  mergeHeaderAbove?: boolean;
  lastDataRow0Based?: number;
  /** When parsing a trimmed matrix, add these so meta matches original sheet coordinates. */
  sheetRowOffset?: number;
  sheetColOffset?: number;
}

export function extractParsedGrid(
  rows: unknown[][],
  bounds: LayoutBounds,
): { grid: ParsedGrid; meta: Omit<ParseMeta, "sheetName" | "sheetIndex" | "confidence"> } {
  const { headerRow0Based: h, labelCol0Based: lc, periodCols0Based: periodCols } = bounds;
  const merge = bounds.mergeHeaderAbove ?? false;
  const rowOff = bounds.sheetRowOffset ?? 0;
  const colOff = bounds.sheetColOffset ?? 0;
  const warnings: string[] = [];
  let blanksCoercedToZero = 0;
  let skippedRows = 0;

  const periodLabels = periodCols.map((c) => periodHeaderAt(rows, h, c, merge) || `Col_${c + 1}`);
  const rowLabels: string[] = [];
  const values: number[][] = [];

  let emptyRun = 0;
  const endRow = bounds.lastDataRow0Based != null ? bounds.lastDataRow0Based : rows.length - 1;

  for (let r = h + 1; r <= endRow && r < rows.length; r++) {
    const label = cellToLabel(rows[r]?.[lc]);
    if (!label) {
      emptyRun++;
      if (bounds.lastDataRow0Based == null && emptyRun >= STOP_EMPTY_LABEL_RUN) break;
      continue;
    }
    emptyRun = 0;

    const nums: number[] = [];
    let rowBad = false;
    for (const c of periodCols) {
      const v = rows[r]?.[c];
      if (isEmptyCell(v)) {
        nums.push(0);
        blanksCoercedToZero++;
        continue;
      }
      const n = parseNumberLoose(v);
      if (n == null) {
        rowBad = true;
        break;
      }
      nums.push(n);
    }
    if (rowBad) {
      skippedRows++;
      warnings.push(`Skipped non-numeric row: “${label}” (row ${r + 1 + rowOff}).`);
      continue;
    }
    if (nums.length !== periodCols.length) continue;
    rowLabels.push(label);
    values.push(nums);
  }

  if (periodLabels.length < 2) {
    warnings.push("Fewer than two period columns — overlay horizon is short.");
  }
  if (blanksCoercedToZero > 0) {
    warnings.push(`Coerced ${blanksCoercedToZero} blank cell(s) to 0 in numeric columns.`);
  }

  return {
    grid: { rowLabels, periodLabels, values },
    meta: {
      headerRow0Based: h + rowOff,
      labelCol0Based: lc + colOff,
      periodColStart0Based: (periodCols[0] ?? lc + 1) + colOff,
      periodColEnd0Based: (periodCols[periodCols.length - 1] ?? lc + 1) + colOff,
      warnings,
      blanksCoercedToZero,
      skippedRows,
      detectedPeriodHeaders: periodLabels.slice(),
    },
  };
}

function confidenceFrom(meta: {
  periodCols: number[];
  dataRows: number;
  periodHeaderHits: number;
  skippedRows: number;
}): number {
  let c = 0.2;
  c += Math.min(0.35, meta.periodCols.length / 14);
  c += Math.min(0.35, meta.dataRows / 12);
  c += Math.min(0.15, meta.periodHeaderHits / Math.max(1, meta.periodCols.length));
  c -= Math.min(0.2, meta.skippedRows * 0.03);
  return Math.max(0.05, Math.min(1, c));
}

/** Auto-detect best grid on a single sheet's 2D array. */
export function detectPnLGrid(rows: unknown[][], sheetName: string, sheetIndex: number): { grid: ParsedGrid; meta: ParseMeta } | null {
  if (rows.length < 2) return null;
  const { rows: trimmed, rowOffset, colOffset } = trimMatrixEdges(rows);
  if (trimmed.length < 2) return null;

  const cands = enumerateCandidates(trimmed);
  if (!cands.length) return null;

  const top = cands.slice(0, RERANK_TOP);
  let bestCand = top[0]!;
  let bestExtract = extractParsedGrid(trimmed, {
    sheetIndex,
    headerRow0Based: bestCand.headerRow,
    labelCol0Based: bestCand.labelCol,
    periodCols0Based: bestCand.periodCols,
    mergeHeaderAbove: bestCand.mergeHeaderAbove,
    sheetRowOffset: rowOffset,
    sheetColOffset: colOffset,
  });
  let bestQ = extractedQuality(bestExtract.grid, bestExtract.meta.skippedRows);

  for (let i = 1; i < top.length; i++) {
    const cand = top[i]!;
    const ex = extractParsedGrid(trimmed, {
      sheetIndex,
      headerRow0Based: cand.headerRow,
      labelCol0Based: cand.labelCol,
      periodCols0Based: cand.periodCols,
      mergeHeaderAbove: cand.mergeHeaderAbove,
      sheetRowOffset: rowOffset,
      sheetColOffset: colOffset,
    });
    if (ex.grid.rowLabels.length === 0) continue;
    const q = extractedQuality(ex.grid, ex.meta.skippedRows);
    if (q > bestQ) {
      bestQ = q;
      bestCand = cand;
      bestExtract = ex;
    }
  }

  if (bestExtract.grid.rowLabels.length === 0) return null;

  let periodHeaderHits = 0;
  for (const c of bestCand.periodCols) {
    if (cellLooksLikePeriodHeader(periodHeaderAt(trimmed, bestCand.headerRow, c, bestCand.mergeHeaderAbove))) {
      periodHeaderHits++;
    }
  }

  const conf = confidenceFrom({
    periodCols: bestCand.periodCols,
    dataRows: bestExtract.grid.rowLabels.length,
    periodHeaderHits,
    skippedRows: bestExtract.meta.skippedRows,
  });

  const warnings = [...bestExtract.meta.warnings];
  const mergeNote = bestCand.mergeHeaderAbove ? " (combined with row above for month headers)" : "";
  warnings.unshift(
    `Detected header on row ${bestCand.headerRow + rowOffset + 1}, label column ${columnLetter(bestCand.labelCol + colOffset)}, sheet “${sheetName}”${mergeNote}.`,
  );
  if (bestCand.periodCols.length < MIN_PERIOD_HEADERS_PREFERENCE) {
    warnings.push("Only one period column detected — results use a single horizon column.");
  }

  const meta: ParseMeta = {
    sheetName,
    sheetIndex,
    headerRow0Based: bestExtract.meta.headerRow0Based,
    labelCol0Based: bestExtract.meta.labelCol0Based,
    periodColStart0Based: bestExtract.meta.periodColStart0Based,
    periodColEnd0Based: bestExtract.meta.periodColEnd0Based,
    confidence: conf,
    warnings,
    blanksCoercedToZero: bestExtract.meta.blanksCoercedToZero,
    skippedRows: bestExtract.meta.skippedRows,
    detectedPeriodHeaders: bestExtract.meta.detectedPeriodHeaders,
  };

  return { grid: bestExtract.grid, meta };
}

/** Last-resort detection: row 1 as header, column A labels (classic export). */
export function tryLegacyDetect(rows: unknown[][], sheetName: string, sheetIndex: number): { grid: ParsedGrid; meta: ParseMeta } | null {
  const { rows: trimmed, rowOffset, colOffset } = trimMatrixEdges(rows);
  const mc = maxCols(trimmed);
  if (mc < 2 || trimmed.length < 2) return null;
  if (nonEmptyCount(trimmed[0]) < 2) return null;
  const periodCols = collectPeriodColumns(trimmed, 0, 0, mc, false);
  if (periodCols.length < MIN_PERIOD_COLS) return null;
  const extracted = extractParsedGrid(trimmed, {
    sheetIndex,
    headerRow0Based: 0,
    labelCol0Based: 0,
    periodCols0Based: periodCols,
    mergeHeaderAbove: false,
    sheetRowOffset: rowOffset,
    sheetColOffset: colOffset,
  });
  if (extracted.grid.rowLabels.length === 0) return null;
  const warnings = [
    `Used legacy layout (header row ${extracted.meta.headerRow0Based + 1}, label column ${columnLetter(extracted.meta.labelCol0Based)}) on sheet “${sheetName}”.`,
    ...extracted.meta.warnings,
  ];
  const meta: ParseMeta = {
    sheetName,
    sheetIndex,
    headerRow0Based: extracted.meta.headerRow0Based,
    labelCol0Based: extracted.meta.labelCol0Based,
    periodColStart0Based: extracted.meta.periodColStart0Based,
    periodColEnd0Based: extracted.meta.periodColEnd0Based,
    confidence: 0.35,
    warnings,
    blanksCoercedToZero: extracted.meta.blanksCoercedToZero,
    skippedRows: extracted.meta.skippedRows,
    detectedPeriodHeaders: extracted.meta.detectedPeriodHeaders,
  };
  return { grid: extracted.grid, meta };
}
