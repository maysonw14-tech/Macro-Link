import type { RetailIndustrySegment, SessionAnswers } from "./types";

export const RETAIL_INDUSTRY_OPTIONS: { id: RetailIndustrySegment; label: string }[] = [
  { id: "FOOD_GROCERY", label: "Food & Grocery Retail" },
  { id: "CAFES_RESTAURANTS", label: "Cafes, Restaurants & Takeaway (Hospitality/Food Service)" },
  { id: "CLOTHING_FOOTWEAR", label: "Clothing, Footwear & Accessories" },
  {
    id: "HOUSEHOLD_HARDWARE",
    label: "Household Goods & Furniture (including hardware & electricals)",
  },
  { id: "HEALTH_BEAUTY_PHARMACY", label: "Health & Beauty / Pharmacy" },
  { id: "OTHER_RETAIL", label: "Other Retail" },
];

const IDS = new Set<string>(RETAIL_INDUSTRY_OPTIONS.map((o) => o.id));

export function isRetailIndustrySegment(x: string): x is RetailIndustrySegment {
  return IDS.has(x);
}

export function normalizeSessionAnswers(raw: unknown): SessionAnswers {
  const d =
    raw && typeof raw === "object"
      ? (raw as Partial<SessionAnswers> & Record<string, unknown>)
      : ({} as Partial<SessionAnswers>);
  const seg = typeof d.industrySegment === "string" && isRetailIndustrySegment(d.industrySegment)
    ? d.industrySegment
    : "OTHER_RETAIL";
  return {
    currency: typeof d.currency === "string" && d.currency.trim() ? d.currency.trim() : "AUD",
    fyStartMonth:
      typeof d.fyStartMonth === "number" && d.fyStartMonth >= 1 && d.fyStartMonth <= 12
        ? d.fyStartMonth
        : 7,
    baseIncludesInflation: Boolean(d.baseIncludesInflation),
    industrySegment: seg,
  };
}
