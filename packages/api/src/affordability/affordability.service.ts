import type { City } from "../cities/cities.types.js";
import type { CityAffordability, AffordabilityLevel } from "./affordability.types.js";
import { getCityIncome } from "../income/income.service.js";
import { getCityHousing } from "../housing/housing.service.js";

function classifyAffordability(ratio: number): AffordabilityLevel {
  if (ratio <= 0.3) return "Affordable";
  if (ratio <= 0.5) return "Rent Burdened";
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

  const annualRent = housing.medianRent * 12;
  const rentToIncomeRatio =
    income.medianRenterIncome > 0
      ? annualRent / income.medianRenterIncome
      : 0;

  return {
    city: city.name.replace(/\s+city$/i, ""),
    state: city.state,
    medianHouseholdIncome: income.medianHouseholdIncome,
    medianRenterIncome: income.medianRenterIncome,
    medianRent: housing.medianRent,
    annualRent,
    rentToIncomeRatio,
    affordability: classifyAffordability(rentToIncomeRatio),
  };
}
