import { describe, expect, it } from "vitest";
import {
  annualRateToUniformMonthlyMom,
  latestAnnualRateFromObservations,
  shiftIsoMonth,
  uniformMonthlyMomFromObservations,
} from "@/lib/macro/latestAnnualDriverRates";

describe("shiftIsoMonth", () => {
  it("shifts back 12 months", () => {
    expect(shiftIsoMonth("2025-03", -12)).toBe("2024-03");
  });
  it("shifts forward across year", () => {
    expect(shiftIsoMonth("2024-11", 3)).toBe("2025-02");
  });
});

describe("latestAnnualRateFromObservations", () => {
  it("uses YoY when same month one year earlier exists", () => {
    const obs: { period: string; value: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(2024, i, 1));
      obs.push({
        period: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
        value: 100,
      });
    }
    obs.push({ period: "2025-01", value: 103.5 });
    const r = latestAnnualRateFromObservations(obs);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(0.035, 5);
  });

  it("returns null when fewer than 2 points", () => {
    expect(latestAnnualRateFromObservations([])).toBeNull();
    expect(latestAnnualRateFromObservations([{ period: "2025-01", value: 100 }])).toBeNull();
  });

  it("falls back to MoM annualized when YoY month missing", () => {
    const obs = [
      { period: "2025-01", value: 100 },
      { period: "2025-02", value: 101 },
    ];
    const r = latestAnnualRateFromObservations(obs);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(1.01 ** 12 - 1, 5);
  });
});

describe("annualRateToUniformMonthlyMom", () => {
  it("matches compound 12th root", () => {
    const g = annualRateToUniformMonthlyMom(0.035);
    expect((1 + g) ** 12 - 1).toBeCloseTo(0.035, 5);
  });
});

describe("latestAnnualRateFromObservations uncapped YoY", () => {
  it("passes through large YoY without annual band clip", () => {
    const obs: { period: string; value: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(2024, i, 1));
      obs.push({
        period: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
        value: 100,
      });
    }
    obs.push({ period: "2025-01", value: 140 });
    const r = latestAnnualRateFromObservations(obs);
    expect(r).toBeCloseTo(0.4, 5);
  });
});

describe("uniformMonthlyMomFromObservations", () => {
  it("returns YoY directly as constant mom (not 12th root)", () => {
    const obs: { period: string; value: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(2024, i, 1));
      obs.push({
        period: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
        value: 100,
      });
    }
    obs.push({ period: "2025-01", value: 103.5 });
    const mom = uniformMonthlyMomFromObservations(obs);
    expect(mom).toBeCloseTo(0.035, 5);
    expect(mom).not.toBeCloseTo((1.035) ** (1 / 12) - 1, 5);
  });

  it("returns 0 for flat YoY", () => {
    const linear: { period: string; value: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(Date.UTC(2024, i, 1));
      linear.push({
        period: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
        value: 100,
      });
    }
    expect(uniformMonthlyMomFromObservations(linear)).toBe(0);
  });
});
