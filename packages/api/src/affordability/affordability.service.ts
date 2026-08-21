import type { City } from "../cities/cities.types.js";
import type { CityAffordability, DetailedCityAffordability, AffordabilityLevel, RentBurdenBand } from "./affordability.types.js";
import { buildCensusGeoQuery, toNumber } from "../common/census.js";
import { getCityIncome, getDetailedCityIncome } from "../income/income.service.js";
import { getCityHousing, getDetailedCityHousing } from "../housing/housing.service.js";
import { STATE_GAS_PREMIUMS, NATIONAL_MEDIAN_HOUSEHOLD_INCOME } from "./gas-price-reference.js";
import { STATE_ELECTRICITY_PREMIUMS, STATE_EV_CHARGERS_PER_100K, STATE_EV_ADOPTION_PCT } from "./ev-reference.js";

function classifyAffordability(ratio: number): AffordabilityLevel {
  if (ratio <= 0.25) return "Comfortably Affordable";
  if (ratio <= 0.30) return "Affordable";
  if (ratio <= 0.40) return "Moderately Burdened";
  if (ratio <= 0.50) return "Rent Burdened";
  return "Severely Rent Burdened";
}

export async function getCityAffordability(
  city: City,
  year: number
): Promise<CityAffordability> {
  const [income, housing] = await Promise.all([
    getCityIncome(city, year),
    getCityHousing(city, year),
  ]);

  // A real median rent or renter income is never exactly 0 — Census's ACS 5-year
  // estimates fall back to 0 (post sentinel-filtering) only when the underlying
  // sample was too small to publish. Treat that as "unavailable," not "free."
  const medianRent = housing.medianRent > 0 ? housing.medianRent : null;
  const medianRenterIncome = income.medianRenterIncome > 0 ? income.medianRenterIncome : null;
  const annualRent = medianRent != null ? medianRent * 12 : null;
  const rentToIncomeRatio =
    annualRent != null && medianRenterIncome != null
      ? annualRent / medianRenterIncome
      : null;

  return {
    city: city.name.replace(/\s+city$/i, ""),
    state: city.state,
    medianHouseholdIncome: income.medianHouseholdIncome,
    medianRenterIncome,
    medianRent,
    annualRent,
    rentToIncomeRatio,
    affordability: rentToIncomeRatio != null ? classifyAffordability(rentToIncomeRatio) : null,
  };
}

async function fetchRentBurdenBands(city: City, year: number): Promise<RentBurdenBand[]> {
  const baseUrl = `https://api.census.gov/data/${year}/acs/acs5`;
  const geo = buildCensusGeoQuery(city);
  const key = process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : "";

  const vars = [
    "B25070_001E", // total renter households
    "B25070_002E", // less than 10%
    "B25070_003E", // 10–14.9%
    "B25070_004E", // 15–19.9%
    "B25070_005E", // 20–24.9%
    "B25070_006E", // 25–29.9%
    "B25070_007E", // 30–34.9%
    "B25070_008E", // 35–39.9%
    "B25070_009E", // 40–49.9%
    "B25070_010E", // 50%+
  ];

  const url = `${baseUrl}?get=${vars.join(",")}`+ geo + key;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch Census rent burden data: ${res.status} ${text}`);
  }
  const data = (await res.json()) as string[][];
  const row = data[1];
  if (!row) throw new Error("Census response missing data row");

  const n = toNumber;

  const [total, lt10, t10to15, t15to20, t20to25, t25to30, t30to35, t35to40, t40to50, t50plus] = row.map(n);
  const safe = total > 0 ? total : 1;

  return [
    { label: "Under 30%", share: (lt10 + t10to15 + t15to20 + t20to25 + t25to30) / safe },
    { label: "30–35%",    share: t30to35 / safe },
    { label: "35–40%",    share: t35to40 / safe },
    { label: "40–50%",    share: t40to50 / safe },
    { label: "50%+",      share: t50plus  / safe },
  ];
}

export async function getDetailedCityAffordability(
  city: City,
  year: number
): Promise<DetailedCityAffordability> {
  const [income, housing, rentBurdenBands] = await Promise.all([
    getDetailedCityIncome(city, year),
    getDetailedCityHousing(city, year),
    fetchRentBurdenBands(city, year),
  ]);

  const medianRent = housing.medianRent > 0 ? housing.medianRent : null;
  const medianRenterIncome = income.medianRenterIncome > 0 ? income.medianRenterIncome : null;
  const annualRent = medianRent != null ? medianRent * 12 : null;
  // income.affordabilityMetrics.rentToIncomeRatio is already computed null-safely
  // (see fetchDetailedCityIncome) — reuse it instead of re-deriving to avoid drift.
  const rentToIncomeRatio = income.affordabilityMetrics.rentToIncomeRatio;

  const electricityPremiumDecimal = STATE_ELECTRICITY_PREMIUMS[city.state] ?? null;
  const electricityVsNationalPct = electricityPremiumDecimal !== null ? electricityPremiumDecimal * 100 : null;
  const evChargersPerCapita = STATE_EV_CHARGERS_PER_100K[city.state] ?? null;
  const evAdoptionPct = STATE_EV_ADOPTION_PCT[city.state] ?? null;

  const gasPremiumDecimal = STATE_GAS_PREMIUMS[city.state] ?? null;
  const incomeDecimal = income.medianHouseholdIncome > 0
    ? (income.medianHouseholdIncome - NATIONAL_MEDIAN_HOUSEHOLD_INCOME) / NATIONAL_MEDIAN_HOUSEHOLD_INCOME
    : null;
  const gasVsNationalPct = gasPremiumDecimal !== null ? gasPremiumDecimal * 100 : null;
  const incomeVsNationalPct = incomeDecimal !== null ? incomeDecimal * 100 : null;
  const adjustedFuelBurden = gasVsNationalPct !== null && incomeVsNationalPct !== null
    ? gasVsNationalPct - incomeVsNationalPct
    : null;

  return {
    city: city.name.replace(/\s+city$/i, ""),
    state: city.state,
    medianHouseholdIncome: income.medianHouseholdIncome,
    medianRenterIncome,
    medianRent,
    annualRent,
    rentToIncomeRatio,
    affordability: rentToIncomeRatio != null ? classifyAffordability(rentToIncomeRatio) : null,
    medianHomeValue: housing.medianHomeValue ?? null,
    estimatedMortgage: housing.estimatedMortgage,
    mortgageToIncomeRatio: housing.mortgageToIncomeRatio,
    priceToIncomeRatio: income.affordabilityMetrics.priceToIncomeRatio,
    downPaymentSavingsYears: income.affordabilityMetrics.downPaymentSavingsYears,
    incomeNeededForMortgage: income.affordabilityMetrics.incomeNeededForMortgage,
    incomeNeededForRent: income.affordabilityMetrics.incomeNeededForRent,
    affordabilityGap: income.affordabilityMetrics.affordabilityGap,
    medianOwnerIncome: income.medianOwnerIncome ?? null,
    rentBurdenPercent: housing.rentBurdenPercent,
    rentBurdenBands,
    fhfaYoyChange: housing.fhfaData?.yoyChange ?? null,
    gasVsNationalPct,
    incomeVsNationalPct,
    adjustedFuelBurden,
    electricityVsNationalPct,
    evChargersPerCapita,
    evAdoptionPct,
  };
}
