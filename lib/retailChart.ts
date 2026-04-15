import type { MacroDriverId } from "./macro/registry";

export interface DriverLink {
  driverId: MacroDriverId;
  /** Sensitivity: multiplicative factor uses (1 + beta * momGrowth) per period per driver */
  beta: number;
  rationaleKey: string;
}

export interface CanonicalLine {
  id: string;
  label: string;
  synonyms: string[];
  drivers: DriverLink[];
  contributesToEbitdaBridge: boolean;
}

/** Retail MVP chart + default macro pass-through assumptions (transparent, editable later in product). */
export const RETAIL_CANONICAL: CanonicalLine[] = [
  {
    id: "REVENUE",
    label: "Revenue",
    synonyms: [
      "sales",
      "turnover",
      "top line",
      "income from sales",
      "total revenue",
      "net sales",
      "gross sales",
      "other revenue",
      "sales revenue",
      "net revenue",
    ],
    drivers: [
      {
        driverId: "RETAIL_TURNOVER_INDEX",
        beta: 0.5,
        rationaleKey: "revenue_retail_turnover",
      },
      {
        driverId: "CPI_ALL_GROUPS",
        beta: 0.14,
        rationaleKey: "revenue_cpi",
      },
      {
        driverId: "CONSUMER_CONFIDENCE",
        beta: 0.26,
        rationaleKey: "revenue_confidence",
      },
      {
        driverId: "UNEMPLOYMENT_RATE",
        beta: -0.2,
        rationaleKey: "revenue_unemployment",
      },
      {
        driverId: "RBA_CASH_RATE",
        beta: -0.12,
        rationaleKey: "revenue_rates",
      },
    ],
    contributesToEbitdaBridge: true,
  },
  {
    id: "COGS",
    label: "Cost of goods sold",
    synonyms: ["cos", "cogs", "cost of sales", "product costs", "direct costs"],
    drivers: [
      { driverId: "CPI_TRADABLE_GOODS", beta: 0.62, rationaleKey: "cogs_cpi_goods" },
      { driverId: "WPI", beta: 0.32, rationaleKey: "cogs_wpi" },
    ],
    contributesToEbitdaBridge: true,
  },
  {
    id: "GROSS_PROFIT",
    label: "Gross profit",
    synonyms: ["gross margin", "trading profit", "gross income", "sales less cost of sales"],
    drivers: [],
    contributesToEbitdaBridge: false,
  },
  {
    id: "PAYROLL",
    label: "Payroll / wages",
    synonyms: ["wages", "salaries", "staff costs", "people", "wages and salaries", "wages salaries"],
    drivers: [{ driverId: "WPI", beta: 0.85, rationaleKey: "payroll_wpi" }],
    contributesToEbitdaBridge: true,
  },
  {
    id: "RENT",
    label: "Rent",
    synonyms: ["occupancy", "lease"],
    drivers: [{ driverId: "CPI_RENT", beta: 0.6, rationaleKey: "rent_cpi" }],
    contributesToEbitdaBridge: true,
  },
  {
    id: "MARKETING",
    label: "Marketing",
    synonyms: ["advertising", "promo", "media"],
    drivers: [
      { driverId: "CONSUMER_CONFIDENCE", beta: 0.2, rationaleKey: "marketing_confidence" },
      { driverId: "CPI_ALL_GROUPS", beta: 0.14, rationaleKey: "marketing_cpi" },
    ],
    contributesToEbitdaBridge: true,
  },
  {
    id: "UTILITIES",
    label: "Utilities",
    synonyms: ["power", "electricity", "energy"],
    drivers: [{ driverId: "CPI_ELECTRICITY", beta: 0.8, rationaleKey: "utilities_cpi_elec" }],
    contributesToEbitdaBridge: true,
  },
  {
    id: "OTHER_OPEX",
    label: "Other operating expenses",
    synonyms: [
      "opex",
      "overheads",
      "admin",
      "ga",
      "operating expenses",
      "selling expenses",
      "general expenses",
    ],
    drivers: [{ driverId: "CPI_ALL_GROUPS", beta: 0.35, rationaleKey: "otheropex_cpi" }],
    contributesToEbitdaBridge: true,
  },
  {
    id: "TOTAL_OPEX",
    label: "Total operating expenses (subtotal)",
    synonyms: ["total opex", "total operating expenses", "subtotal opex"],
    drivers: [],
    contributesToEbitdaBridge: false,
  },
  {
    id: "OTHER_INCOME",
    label: "Other income (non-operating)",
    synonyms: ["sundry income", "miscellaneous income", "interest income", "dividend income"],
    drivers: [],
    contributesToEbitdaBridge: false,
  },
  {
    id: "EBITDA",
    label: "EBITDA",
    synonyms: ["ebitda", "operating earnings"],
    drivers: [],
    contributesToEbitdaBridge: true,
  },
  {
    id: "DEPRECIATION",
    label: "Depreciation & amortization",
    synonyms: ["d and a", "danda", "amortisation", "amortization", "depreciation"],
    drivers: [],
    contributesToEbitdaBridge: false,
  },
  {
    id: "EBIT",
    label: "EBIT / operating profit",
    synonyms: ["operating profit", "pbit", "earnings before interest and tax"],
    drivers: [],
    contributesToEbitdaBridge: false,
  },
  {
    id: "INTEREST",
    label: "Interest / finance costs",
    synonyms: ["interest expense", "finance costs", "borrowing costs"],
    drivers: [{ driverId: "RBA_CASH_RATE", beta: 0.5, rationaleKey: "interest_cash_rate" }],
    contributesToEbitdaBridge: false,
  },
  {
    id: "NPBT",
    label: "Profit before tax",
    synonyms: ["pbt", "earnings before tax", "pretax profit", "net profit before tax"],
    drivers: [],
    contributesToEbitdaBridge: false,
  },
  {
    id: "INCOME_TAX",
    label: "Income tax",
    synonyms: ["tax expense", "taxation", "corporate tax"],
    drivers: [],
    contributesToEbitdaBridge: false,
  },
  {
    id: "NPAT",
    label: "Net profit after tax",
    synonyms: ["net income", "profit after tax", "pat", "bottom line"],
    drivers: [],
    contributesToEbitdaBridge: false,
  },
  {
    id: "UNMAPPED",
    label: "Not mapped (no macro overlay)",
    synonyms: [],
    drivers: [],
    contributesToEbitdaBridge: false,
  },
];

export function getCanonicalById(id: string): CanonicalLine | undefined {
  return RETAIL_CANONICAL.find((c) => c.id === id);
}
