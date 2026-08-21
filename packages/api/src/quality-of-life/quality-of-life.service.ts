import type { MetricWithSource, SourceAttribution } from "../common/source.types.js";
import type { City } from "../cities/cities.types.js";
import { buildCensusGeoQuery, toNumber } from "../common/census.js";
import { BTS_ENPLANEMENTS_AS_OF, BTS_SOURCE_URL, FAA_AIRPORT_REFERENCE_AS_OF, FAA_AIRPORT_SOURCE_URL, findNearestAirport, getAirportBusyness } from "./airport-reference.js";
import { getTransitInfo, NTD_AS_OF, NTD_SOURCE_URL } from "./transit-reference.js";
import type { AirportInfo, QualityOfLifeDetails, QualityOfLifeSummary } from "./quality-of-life.types.js";
import { getCached } from "../common/cache.js";

export function getQualityOfLifeSummary(city: City, year: number): Promise<QualityOfLifeSummary> {
  return getCached(`qol:${year}:${city.state}:${city.slug}`, () => fetchQualityOfLifeSummary(city, year));
}

async function fetchQualityOfLifeSummary(city: City, year: number): Promise<QualityOfLifeSummary> {
  const labor = await fetchLaborMetrics(city, year);
  const airport = getAirport(city);

  return {
    city: city.name,
    state: city.state,
    unemploymentRate: labor.unemploymentRate,
    laborForceParticipationRate: labor.laborForceParticipationRate,
    violentCrimeRate: nullMetric({
      sourceName: "FBI Crime Data Explorer",
      sourceUrl: "https://www.fbi.gov/how-we-can-help-you/more-fbi-services-and-information/ucr",
      asOf: `${year}`,
      geographyLevel: "city",
      methodologyNote: "Official crime metrics are reserved for a future city/county join. This field is intentionally null until the join is reliable.",
    }),
    propertyCrimeRate: nullMetric({
      sourceName: "FBI Crime Data Explorer",
      sourceUrl: "https://www.fbi.gov/how-we-can-help-you/more-fbi-services-and-information/ucr",
      asOf: `${year}`,
      geographyLevel: "city",
      methodologyNote: "Official crime metrics are reserved for a future city/county join. This field is intentionally null until the join is reliable.",
    }),
    nearestMajorAirport: airport,
    airportBusyness: {
      value: airport.value ? getAirportBusyness(airport.value.code) : null,
      source: {
        sourceName: "Bureau of Transportation Statistics",
        sourceUrl: BTS_SOURCE_URL,
        asOf: BTS_ENPLANEMENTS_AS_OF,
        geographyLevel: "place",
      },
    },
    transitInfo: {
      value: city.lat != null && city.lon != null ? getTransitInfo(city.lat, city.lon) : null,
      source: {
        sourceName: "Federal Transit Administration National Transit Database",
        sourceUrl: NTD_SOURCE_URL,
        asOf: NTD_AS_OF,
        geographyLevel: "place",
      },
    },
  };
}

export function getQualityOfLifeDetails(city: City, year: number): Promise<QualityOfLifeDetails> {
  return getCached(`qol-details:${year}:${city.state}:${city.slug}`, () => fetchQualityOfLifeDetails(city, year));
}

async function fetchQualityOfLifeDetails(city: City, year: number): Promise<QualityOfLifeDetails> {
  const summary = await getQualityOfLifeSummary(city, year);

  return {
    ...summary,
    airportDistanceMiles: nullMetric({
      sourceName: "FAA Airport Data",
      sourceUrl: FAA_AIRPORT_SOURCE_URL,
      asOf: FAA_AIRPORT_REFERENCE_AS_OF,
      geographyLevel: "state",
      methodologyNote: "Distance is reserved for a future geographic join using official airport and place coordinates.",
    }),
    reportingNotes: [
      "Labor market metrics come from ACS 5-year place-level estimates for broad coverage.",
      "Nearest airport is determined by haversine distance from the city centroid (Census ACS internal point) to ~170 commercial service airports.",
      "Crime fields remain null until official city/county matching is reliable enough to avoid misleading users.",
    ],
  };
}

async function fetchLaborMetrics(city: City, year: number): Promise<{
  unemploymentRate: MetricWithSource<number | null>;
  laborForceParticipationRate: MetricWithSource<number | null>;
}> {
  const vars = ["B23025_001E", "B23025_003E", "B23025_005E"];
  const response = await fetch(
    `https://api.census.gov/data/${year}/acs/acs5` +
      `?get=${vars.join(",")}` +
      buildCensusGeoQuery(city) +
      (process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : ""),
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Failed to fetch ACS labor metrics: ${response.status} ${body}`);
  }

  const data = (await response.json()) as string[][];
  const row = data[1];
  if (!row) {
    throw new Error("ACS labor metrics response missing data row");
  }

  const totalPopulation16Plus = toNumber(row[0]);
  const laborForce = toNumber(row[1]);
  const unemployed = toNumber(row[2]);
  const source: SourceAttribution = {
    sourceName: "U.S. Census Bureau ACS 5-year",
    sourceUrl: "https://www.census.gov/data/developers/data-sets/acs-5year.2010.html",
    asOf: `${year}`,
    geographyLevel: "place",
  };

  return {
    unemploymentRate: {
      value: laborForce > 0 ? Number((unemployed / laborForce).toFixed(4)) : null,
      source,
    },
    laborForceParticipationRate: {
      value: totalPopulation16Plus > 0 ? Number((laborForce / totalPopulation16Plus).toFixed(4)) : null,
      source,
    },
  };
}

function getAirport(city: City): MetricWithSource<AirportInfo | null> {
  const airport = findNearestAirport(city.lat, city.lon);
  return {
    value: airport ? { code: airport.code, name: airport.name, city: airport.city, state: airport.state, category: airport.category } : null,
    source: {
      sourceName: "FAA Airport Data",
      sourceUrl: FAA_AIRPORT_SOURCE_URL,
      asOf: FAA_AIRPORT_REFERENCE_AS_OF,
      geographyLevel: "place",
      methodologyNote: city.lat != null
        ? "Nearest commercial airport by straight-line (haversine) distance from city centroid."
        : "City coordinates unavailable; airport field is null.",
    },
  };
}

function nullMetric(source: SourceAttribution): MetricWithSource<null> {
  return { value: null, source };
}

