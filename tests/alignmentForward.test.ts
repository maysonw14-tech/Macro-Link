import { describe, expect, it } from "vitest";
import {
  alignLevelsToPeriods,
  alignLevelsToPeriodsWithForwardMom,
  momGrowthSeries,
} from "@/lib/macro/alignment";

describe("alignLevelsToPeriodsWithForwardMom", () => {
  it("projects non-flat levels after last exact period so MoM is not all zero on the tail", () => {
    const periodKeys = ["2025-01", "2025-02", "2025-03", "2025-04"];
    const obs = [
      { period: "2025-01", value: 100 },
      { period: "2025-02", value: 110 },
    ];
    const flat = alignLevelsToPeriods(periodKeys, obs);
    const momFlat = momGrowthSeries(flat, 0.08);
    expect(momFlat[2]).toBe(0);
    expect(momFlat[3]).toBe(0);

    const extended = alignLevelsToPeriodsWithForwardMom(periodKeys, obs, 0.08);
    const momExt = momGrowthSeries(extended, 0.08);
    expect(momExt[2]).not.toBe(0);
    expect(momExt[3]).not.toBe(0);
    expect(extended[2]!).toBeCloseTo(110 * 1.08, 5);
  });

  it("does not change path when every period has an observation", () => {
    const keys = ["2025-01", "2025-02"];
    const obs = [
      { period: "2025-01", value: 100 },
      { period: "2025-02", value: 110 },
    ];
    const a = alignLevelsToPeriods(keys, obs);
    const b = alignLevelsToPeriodsWithForwardMom(keys, obs);
    expect(b).toEqual(a);
  });

  it("clips forward growth to mom cap", () => {
    const keys = ["2025-01", "2025-02", "2025-03"];
    const obs = [
      { period: "2025-01", value: 100 },
      { period: "2025-02", value: 200 },
    ];
    const out = alignLevelsToPeriodsWithForwardMom(keys, obs, 0.08);
    expect(out[2]!).toBeCloseTo(200 * 1.08, 5);
  });
});
