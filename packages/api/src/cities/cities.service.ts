import type { City } from './cities.types.js';
import { STATE_FIPS, type SupportedState } from '../states/states.types.js';

export async function getCity(
  state: string,
  citySlug: string,
  year: number,
): Promise<City> {
  const stateCode = state.toUpperCase() as SupportedState;
  const stateFips = STATE_FIPS[stateCode];

  if (!stateFips) {
    throw new Error(`Unsupported state: ${stateCode}`);
  }

  const response = await fetch(
    `https://api.census.gov/data/${year}/acs/acs5` +
      `?get=NAME,B01003_001E,B19013_001E` +
      `&for=place:*&in=state:${stateFips}` +
      (process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : "")
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Census data");
  }

  const data = (await response.json()) as string[][];
  const [, ...rows] = data;

  const normalizedCity = citySlug.replace(/-/g, ' ').toLowerCase();

  const match = rows.find((row) => {
    const name = row[0].toLowerCase();
    return name.startsWith(`${normalizedCity} city`)
  });

  if (!match) {
    throw new Error("City not found");
  }

  const [
    fullName,
    population,
    medianIncome,
    stateFipsResult,
    placeCode,
  ] = match;

  const cityName = fullName.split(',')[0];

  const { county, countyFips } = await getCountyFromPlace(
    year,
    stateFipsResult,
    placeCode
  );

  return {
    name: cityName,
    state: stateCode,
    county,

    stateFips: stateFipsResult,
    placeCode,
    countyFips,
    
    population: Number(population),
    medianIncome: Number(medianIncome),
  };
}

async function getCountyFromPlace(
  year: number,
  stateFips: string,
  placeCode: string
): Promise<{ county: string; countyFips: string }> {
  // Geography 155: state › place › county (or part) — use "county (or part)" and in=state place
  const tryYear = async (y: number) => {
    const res = await fetch(
      `https://api.census.gov/data/${y}/acs/acs5` +
        `?get=NAME&for=county%20(or%20part):*&in=state:${stateFips}%20place:${placeCode}` +
        (process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : "")
    );
    if (!res.ok) {
      const body = await res.text();
      console.error("Census county-for-place failed", { year: y, status: res.status, stateFips, placeCode, body });
      return null;
    }
    const data = (await res.json()) as string[][];
    const [, ...rows] = data;
    const first = rows[0];
    if (!first || first.length < 4) {
      console.error("Census county response missing row", { stateFips, placeCode, data });
      return null;
    }
    const name = first[0] as string;
    const countyPart = first[3];
    return { county: name.split(",")[0], countyFips: `${stateFips}${countyPart}` };
  };

  const result = await tryYear(year);
  if (result) return result;
  // Fallback: geography 155 may not be available for latest year yet
  if (year !== 2023) {
    const fallback = await tryYear(2023);
    if (fallback) return fallback;
  }
  throw new Error("Failed to fetch county for place");
}

