import type { City } from "../cities/cities.types.js";
import type { EstablishmentDensity, LifestyleSummary } from "./lifestyle.types.js";
import { getCached } from "../common/cache.js";
import { CURRENT_ACS_YEAR } from "../constants.js";

const CBP_YEAR = 2022;

export function getCityLifestyle(city: City): Promise<LifestyleSummary> {
  return getCached(`lifestyle:${city.state}:${city.slug}`, () => fetchCityLifestyle(city));
}

async function fetchCityLifestyle(city: City): Promise<LifestyleSummary> {
  const empty: LifestyleSummary = {
    city: city.name,
    state: city.state,
    restaurants: { total: null, perTenThousandResidents: null },
    bars: { total: null, perTenThousandResidents: null },
    artsAndCulture: { total: null, perTenThousandResidents: null },
    countyPopulation: null,
    source: CBP_SOURCE,
  };

  if (!city.countyFips || city.countyFips.length !== 5) return empty;

  const stateFips = city.countyFips.slice(0, 2);
  const countyCode = city.countyFips.slice(2);

  const [allFood, bars, performingArts, museums, countyPop] = await Promise.all([
    fetchCbpEstablishments(stateFips, countyCode, "722"),   // food services (restaurants + bars)
    fetchCbpEstablishments(stateFips, countyCode, "7224"),  // drinking places only
    fetchCbpEstablishments(stateFips, countyCode, "7111"),  // performing arts companies
    fetchCbpEstablishments(stateFips, countyCode, "712"),   // museums, historical sites, zoos
    fetchCountyPopulation(stateFips, countyCode),
  ]);

  const restaurantCount = allFood !== null && bars !== null ? allFood - bars : allFood;
  const artsCount = (performingArts ?? 0) + (museums ?? 0) || null;

  const density = (count: number | null): EstablishmentDensity => ({
    total: count,
    perTenThousandResidents:
      count !== null && countyPop && countyPop > 0
        ? parseFloat(((count / countyPop) * 10_000).toFixed(2))
        : null,
  });

  return {
    city: city.name,
    state: city.state,
    restaurants: density(restaurantCount),
    bars: density(bars),
    artsAndCulture: density(artsCount),
    countyPopulation: countyPop,
    source: CBP_SOURCE,
  };
}

async function fetchCbpEstablishments(
  stateFips: string,
  countyCode: string,
  naics: string,
): Promise<number | null> {
  const url =
    `https://api.census.gov/data/${CBP_YEAR}/cbp` +
    `?get=NAICS2017,ESTAB&for=county:${countyCode}&in=state:${stateFips}&NAICS2017=${naics}` +
    (process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : "");

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as string[][];
    // Row 0 = headers, row 1+ = data. ESTAB is at index 1.
    const row = data[1];
    if (!row) return null;
    const estab = Number(row[1]);
    return Number.isFinite(estab) ? estab : null;
  } catch {
    return null;
  }
}

async function fetchCountyPopulation(stateFips: string, countyCode: string): Promise<number | null> {
  const url =
    `https://api.census.gov/data/${CURRENT_ACS_YEAR}/acs/acs5` +
    `?get=B01003_001E&for=county:${countyCode}&in=state:${stateFips}` +
    (process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : "");

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as string[][];
    const row = data[1];
    if (!row) return null;
    const pop = Number(row[0]);
    return Number.isFinite(pop) && pop > 0 ? pop : null;
  } catch {
    return null;
  }
}

const CBP_SOURCE = {
  sourceName: "U.S. Census Bureau County Business Patterns",
  sourceUrl: "https://www.census.gov/programs-surveys/cbp.html",
  asOf: `${CBP_YEAR}`,
  geographyLevel: "county" as const,
  methodologyNote:
    "Establishment counts are county-level and normalized per 10,000 county residents. " +
    "Restaurants = NAICS 722 (food services) minus NAICS 7224 (drinking places). " +
    "Arts & culture = NAICS 7111 (performing arts) + NAICS 712 (museums, historical sites, zoos).",
};
