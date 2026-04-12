import * as XLSX from "xlsx";
import { columnLetter } from "./parse/columnLetters";
import { detectPnLGrid, extractParsedGrid, tryLegacyDetect } from "./parse/detectPnLGrid";
import type { LayoutOverrides, ParseMeta, ParsedPackage } from "./types";

const MAX_BYTES = 4 * 1024 * 1024;

function sheetRows(sheet: object): unknown[][] {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
}

/**
 * Parse workbook: auto-detect P&amp;L grid across sheets, tolerating offset headers / label columns.
 */
export function parseSpreadsheetBuffer(buf: Buffer, filename: string): ParsedPackage {
  if (buf.length > MAX_BYTES) {
    throw new Error(`File exceeds ${MAX_BYTES / (1024 * 1024)} MB limit.`);
  }
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
  if (!wb.SheetNames.length) throw new Error("Workbook has no sheets.");

  let best: ParsedPackage | null = null;
  let bestKey = -1;

  for (let si = 0; si < wb.SheetNames.length; si++) {
    const name = wb.SheetNames[si]!;
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const rows = sheetRows(sheet);
    const det = detectPnLGrid(rows, name, si);
    if (!det) continue;
    const key = det.grid.rowLabels.length * det.grid.periodLabels.length * det.meta.confidence;
    if (key > bestKey) {
      best = det;
      bestKey = key;
    }
  }

  if (!best) {
    const name0 = wb.SheetNames[0]!;
    const sheet0 = wb.Sheets[name0];
    if (!sheet0) throw new Error("Could not read first sheet.");
    const rows0 = sheetRows(sheet0);
    const leg = tryLegacyDetect(rows0, name0, 0);
    if (!leg) {
      throw new Error(
        "Could not detect a P&L-style table. On the upload step, open “Advanced: fix table layout” and set the header row and Excel column letters manually.",
      );
    }
    best = leg;
  } else if (wb.SheetNames.length > 1) {
    best.meta.warnings.push(
      `Scanned ${wb.SheetNames.length} sheet(s); chose “${best.meta.sheetName}” with the strongest numeric block signal.`,
    );
  }

  void filename;
  return best;
}

/**
 * Re-parse with explicit layout (user re-selects the same file in the UI).
 */
export function reparseWithLayout(buf: Buffer, overrides: LayoutOverrides): ParsedPackage {
  if (buf.length > MAX_BYTES) {
    throw new Error(`File exceeds ${MAX_BYTES / (1024 * 1024)} MB limit.`);
  }
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
  if (!wb.SheetNames.length) throw new Error("Workbook has no sheets.");
  const si = Math.max(0, Math.min(overrides.sheetIndex, wb.SheetNames.length - 1));
  const sheetName = wb.SheetNames[si]!;
  const sheet = wb.Sheets[sheetName];
  if (!sheet) throw new Error("Sheet not found.");
  const rows = sheetRows(sheet);

  if (overrides.lastPeriodCol0Based < overrides.firstPeriodCol0Based) {
    throw new Error("Last period column must be greater than or equal to first period column.");
  }
  const periodCols: number[] = [];
  for (let c = overrides.firstPeriodCol0Based; c <= overrides.lastPeriodCol0Based; c++) {
    periodCols.push(c);
  }
  if (periodCols.length < 1) throw new Error("Select at least one period column.");

  const extracted = extractParsedGrid(rows, {
    sheetIndex: si,
    headerRow0Based: overrides.headerRow0Based,
    labelCol0Based: overrides.labelCol0Based,
    periodCols0Based: periodCols,
    mergeHeaderAbove: false,
    lastDataRow0Based: overrides.lastDataRow0Based ?? undefined,
  });

  if (extracted.grid.rowLabels.length === 0) {
    throw new Error("No data rows found for the selected layout.");
  }

  const meta: ParseMeta = {
    sheetName,
    sheetIndex: si,
    headerRow0Based: overrides.headerRow0Based,
    labelCol0Based: overrides.labelCol0Based,
    periodColStart0Based: periodCols[0]!,
    periodColEnd0Based: periodCols[periodCols.length - 1]!,
    confidence: 1,
    warnings: [
      `Manual layout: header row ${overrides.headerRow0Based + 1}, label column ${columnLetter(overrides.labelCol0Based)}, periods ${columnLetter(overrides.firstPeriodCol0Based)}–${columnLetter(overrides.lastPeriodCol0Based)}.`,
      ...extracted.meta.warnings,
    ],
    blanksCoercedToZero: extracted.meta.blanksCoercedToZero,
    skippedRows: extracted.meta.skippedRows,
    detectedPeriodHeaders: extracted.meta.detectedPeriodHeaders,
  };

  return { grid: extracted.grid, meta };
}
