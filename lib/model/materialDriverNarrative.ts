import type { MacroDriverId } from "../macro/registry";

const DRIVER_IMPACT: Record<MacroDriverId, string> = {
  RETAIL_TURNOVER_INDEX:
    "When retail turnover is stronger in the ABS-style proxy, the economy is typically seeing higher retail sales momentum — mapped revenue here is scaled up in this scenario (and down when turnover weakens).",
  CPI_ALL_GROUPS:
    "Higher headline CPI means broad inflation in the economy: suppliers and importers face rising costs, so mapped COGS and several operating cost lines tend to reprice upward unless your base already embeds full pass-through.",
  CPI_TRADABLE_GOODS:
    "Tradable-goods CPI captures imported and trade-exposed price pressure; in practice that feeds purchase costs and margin pressure on mapped COGS more than services-only inflation.",
  WPI:
    "A faster Wage Price Index reflects labour-cost pressure in the economy; mapped payroll moves with it as a simple pass-through to wage bills.",
  CPI_RENT:
    "Higher CPI rents feed market rent inflation into mapped occupancy and lease-type costs.",
  CPI_ELECTRICITY:
    "Higher electricity CPI lifts power and utilities costs where utilities are mapped.",
};

export function materialDriverFinancialSummary(driverId: MacroDriverId): string {
  return DRIVER_IMPACT[driverId] ?? "This series moves mapped lines where it is linked in the retail chart.";
}
