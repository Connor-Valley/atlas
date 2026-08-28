import type { City } from './cities.types.js';
import { STATE_FIPS, type SupportedState } from '../states/states.types.js';
import { buildCensusGeoQuery } from "../common/census.js";
import { resolvePlace } from "../places/place-resolver.js";
import { getCached, TTL_ACS_YEAR_SECONDS } from "../common/cache.js";

export async function getCity(
  state: string,
  citySlug: string,
  year: number,
): Promise<City> {
  return getCached(`city:${year}:${state}:${citySlug}`, () => fetchCity(state, citySlug, year), {
    ttlSeconds: TTL_ACS_YEAR_SECONDS,
  });
}

async function fetchCity(
  state: string,
  citySlug: string,
  year: number,
): Promise<City> {
  const stateCode = state.toUpperCase() as SupportedState;
  const stateFips = STATE_FIPS[stateCode];

  if (!stateFips) {
    throw new Error(`Unsupported state: ${stateCode}`);
  }

  const place = await resolvePlace(stateCode, citySlug, year);
  const incomeResponse = await fetch(
    `https://api.census.gov/data/${year}/acs/acs5` +
      `?get=B19013_001E${buildCensusGeoQuery(place)}` +
      (process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : ""),
  );

  if (!incomeResponse.ok) {
    const body = await incomeResponse.text().catch(() => "");
    throw new Error(`Failed to fetch Census data: ${incomeResponse.status} ${body}`);
  }

  const incomeData = (await incomeResponse.json()) as string[][];
  const medianIncome = incomeData[1]?.[0];

  // Fetch city centroid coordinates separately — INTPTLAT/INTPTLONG are geographic
  // variables that must be requested via the geography endpoint.
  const { lat, lon, landAreaSqMiles } = await fetchCityCoordinates(place, year);

  const { county, countyFips } = place.geographyType === "county-subdivision"
    ? {
        county: normalizeCountyName(place.fullName.split(",")[1] ?? ""),
        countyFips: place.countyFips,
      }
    : await getCountyFromPlace(year, place.stateFips, place.placeCode);

  return {
    name: place.displayName,
    state: stateCode,
    county,
    fullName: place.fullName,
    slug: place.slug,
    placeType: place.placeType,
    geographyType: place.geographyType,

    stateFips: place.stateFips,
    placeCode: place.placeCode,
    countyFips,
    
    population: place.population,
    medianIncome: Number(medianIncome),
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    landAreaSqMiles,
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
    const countyName = name.split(",")[0].replace(/ \(part\)$/i, '');
    return { county: countyName, countyFips: `${stateFips}${countyPart}` };
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

/**
 * Fetch the city centroid coordinates via the Census TIGERweb REST API.
 * - Places (incorporated cities, CDPs): TIGERweb MapServer layer 28
 * - County subdivisions (townships, etc.): TIGERweb MapServer layer 36
 * Returns null/null on any failure so coordinate absence never breaks the main city lookup.
 */
async function fetchCityCoordinates(
  place: { geographyType: "place" | "county-subdivision"; stateFips: string; placeCode: string; countyFips: string },
  _year: number,
): Promise<{ lat: number | null; lon: number | null; landAreaSqMiles: number | null }> {
  try {
    // GEOID format:
    //   place:              stateFips(2) + placeCode(5)           = 7 digits
    //   county-subdivision: countyFips(5) + placeCode(5)          = 10 digits
    const geoid =
      place.geographyType === "county-subdivision"
        ? `${place.countyFips}${place.placeCode}`
        : `${place.stateFips}${place.placeCode}`;
    const layer = place.geographyType === "county-subdivision" ? 22 : 28;

    const url =
      `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/${layer}/query` +
      `?where=${encodeURIComponent(`GEOID = '${geoid}'`)}&outFields=INTPTLAT,INTPTLON,AREALAND&f=json`;

    const res = await fetch(url);
    if (!res.ok) return { lat: null, lon: null, landAreaSqMiles: null };

    type TigerResponse = { features?: Array<{ attributes: { INTPTLAT: string; INTPTLON: string; AREALAND: string } }> };
    const data = (await res.json()) as TigerResponse;
    const attrs = data.features?.[0]?.attributes;
    if (!attrs) return { lat: null, lon: null, landAreaSqMiles: null };

    const lat = Number(attrs.INTPTLAT);
    const lon = Number(attrs.INTPTLON);
    const alandSqMeters = Number(attrs.AREALAND);
    const landAreaSqMiles = Number.isFinite(alandSqMeters) && alandSqMeters > 0
      ? parseFloat((alandSqMeters / 2_589_988.11).toFixed(4))
      : null;

    return {
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
      landAreaSqMiles,
    };
  } catch {
    return { lat: null, lon: null, landAreaSqMiles: null };
  }
}

function normalizeCountyName(value: string): string {
  return value.replace(/\bCounty\b/i, "").trim();
}
