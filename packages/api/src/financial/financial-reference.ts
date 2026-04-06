import type { TaxPolicy } from "./financial.types.js";

export type StateFinancialReference = {
  stateSalesTax: number | null;
  stateIncomeTax: TaxPolicy | null;
  minimumWage: number | null;
  minimumWageNotes?: string;
};

export const FINANCIAL_REFERENCE_AS_OF = "2025-01-01";
export const MINIMUM_WAGE_SOURCE_URL = "https://www.dol.gov/agencies/whd/minimum-wage/state";

export const STATE_FINANCIAL_REFERENCE: Record<string, StateFinancialReference> = {
  AL: { stateSalesTax: 0.04, stateIncomeTax: { regime: "graduated", topRate: 0.05 }, minimumWage: 7.25 },
  AK: { stateSalesTax: 0, stateIncomeTax: { regime: "none", topRate: null }, minimumWage: 11.91 },
  AZ: { stateSalesTax: 0.056, stateIncomeTax: { regime: "flat", topRate: 0.025 }, minimumWage: 14.70 },
  AR: { stateSalesTax: 0.065, stateIncomeTax: { regime: "graduated", topRate: 0.043 }, minimumWage: 11.00 },
  CA: { stateSalesTax: 0.0725, stateIncomeTax: { regime: "graduated", topRate: 0.133 }, minimumWage: 16.50 },
  CO: { stateSalesTax: 0.029, stateIncomeTax: { regime: "flat", topRate: 0.044 }, minimumWage: 14.81 },
  CT: { stateSalesTax: 0.0635, stateIncomeTax: { regime: "graduated", topRate: 0.0699 }, minimumWage: 16.35 },
  DE: { stateSalesTax: 0, stateIncomeTax: { regime: "graduated", topRate: 0.066 }, minimumWage: 15.00 },
  DC: { stateSalesTax: 0.06, stateIncomeTax: { regime: "graduated", topRate: 0.1075 }, minimumWage: 17.50 },
  FL: { stateSalesTax: 0.06, stateIncomeTax: { regime: "none", topRate: null }, minimumWage: 13.00 },
  GA: { stateSalesTax: 0.04, stateIncomeTax: { regime: "flat", topRate: 0.0539 }, minimumWage: 7.25, minimumWageNotes: "Georgia's state minimum wage is lower, but the federal rate applies to most covered workers." },
  HI: { stateSalesTax: 0.04, stateIncomeTax: { regime: "graduated", topRate: 0.11 }, minimumWage: 14.00 },
  ID: { stateSalesTax: 0.06, stateIncomeTax: { regime: "flat", topRate: 0.058 }, minimumWage: 7.25 },
  IL: { stateSalesTax: 0.0625, stateIncomeTax: { regime: "flat", topRate: 0.0495 }, minimumWage: 15.00 },
  IN: { stateSalesTax: 0.07, stateIncomeTax: { regime: "flat", topRate: 0.0305 }, minimumWage: 7.25 },
  IA: { stateSalesTax: 0.06, stateIncomeTax: { regime: "flat", topRate: 0.057 }, minimumWage: 7.25 },
  KS: { stateSalesTax: 0.065, stateIncomeTax: { regime: "graduated", topRate: 0.0558 }, minimumWage: 7.25 },
  KY: { stateSalesTax: 0.06, stateIncomeTax: { regime: "flat", topRate: 0.04 }, minimumWage: 7.25 },
  LA: { stateSalesTax: 0.0445, stateIncomeTax: { regime: "graduated", topRate: 0.03 }, minimumWage: 7.25 },
  ME: { stateSalesTax: 0.055, stateIncomeTax: { regime: "graduated", topRate: 0.0715 }, minimumWage: 14.65 },
  MD: { stateSalesTax: 0.06, stateIncomeTax: { regime: "graduated", topRate: 0.0575 }, minimumWage: 15.00 },
  MA: { stateSalesTax: 0.0625, stateIncomeTax: { regime: "flat", topRate: 0.05 }, minimumWage: 15.00 },
  MI: { stateSalesTax: 0.06, stateIncomeTax: { regime: "flat", topRate: 0.0425 }, minimumWage: 10.56 },
  MN: { stateSalesTax: 0.06875, stateIncomeTax: { regime: "graduated", topRate: 0.0985 }, minimumWage: 11.13 },
  MS: { stateSalesTax: 0.07, stateIncomeTax: { regime: "graduated", topRate: 0.047 }, minimumWage: 7.25 },
  MO: { stateSalesTax: 0.04225, stateIncomeTax: { regime: "graduated", topRate: 0.047 }, minimumWage: 13.75 },
  MT: { stateSalesTax: 0, stateIncomeTax: { regime: "graduated", topRate: 0.059 }, minimumWage: 10.55 },
  NE: { stateSalesTax: 0.055, stateIncomeTax: { regime: "graduated", topRate: 0.0584 }, minimumWage: 13.50 },
  NV: { stateSalesTax: 0.0685, stateIncomeTax: { regime: "none", topRate: null }, minimumWage: 12.00 },
  NH: { stateSalesTax: 0, stateIncomeTax: { regime: "interest-and-dividend-only", topRate: 0.03, notes: "Applies to interest and dividend income only." }, minimumWage: 7.25 },
  NJ: { stateSalesTax: 0.06625, stateIncomeTax: { regime: "graduated", topRate: 0.1075 }, minimumWage: 15.49 },
  NM: { stateSalesTax: 0.05125, stateIncomeTax: { regime: "graduated", topRate: 0.059 }, minimumWage: 12.00 },
  NY: { stateSalesTax: 0.04, stateIncomeTax: { regime: "graduated", topRate: 0.109 }, minimumWage: 15.50, minimumWageNotes: "Downstate rates are higher in some regions." },
  NC: { stateSalesTax: 0.0475, stateIncomeTax: { regime: "flat", topRate: 0.045 }, minimumWage: 7.25 },
  ND: { stateSalesTax: 0.05, stateIncomeTax: { regime: "graduated", topRate: 0.025 }, minimumWage: 7.25 },
  OH: { stateSalesTax: 0.0575, stateIncomeTax: { regime: "graduated", topRate: 0.035 }, minimumWage: 10.70 },
  OK: { stateSalesTax: 0.045, stateIncomeTax: { regime: "graduated", topRate: 0.0475 }, minimumWage: 7.25 },
  OR: { stateSalesTax: 0, stateIncomeTax: { regime: "graduated", topRate: 0.099 }, minimumWage: 14.70, minimumWageNotes: "Portland Metro and non-urban counties use different rates." },
  PA: { stateSalesTax: 0.06, stateIncomeTax: { regime: "flat", topRate: 0.0307 }, minimumWage: 7.25 },
  RI: { stateSalesTax: 0.07, stateIncomeTax: { regime: "graduated", topRate: 0.0599 }, minimumWage: 15.00 },
  SC: { stateSalesTax: 0.06, stateIncomeTax: { regime: "graduated", topRate: 0.062 }, minimumWage: 7.25 },
  SD: { stateSalesTax: 0.042, stateIncomeTax: { regime: "none", topRate: null }, minimumWage: 11.50 },
  TN: { stateSalesTax: 0.07, stateIncomeTax: { regime: "none", topRate: null }, minimumWage: 7.25 },
  TX: { stateSalesTax: 0.0625, stateIncomeTax: { regime: "none", topRate: null }, minimumWage: 7.25 },
  UT: { stateSalesTax: 0.0485, stateIncomeTax: { regime: "flat", topRate: 0.0455 }, minimumWage: 7.25 },
  VT: { stateSalesTax: 0.06, stateIncomeTax: { regime: "graduated", topRate: 0.0875 }, minimumWage: 14.01 },
  VA: { stateSalesTax: 0.053, stateIncomeTax: { regime: "graduated", topRate: 0.0575 }, minimumWage: 12.41 },
  WA: { stateSalesTax: 0.065, stateIncomeTax: { regime: "none", topRate: null }, minimumWage: 16.66 },
  WV: { stateSalesTax: 0.06, stateIncomeTax: { regime: "graduated", topRate: 0.0512 }, minimumWage: 8.75 },
  WI: { stateSalesTax: 0.05, stateIncomeTax: { regime: "graduated", topRate: 0.0765 }, minimumWage: 7.25 },
  WY: { stateSalesTax: 0.04, stateIncomeTax: { regime: "none", topRate: null }, minimumWage: 7.25, minimumWageNotes: "Wyoming's state minimum wage is lower, but the federal rate applies to most covered workers." },
};
