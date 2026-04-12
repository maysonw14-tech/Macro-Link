import { describe, expect, it } from "vitest";
import { accountingCell, formatAccountingInt } from "@/lib/accountingFormat";

describe("formatAccountingInt", () => {
  it("renders zero as en dash", () => {
    expect(formatAccountingInt(0)).toBe("\u2013");
    expect(formatAccountingInt(0.4)).toBe("\u2013");
  });

  it("groups thousands for en-AU", () => {
    expect(formatAccountingInt(95000)).toBe("95,000");
    expect(formatAccountingInt(-122000)).toBe("-122,000");
  });
});

describe("accountingCell", () => {
  it("matches dash for zero", () => {
    expect(accountingCell(0)).toBe("\u2013");
    expect(accountingCell(42)).toBe(42);
  });
});
