import { lookupAccountingDictionary } from "../mapping/accountingDictionary";
import type { RowMapping } from "../types";

/**
 * Canonical IDs we may infer from row labels only when the user left the row UNMAPPED.
 * Scoped to lines that drive gross-profit rollups so we do not reinterpret arbitrary detail.
 */
const INFER_FROM_LABEL_WHEN_UNMAPPED = new Set([
  "GROSS_PROFIT",
  "COGS",
  "REVENUE",
  "OTHER_INCOME",
]);

function mappingForRowIndex(mapping: RowMapping[], i: number): RowMapping | undefined {
  return mapping.find((m) => m.rowIndex === i);
}

/**
 * Trim stored ids and, for UNMAPPED rows, promote to dictionary hits when the label clearly
 * matches revenue / COGS / gross profit / other income. Used only for P&L rollup math, not
 * as the session mapping shown to the user.
 */
export function augmentMappingForRollup(mapping: RowMapping[], rowLabels: string[]): RowMapping[] {
  const nR = rowLabels.length;
  const out: RowMapping[] = [];
  for (let i = 0; i < nR; i++) {
    const m = mappingForRowIndex(mapping, i);
    const raw = m?.canonicalId ?? "UNMAPPED";
    const trimmed = raw.trim();
    const confidence = m?.confidence ?? 0;
    if (trimmed && trimmed !== "UNMAPPED") {
      out.push({ rowIndex: i, canonicalId: trimmed, confidence });
      continue;
    }
    const hit = lookupAccountingDictionary(rowLabels[i] ?? "");
    if (hit && INFER_FROM_LABEL_WHEN_UNMAPPED.has(hit.canonicalId)) {
      out.push({
        rowIndex: i,
        canonicalId: hit.canonicalId,
        confidence: Math.max(confidence, hit.confidence),
      });
    } else {
      out.push({ rowIndex: i, canonicalId: "UNMAPPED", confidence });
    }
  }
  return out;
}

export function collectRollupInferenceWarnings(
  mapping: RowMapping[],
  rollupMapping: RowMapping[],
  rowLabels: string[],
): string[] {
  const out: string[] = [];
  for (let i = 0; i < rowLabels.length; i++) {
    const before = mappingForRowIndex(mapping, i)?.canonicalId ?? "UNMAPPED";
    const after = mappingForRowIndex(rollupMapping, i)?.canonicalId ?? "UNMAPPED";
    if (before.trim() === "UNMAPPED" && after !== "UNMAPPED") {
      out.push(
        `Row "${rowLabels[i]}" was unmapped; treated as ${after.replace(/_/g, " ")} for P&L rollups—set Mappings explicitly if that is wrong.`,
      );
    }
  }
  return out;
}
