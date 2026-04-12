import type { ParsedGrid } from "../types";

/** Period headers that are sheet subtotals / aggregates, not time buckets for macro alignment. */
function isAggregatePeriodLabel(raw: string): boolean {
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, " ");
  if (s === "total" || s === "ytd" || s === "year to date") return true;
  return false;
}

/**
 * Removes aggregate columns (e.g. "Total") so the horizon is only time periods.
 * The results UI adds its own sum column across periods.
 * If stripping would leave fewer than two columns, returns a shallow clone unchanged.
 */
export function stripAggregatePeriodColumns(grid: ParsedGrid): ParsedGrid {
  const { periodLabels, values, rowLabels } = grid;
  if (periodLabels.length === 0) {
    return { rowLabels: [...rowLabels], periodLabels: [], values: values.map((r) => [...r]) };
  }

  const keepIdx: number[] = [];
  for (let i = 0; i < periodLabels.length; i++) {
    if (!isAggregatePeriodLabel(periodLabels[i]!)) keepIdx.push(i);
  }

  if (keepIdx.length < 2 || keepIdx.length === periodLabels.length) {
    return {
      rowLabels: [...rowLabels],
      periodLabels: [...periodLabels],
      values: values.map((r) => [...r]),
    };
  }

  return {
    rowLabels: [...rowLabels],
    periodLabels: keepIdx.map((i) => periodLabels[i]!),
    values: values.map((row) => keepIdx.map((i) => row[i]!)),
  };
}
