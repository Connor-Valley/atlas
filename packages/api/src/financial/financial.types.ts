import type { MetricWithSource } from "../common/source.types.js";

export type TaxPolicy = {
  regime: "none" | "flat" | "graduated" | "interest-and-dividend-only";
  topRate: number | null;
  notes?: string;
};

export type FinancialSummary = {
  city: string;
  state: string;
  stateIncomeTax: MetricWithSource<TaxPolicy | null>;
  stateSalesTax: MetricWithSource<number | null>;
  minimumWage: MetricWithSource<number | null>;
  effectivePropertyTax: MetricWithSource<number | null>;
  monthlyBudgetEstimate: MetricWithSource<number>;
  medianRent: number;
  medianHomeValue: number | null;
};

export type CostBundle = {
  housing: number;
  groceries: number;
  utilities: number;
  transportation: number;
  childcare: number | null;
};

export type FinancialDetails = FinancialSummary & {
  taxBreakdown: {
    stateIncomeTax: MetricWithSource<TaxPolicy | null>;
    stateSalesTax: MetricWithSource<number | null>;
    localSalesTax: MetricWithSource<number | null>;
    effectivePropertyTax: MetricWithSource<number | null>;
  };
  wage: MetricWithSource<number | null>;
  essentialsCostBundle: CostBundle;
  annualIncomeNeededSingleAdult: number;
  annualIncomeNeededSmallFamily: number;
};
