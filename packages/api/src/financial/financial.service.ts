import type { MetricWithSource, SourceAttribution } from "../common/source.types.js";
import type { City } from "../cities/cities.types.js";
import { buildCensusGeoQuery, toNumber } from "../common/census.js";
import { getCityHousing } from "../housing/housing.service.js";
import type { FinancialDetails, FinancialSummary } from "./financial.types.js";
import { FINANCIAL_REFERENCE_AS_OF, MINIMUM_WAGE_SOURCE_URL, STATE_FINANCIAL_REFERENCE } from "./financial-reference.js";

const NATIONAL_MEDIAN_HOUSEHOLD_INCOME = 80610;

export async function getFinancialSummary(city: City, year: number): Promise<FinancialSummary> {
  const [housing, propertyTaxProxy] = await Promise.all([
    getCityHousing(city, year),
    getPropertyTaxProxy(city, year),
  ]);

  const reference = STATE_FINANCIAL_REFERENCE[city.state];
  const incomeFactor = clamp(city.medianIncome / NATIONAL_MEDIAN_HOUSEHOLD_INCOME, 0.75, 1.45);
  const monthlyBudget = Math.round(
    housing.medianRent +
      deriveGroceries(incomeFactor) +
      deriveUtilities(incomeFactor) +
      deriveTransportation(incomeFactor),
  );

  return {
    city: city.name,
    state: city.state,
    stateIncomeTax: metricWithSource(reference?.stateIncomeTax ?? null, {
      sourceName: "Official state revenue departments",
      asOf: FINANCIAL_REFERENCE_AS_OF,
      geographyLevel: "state",
      methodologyNote: "State income tax policy is curated from official state publications and maintained locally.",
    }),
    stateSalesTax: metricWithSource(reference?.stateSalesTax ?? null, {
      sourceName: "Official state revenue departments",
      asOf: FINANCIAL_REFERENCE_AS_OF,
      geographyLevel: "state",
      methodologyNote: "Base statewide sales tax only. Local option taxes are returned separately when available.",
    }),
    minimumWage: metricWithSource(reference?.minimumWage ?? null, {
      sourceName: "U.S. Department of Labor",
      sourceUrl: MINIMUM_WAGE_SOURCE_URL,
      asOf: FINANCIAL_REFERENCE_AS_OF,
      geographyLevel: "state",
      methodologyNote: reference?.minimumWageNotes,
    }),
    effectivePropertyTax: propertyTaxProxy,
    monthlyBudgetEstimate: metricWithSource(monthlyBudget, {
      sourceName: "Atlas derived budget model",
      asOf: `${year}`,
      geographyLevel: "place",
      methodologyNote: "Combines local median rent with ACS-derived affordability scaling for groceries, utilities, and transportation. Use as a directional planning estimate.",
    }),
    medianRent: housing.medianRent,
    medianHomeValue: housing.medianHomeValue ?? null,
  };
}

export async function getFinancialDetails(city: City, year: number): Promise<FinancialDetails> {
  const summary = await getFinancialSummary(city, year);
  const incomeFactor = clamp(city.medianIncome / NATIONAL_MEDIAN_HOUSEHOLD_INCOME, 0.75, 1.45);
  const groceries = deriveGroceries(incomeFactor);
  const utilities = deriveUtilities(incomeFactor);
  const transportation = deriveTransportation(incomeFactor);
  const housing = summary.medianRent;

  const smallFamilyHousing = Math.round(housing * 1.35);
  const smallFamilyBundle = {
    housing: smallFamilyHousing,
    groceries: Math.round(groceries * 2.1),
    utilities: Math.round(utilities * 1.2),
    transportation: Math.round(transportation * 1.5),
    childcare: null,
  };

  return {
    ...summary,
    taxBreakdown: {
      stateIncomeTax: summary.stateIncomeTax,
      stateSalesTax: summary.stateSalesTax,
      localSalesTax: metricWithSource(null, {
        sourceName: "Official local tax authorities",
        asOf: FINANCIAL_REFERENCE_AS_OF,
        geographyLevel: "county",
        methodologyNote: "Local sales tax is not yet joined universally; this field is reserved for a future official-source expansion.",
      }),
      effectivePropertyTax: summary.effectivePropertyTax,
    },
    wage: summary.minimumWage,
    essentialsCostBundle: {
      housing,
      groceries,
      utilities,
      transportation,
      childcare: null,
    },
    annualIncomeNeededSingleAdult: Math.round(summary.monthlyBudgetEstimate.value * 12),
    annualIncomeNeededSmallFamily: Math.round(
      (smallFamilyBundle.housing + smallFamilyBundle.groceries + smallFamilyBundle.utilities + smallFamilyBundle.transportation) * 12,
    ),
  };
}

async function getPropertyTaxProxy(city: City, year: number): Promise<MetricWithSource<number | null>> {
  const vars = ["B25103_001E", "B25077_001E"];
  const response = await fetch(
    `https://api.census.gov/data/${year}/acs/acs5` +
      `?get=${vars.join(",")}` +
      buildCensusGeoQuery(city) +
      (process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : ""),
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Failed to fetch Census property tax data: ${response.status} ${body}`);
  }

  const data = (await response.json()) as string[][];
  const row = data[1];
  if (!row) {
    throw new Error("Census property tax response missing data row");
  }

  const medianTaxes = toNumber(row[0]);
  const medianHomeValue = toNumber(row[1]);
  const proxy = medianTaxes > 0 && medianHomeValue > 0
    ? Number((medianTaxes / medianHomeValue).toFixed(4))
    : null;

  return metricWithSource(proxy, {
    sourceName: "U.S. Census Bureau ACS 5-year",
    sourceUrl: "https://www.census.gov/data/developers/data-sets/acs-5year.2010.html",
    asOf: `${year}`,
    geographyLevel: "place",
    methodologyNote: "Proxy computed as median annual real estate taxes paid divided by median home value for owner-occupied units.",
  });
}

function deriveGroceries(incomeFactor: number): number {
  return Math.round(360 * incomeFactor);
}

function deriveUtilities(incomeFactor: number): number {
  return Math.round(185 * incomeFactor);
}

function deriveTransportation(incomeFactor: number): number {
  return Math.round(240 * incomeFactor);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function metricWithSource<T>(value: T, source: SourceAttribution): MetricWithSource<T> {
  return { value, source };
}

