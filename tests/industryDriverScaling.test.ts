import { describe, expect, it } from "vitest";
import { industryDriverMultiplier } from "@/lib/model/industryDriverScaling";

describe("industryDriverMultiplier", () => {
  it("OTHER_RETAIL is neutral for all drivers", () => {
    expect(industryDriverMultiplier("OTHER_RETAIL", "CPI_TRADABLE_GOODS")).toBe(1);
    expect(industryDriverMultiplier("OTHER_RETAIL", "WPI")).toBe(1);
  });

  it("FOOD_GROCERY boosts tradable CPI vs neutral", () => {
    expect(industryDriverMultiplier("FOOD_GROCERY", "CPI_TRADABLE_GOODS")).toBeGreaterThan(1);
    expect(industryDriverMultiplier("FOOD_GROCERY", "CPI_TRADABLE_GOODS")).toBeGreaterThan(
      industryDriverMultiplier("OTHER_RETAIL", "CPI_TRADABLE_GOODS"),
    );
  });

  it("does not clamp multipliers above the old 1.35 ceiling", () => {
    expect(industryDriverMultiplier("CAFES_RESTAURANTS", "WPI")).toBe(1.4);
  });

  it("CAFES_RESTAURANTS boosts WPI vs neutral", () => {
    expect(industryDriverMultiplier("CAFES_RESTAURANTS", "WPI")).toBeGreaterThan(1);
  });
});
