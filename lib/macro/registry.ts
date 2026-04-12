export type MacroDriverId =
  | "RETAIL_TURNOVER_INDEX"
  | "CPI_ALL_GROUPS"
  | "CPI_TRADABLE_GOODS"
  | "WPI"
  | "CPI_RENT"
  | "CPI_ELECTRICITY";

export const MACRO_DRIVERS: {
  id: MacroDriverId;
  label: string;
  /** Human-readable ABS-style description for narrative */
  absDescription: string;
}[] = [
  {
    id: "RETAIL_TURNOVER_INDEX",
    label: "Retail turnover (proxy)",
    absDescription: "Retail sales conditions (ABS retail trade–style proxy series in cache)",
  },
  {
    id: "CPI_ALL_GROUPS",
    label: "CPI — all groups",
    absDescription: "Consumer Price Index — all groups (headline inflation proxy)",
  },
  {
    id: "CPI_TRADABLE_GOODS",
    label: "CPI — tradable goods",
    absDescription: "CPI tradable goods subgroup (input cost pressure proxy)",
  },
  { id: "WPI", label: "Wage Price Index", absDescription: "Wage Price Index (payroll cost pressure proxy)" },
  { id: "CPI_RENT", label: "CPI — rents", absDescription: "CPI rents subgroup (occupancy cost proxy)" },
  {
    id: "CPI_ELECTRICITY",
    label: "CPI — electricity",
    absDescription: "CPI electricity subgroup (utilities proxy)",
  },
];

export const ALL_DRIVER_IDS: MacroDriverId[] = MACRO_DRIVERS.map((d) => d.id);
