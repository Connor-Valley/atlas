import type { MetricWithSource, SourceAttribution } from "../common/source.types.js";
import type { City } from "../cities/cities.types.js";
import { buildCensusGeoQuery } from "../common/census.js";
import { FAA_AIRPORT_REFERENCE_AS_OF, FAA_AIRPORT_SOURCE_URL, STATE_PRIMARY_AIRPORTS } from "./airport-reference.js";
import type { AirportInfo, QualityOfLifeDetails, QualityOfLifeSummary } from "./quality-of-life.types.js";

export async function getQualityOfLifeSummary(city: City, year: number): Promise<QualityOfLifeSummary> {
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
  };
}

export async function getQualityOfLifeDetails(city: City, year: number): Promise<QualityOfLifeDetails> {
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
      "Airport values currently use a representative primary commercial airport reference by state until a coordinate-based nearest-airport join lands.",
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
  const airport = STATE_PRIMARY_AIRPORTS[city.state] ?? null;
  return {
    value: airport,
    source: {
      sourceName: "FAA Airport Data",
      sourceUrl: FAA_AIRPORT_SOURCE_URL,
      asOf: FAA_AIRPORT_REFERENCE_AS_OF,
      geographyLevel: "state",
      methodologyNote: "Returns a representative primary commercial airport for the state until a nearest-airport geographic join is added.",
    },
  };
}

function nullMetric(source: SourceAttribution): MetricWithSource<null> {
  return { value: null, source };
}

function toNumber(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
