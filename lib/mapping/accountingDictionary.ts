import { normalizeLabelForMatch } from "./labelNormalize";

/** Full-string equality only (avoids substring traps on 2–3 letter tokens). */
const EXACT_SHORT: Record<string, string> = {
  ebit: "EBIT",
  npbt: "NPBT",
  pbt: "NPBT",
  npat: "NPAT",
  pat: "NPAT",
  cogs: "COGS",
  cos: "COGS",
  gp: "GROSS_PROFIT",
};

export interface DictionaryHit {
  canonicalId: string;
  confidence: number;
}

interface FlatPattern {
  pattern: string;
  canonicalId: string;
}

const MIN_SUBSTRING_LEN = 4;

/**
 * Curated phrases: longest wins globally (see flattenSorted).
 * Put longer phrases before shorter ones within the same idea (e.g. NPBT before NPAT "net profit").
 */
const RAW: { canonicalId: string; patterns: string[] }[] = [
  // --- Revenue (long / specific first) ---
  {
    canonicalId: "REVENUE",
    patterns: [
      "total consolidated revenue",
      "total revenue from operations",
      "revenue from sale of goods",
      "revenue from rendering of services",
      "revenue from contracts with customers",
      "total sales revenue",
      "total net sales",
      "total net revenue",
      "total operating revenue",
      "total revenue",
      "gross sales revenue",
      "net sales revenue",
      "net operating revenue",
      "other operating revenue",
      "other sales revenue",
      "other revenue",
      "secondary revenue",
      "ancillary revenue",
      "service revenue",
      "services revenue",
      "subscription revenue",
      "recurring revenue",
      "product revenue",
      "product sales",
      "sales revenue",
      "revenue from operations",
      "revenue from sales",
      "income from operations",
      "contract revenue",
      "fee income",
      "commission income",
      "rental income",
      "lease income",
      "licence income",
      "license income",
      "royalty income",
      "top line revenue",
      "net turnover",
      "gross sales",
      "net sales",
      "net revenue",
      "turnover",
      "sales income",
      "income from sales",
      "revenue",
    ],
  },
  // --- Gross profit (before other "profit" lines) ---
  {
    canonicalId: "GROSS_PROFIT",
    patterns: [
      "gross profit on ordinary activities",
      "gross profit on sales",
      "gross operating income",
      "gross trading profit",
      "trading gross profit",
      "gross margin dollars",
      "gross profit",
      "trading profit",
      "gross income",
      "sales margin",
    ],
  },
  // --- COGS / cost of sales ---
  {
    canonicalId: "COGS",
    patterns: [
      "cost of merchandise sold",
      "cost of materials and goods sold",
      "cost of products sold",
      "cost of product sold",
      "cost of goods and services sold",
      "cost of goods sold",
      "cost of sales",
      "cost of revenue",
      "direct materials",
      "direct material costs",
      "direct costs of sales",
      "purchases of inventory",
      "inventory costs",
      "product costs",
      "merchandise costs",
    ],
  },
  // --- Payroll ---
  {
    canonicalId: "PAYROLL",
    patterns: [
      "employee benefits on-costs",
      "employee benefits expense",
      "employee remuneration",
      "employment on-costs",
      "employment costs",
      "compensation expense",
      "staff remuneration",
      "staff benefit costs",
      "personnel expenses",
      "labour costs",
      "labor costs",
      "wages and salaries",
      "wages salaries",
      "salaries and wages",
      "staff costs",
      "payroll tax",
      "superannuation expense",
      "workers compensation",
    ],
  },
  // --- D&A (presentation) ---
  {
    canonicalId: "DEPRECIATION",
    patterns: [
      "depreciation and amortisation expense",
      "depreciation and amortization expense",
      "amortisation of intangible assets",
      "amortization of intangible assets",
      "depreciation of property plant and equipment",
      "depreciation and amortisation",
      "depreciation and amortization",
      "depreciation expense",
      "amortisation expense",
      "amortization expense",
      "d and a",
    ],
  },
  // --- Other income (non-operating / sundry) ---
  {
    canonicalId: "OTHER_INCOME",
    patterns: [
      "other income and expense",
      "other gains and losses",
      "interest revenue",
      "sundry income",
      "miscellaneous income",
      "interest income",
      "dividend income",
      "foreign exchange gain",
      "foreign exchange gains",
      "gain on disposal",
      "profit on disposal",
    ],
  },
  // --- Opex buckets ---
  {
    canonicalId: "TOTAL_OPEX",
    patterns: [
      "total operating expenses",
      "total operating expenditure",
      "total operating expense",
      "subtotal operating expenses",
      "sub-total operating expenses",
      "total opex",
      "opex total",
      "total overheads",
      "total overhead",
    ],
  },
  {
    canonicalId: "OTHER_OPEX",
    patterns: [
      "repairs and maintenance expense",
      "repairs and maintenance",
      "professional fees expense",
      "professional services expense",
      "consulting and professional fees",
      "legal and professional fees",
      "audit and accountancy fees",
      "insurance expense",
      "telecommunications expense",
      "telephone and internet",
      "office and administration",
      "office expenses",
      "travel and entertainment",
      "bank and finance charges",
      "bank fees and charges",
      "share based payment expense",
      "share-based payment expense",
      "impairment of financial assets",
      "impairment loss on assets",
      "impairment losses",
      "bad debt expense",
      "doubtful debts expense",
      "selling general and administrative",
      "general and administrative",
      "general and administration",
      "other operating expenses",
      "other operating expense",
      "selling expenses",
      "administrative expenses",
      "administration expenses",
    ],
  },
  {
    canonicalId: "RENT",
    patterns: [
      "occupancy expense",
      "lease expense",
      "lease payments",
      "rent expense",
      "occupancy costs",
    ],
  },
  {
    canonicalId: "MARKETING",
    patterns: [
      "sales and marketing expense",
      "sales and marketing expenses",
      "advertising and promotion",
      "advertising and marketing",
      "marketing expense",
      "promotion expenses",
    ],
  },
  {
    canonicalId: "UTILITIES",
    patterns: [
      "gas water and electricity",
      "gas and electricity",
      "electricity and gas",
      "utilities expense",
      "power and utilities",
    ],
  },
  {
    canonicalId: "EBITDA",
    patterns: [
      "earnings before interest tax depreciation and amortisation",
      "earnings before interest tax depreciation and amortization",
      "adjusted ebitda",
    ],
  },
  {
    canonicalId: "EBIT",
    patterns: [
      "operating profit (ebit)",
      "operating profit ebit",
      "earnings before interest and tax",
      "earnings before interest and taxes",
      "profit from operations",
      "operating profit before interest and tax",
      "operating result",
      "net operating income",
      "pbit",
      "profit before interest and tax",
      "operating income",
      "operating profit",
      "operating earnings before interest",
    ],
  },
  {
    canonicalId: "INTEREST",
    patterns: [
      "net financing costs",
      "net interest expense",
      "interest expense",
      "finance costs",
      "finance charges",
      "borrowing costs",
      "interest paid",
      "interest payable",
      "bank interest",
      "loan interest",
    ],
  },
  {
    canonicalId: "NPBT",
    patterns: [
      "net profit before income tax",
      "net profit before taxation",
      "net profit before tax",
      "profit before income tax",
      "profit before taxation",
      "profit before tax",
      "earnings before tax",
      "pretax profit",
      "pre-tax profit",
      "profit before income taxes",
      "ebt",
    ],
  },
  {
    canonicalId: "INCOME_TAX",
    patterns: [
      "income tax expense",
      "income taxation",
      "income tax",
      "taxation expense",
      "tax expense",
      "corporation tax",
      "corporate income tax",
      "provision for income tax",
      "tax on profit",
      "tax charge",
    ],
  },
  {
    canonicalId: "NPAT",
    patterns: [
      "net profit after income tax",
      "net profit after taxation",
      "net profit after tax",
      "profit after income tax",
      "profit after taxation",
      "profit after tax",
      "net income after tax",
      "net earnings",
      "profit for the period",
      "profit for the year",
      "net result",
      "bottom line",
      "net profit",
    ],
  },
  {
    canonicalId: "EBITDA",
    patterns: ["ebitda", "operating earnings"],
  },
  {
    canonicalId: "OTHER_OPEX",
    patterns: ["operating expenses", "operating expenditure", "opex", "overheads", "overhead"],
  },
];

function flattenSorted(): FlatPattern[] {
  const flat: FlatPattern[] = [];
  for (const block of RAW) {
    for (const p of block.patterns) {
      const pattern = normalizeLabelForMatch(p);
      if (pattern.length >= MIN_SUBSTRING_LEN) {
        flat.push({ pattern, canonicalId: block.canonicalId });
      }
    }
  }
  flat.sort((a, b) => b.pattern.length - a.pattern.length);
  return flat;
}

const SORTED_PATTERNS = flattenSorted();

function confidenceForSubstring(patternLen: number): number {
  return Math.min(0.97, 0.92 + Math.min(5, Math.max(0, patternLen - MIN_SUBSTRING_LEN)) * 0.01);
}

/**
 * Curated phrase match before fuzzy search. Uses normalized label only.
 */
export function lookupAccountingDictionary(label: string): DictionaryHit | null {
  const normalized = normalizeLabelForMatch(label);
  if (!normalized) return null;

  const short = EXACT_SHORT[normalized];
  if (short) {
    return { canonicalId: short, confidence: 0.99 };
  }

  for (const { pattern, canonicalId } of SORTED_PATTERNS) {
    if (normalized === pattern) {
      return { canonicalId, confidence: 0.98 };
    }
  }

  for (const { pattern, canonicalId } of SORTED_PATTERNS) {
    if (pattern.length < MIN_SUBSTRING_LEN) continue;
    if (normalized.includes(pattern)) {
      return { canonicalId, confidence: confidenceForSubstring(pattern.length) };
    }
  }

  return null;
}
