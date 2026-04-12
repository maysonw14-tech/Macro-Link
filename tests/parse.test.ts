import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseNumberLoose } from "@/lib/parse/cellNormalize";
import { columnLetter, columnLetterToIndex } from "@/lib/parse/columnLetters";
import { parseSpreadsheetBuffer, reparseWithLayout } from "@/lib/parseSpreadsheet";

describe("columnLetters", () => {
  it("round-trips common columns", () => {
    expect(columnLetterToIndex("A")).toBe(0);
    expect(columnLetterToIndex("B")).toBe(1);
    expect(columnLetterToIndex("Z")).toBe(25);
    expect(columnLetter(0)).toBe("A");
    expect(columnLetter(25)).toBe("Z");
    expect(columnLetterToIndex("AA")).toBe(26);
    expect(columnLetter(26)).toBe("AA");
  });
});

describe("parseNumberLoose", () => {
  it("parses accounting negatives and currency", () => {
    expect(parseNumberLoose("(1,234.5)")).toBe(-1234.5);
    expect(parseNumberLoose("$1,000")).toBe(1000);
    expect(parseNumberLoose("12%")).toBe(0.12);
  });
});

describe("parseSpreadsheetBuffer", () => {
  it("detects offset header and label column", () => {
    const csv = `,,,
,,,
,Line,Jan 2025,Feb 2025
,Revenue,100,200
,COGS,50,60
`;
    const pkg = parseSpreadsheetBuffer(Buffer.from(csv, "utf8"), "t.csv");
    expect(pkg.grid.rowLabels).toEqual(["Revenue", "COGS"]);
    expect(pkg.grid.periodLabels.length).toBe(2);
    expect(pkg.grid.values[0]).toEqual([100, 200]);
    expect(pkg.meta.labelCol0Based).toBe(1);
    expect(pkg.meta.headerRow0Based).toBe(2);
  });

  it("coerces blanks to zero with warning", () => {
    const csv = `Item,Jan 2025,Feb 2025
Revenue,100,
COGS,,40
`;
    const pkg = parseSpreadsheetBuffer(Buffer.from(csv, "utf8"), "b.csv");
    expect(pkg.grid.values[0][1]).toBe(0);
    expect(pkg.meta.blanksCoercedToZero).toBeGreaterThan(0);
    expect(pkg.meta.warnings.some((w) => w.includes("Coerced"))).toBe(true);
  });

  it("picks the sheet with the strongest P&L signal", () => {
    const wb = XLSX.utils.book_new();
    const cover = XLSX.utils.aoa_to_sheet([["Annual report"], ["nothing here"]]);
    const pl = XLSX.utils.aoa_to_sheet([
      ["Account", "2025-01", "2025-02", "2025-03"],
      ["Revenue", 10, 20, 30],
      ["Expenses", 4, 5, 6],
    ]);
    XLSX.utils.book_append_sheet(wb, cover, "Cover");
    XLSX.utils.book_append_sheet(wb, pl, "PL");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const pkg = parseSpreadsheetBuffer(buf, "m.xlsx");
    expect(pkg.meta.sheetName).toBe("PL");
    expect(pkg.grid.rowLabels.length).toBeGreaterThanOrEqual(2);
  });
});

describe("reparseWithLayout", () => {
  it("applies manual bounds", () => {
    const csv = `x,x,x,x
ignore,2025-01,2025-02,2025-03
go,1,2,3
`;
    const buf = Buffer.from(csv, "utf8");
    const pkg = reparseWithLayout(buf, {
      sheetIndex: 0,
      headerRow0Based: 1,
      labelCol0Based: 0,
      firstPeriodCol0Based: 1,
      lastPeriodCol0Based: 3,
    });
    expect(pkg.grid.rowLabels).toEqual(["go"]);
    expect(pkg.grid.values[0]).toEqual([1, 2, 3]);
    expect(pkg.meta.confidence).toBe(1);
  });
});
