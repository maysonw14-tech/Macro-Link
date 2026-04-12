import Fuse from "fuse.js";
import { lookupAccountingDictionary } from "./accountingDictionary";
import { normalizeLabelForMatch } from "./labelNormalize";
import { RETAIL_CANONICAL } from "../retailChart";
import type { ParsedGrid, RowMapping } from "../types";

const MAPPABLE = RETAIL_CANONICAL.filter((c) => c.id !== "UNMAPPED");

function buildSearchStrings(): { id: string; text: string }[] {
  const out: { id: string; text: string }[] = [];
  for (const c of MAPPABLE) {
    const parts = [c.label, c.id, ...c.synonyms].join(" | ");
    out.push({ id: c.id, text: parts.toLowerCase() });
  }
  return out;
}

const fuse = new Fuse(buildSearchStrings(), { keys: ["text"], threshold: 0.45, includeScore: true });

const FUSE_MAX_SCORE = 0.52;

/**
 * Suggest canonical mapping per row label: curated dictionary first, then Fuse.
 */
export function suggestMappings(grid: ParsedGrid): RowMapping[] {
  return grid.rowLabels.map((label, rowIndex) => {
    const dictHit = lookupAccountingDictionary(label);
    if (dictHit) {
      return { rowIndex, canonicalId: dictHit.canonicalId, confidence: dictHit.confidence };
    }

    const q = normalizeLabelForMatch(label);
    if (!q) {
      return { rowIndex, canonicalId: "UNMAPPED", confidence: 0 };
    }

    const hits = fuse.search(q, { limit: 3 });
    for (const h of hits) {
      const score = typeof h.score === "number" ? h.score : 1;
      if (score <= FUSE_MAX_SCORE) {
        const confidence = Math.max(0, Math.min(1, 1 - score));
        return { rowIndex, canonicalId: h.item.id, confidence };
      }
    }

    return { rowIndex, canonicalId: "UNMAPPED", confidence: 0 };
  });
}
