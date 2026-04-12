import { describe, expect, it } from "vitest";
import { lookupAccountingDictionary } from "@/lib/mapping/accountingDictionary";
import { normalizeLabelForMatch } from "@/lib/mapping/labelNormalize";
import { suggestMappings } from "@/lib/mapping/suggestMappings";
import type { ParsedGrid } from "@/lib/types";

describe("normalizeLabelForMatch", () => {
  it("lowercases, collapses space, and maps ampersand", () => {
    expect(normalizeLabelForMatch("  Wages  &  Salaries  ")).toBe("wages and salaries");
  });

  it("strips parenthetical percentage rates", () => {
    expect(normalizeLabelForMatch("Income Tax (25%)")).toBe("income tax");
    expect(normalizeLabelForMatch("Tax ( 12.5 % ) expense")).toBe("tax expense");
  });

  it("normalizes dash variants", () => {
    expect(normalizeLabelForMatch("Pre–tax")).toBe("pre-tax");
  });
});

describe("lookupAccountingDictionary", () => {
  it("matches EBIT and NPBT style labels", () => {
    expect(lookupAccountingDictionary("Operating Profit (EBIT)")?.canonicalId).toBe("EBIT");
    expect(lookupAccountingDictionary("Net Profit Before Tax")?.canonicalId).toBe("NPBT");
    expect(lookupAccountingDictionary("Interest Expense")?.canonicalId).toBe("INTEREST");
    expect(lookupAccountingDictionary("Total OpEx")?.canonicalId).toBe("TOTAL_OPEX");
  });

  it("does not substring-match overly short generic tokens alone", () => {
    expect(lookupAccountingDictionary("total")).toBeNull();
    expect(lookupAccountingDictionary("tax")).toBeNull();
  });

  it("maps common revenue and gross profit labels", () => {
    expect(lookupAccountingDictionary("Gross Profit")?.canonicalId).toBe("GROSS_PROFIT");
    expect(lookupAccountingDictionary("Total Revenue")?.canonicalId).toBe("REVENUE");
    expect(lookupAccountingDictionary("Other Revenue")?.canonicalId).toBe("REVENUE");
    expect(lookupAccountingDictionary("Sales Revenue")?.canonicalId).toBe("REVENUE");
    expect(lookupAccountingDictionary("Cost of revenue")?.canonicalId).toBe("COGS");
  });
});

describe("suggestMappings", () => {
  function gridFromLabels(rowLabels: string[]): ParsedGrid {
    return {
      rowLabels,
      periodLabels: ["Jan"],
      values: rowLabels.map(() => [0]),
    };
  }

  it("maps common presentation lines from the dictionary with high confidence", () => {
    const labels = [
      "Operating Profit (EBIT)",
      "Net Profit Before Tax",
      "Income Tax (25%)",
      "Net Profit After Tax",
      "Interest Expense",
      "Total OpEx",
    ];
    const out = suggestMappings(gridFromLabels(labels));
    expect(out.map((m) => m.canonicalId)).toEqual([
      "EBIT",
      "NPBT",
      "INCOME_TAX",
      "NPAT",
      "INTEREST",
      "TOTAL_OPEX",
    ]);
    expect(out.every((m) => m.confidence >= 0.9)).toBe(true);
  });

  it("leaves nonsense labels unmapped when dictionary and fuse both weak", () => {
    const out = suggestMappings(gridFromLabels(["zzzzqqqq", "qxqxqxqx"]));
    expect(out[0]?.canonicalId).toBe("UNMAPPED");
    expect(out[1]?.canonicalId).toBe("UNMAPPED");
  });

  it("prefers EBITDA over EBIT for the full word ebitda", () => {
    const out = suggestMappings(gridFromLabels(["EBITDA"]));
    expect(out[0]?.canonicalId).toBe("EBITDA");
  });

  it("maps a bundle of typical P&L labels from the dictionary", () => {
    const labels = [
      "Total Revenue",
      "Sales Revenue",
      "Other Revenue",
      "Cost of Goods Sold",
      "Gross Profit",
      "Depreciation and amortization",
      "Interest income",
    ];
    const out = suggestMappings(gridFromLabels(labels));
    expect(out.map((m) => m.canonicalId)).toEqual([
      "REVENUE",
      "REVENUE",
      "REVENUE",
      "COGS",
      "GROSS_PROFIT",
      "DEPRECIATION",
      "OTHER_INCOME",
    ]);
  });
});
