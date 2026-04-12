import type { MacroAligned } from "./macro/alignment";

/** Parsed grid from first sheet: row labels + period columns. */
export interface ParsedGrid {
  rowLabels: string[];
  periodLabels: string[];
  /** values[row][periodIndex] */
  values: number[][];
}

/** Heuristic parse diagnostics and layout for optional user overrides. */
export interface ParseMeta {
  sheetName: string;
  sheetIndex: number;
  headerRow0Based: number;
  labelCol0Based: number;
  periodColStart0Based: number;
  periodColEnd0Based: number;
  /** 0–1 heuristic confidence */
  confidence: number;
  warnings: string[];
  blanksCoercedToZero: number;
  skippedRows: number;
  detectedPeriodHeaders: string[];
}

/** Manual layout overrides for re-parse (0-based indices). */
export interface LayoutOverrides {
  sheetIndex: number;
  headerRow0Based: number;
  labelCol0Based: number;
  firstPeriodCol0Based: number;
  lastPeriodCol0Based: number;
  /** inclusive; omit or null = auto until blank run */
  lastDataRow0Based?: number | null;
}

export interface ParsedPackage {
  grid: ParsedGrid;
  meta: ParseMeta;
}

export interface RowMapping {
  rowIndex: number;
  /** Canonical account id from retail chart, or "UNMAPPED" */
  canonicalId: string;
  confidence: number;
}

/** Australian retail / hospitality segment: indicative benchmarks plus per-driver P&L pass-through multipliers on chart β. */
export type RetailIndustrySegment =
  | "FOOD_GROCERY"
  | "CAFES_RESTAURANTS"
  | "CLOTHING_FOOTWEAR"
  | "HOUSEHOLD_HARDWARE"
  | "HEALTH_BEAUTY_PHARMACY"
  | "OTHER_RETAIL";

export interface SessionAnswers {
  currency: string;
  /** 1–12, month fiscal year starts */
  fyStartMonth: number;
  /** User indicates upload already embeds inflation */
  baseIncludesInflation: boolean;
  industrySegment: RetailIndustrySegment;
}

export interface MacroDriverMeta {
  id: string;
  label: string;
  source: string;
}

export interface LineExplanation {
  rowIndex: number;
  rowLabel: string;
  canonicalId: string;
  rationale: string;
  driversDetail: string[];
  lowMappingConfidence: boolean;
}

export interface OverlayResult {
  periodLabels: string[];
  baseline: number[][];
  adjusted: number[][];
  delta: number[][];
  explanations: LineExplanation[];
  /** Per driver, sum over rows and periods of incremental dollar impact (approx) */
  driverBridgeApprox: Record<string, number>;
  /** Cached macro index levels aligned to period columns (same as overlay input). */
  macroAligned: MacroAligned;
  macroSnapshotIso: string | null;
  forwardRule: string;
}
