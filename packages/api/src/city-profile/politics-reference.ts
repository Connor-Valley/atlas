import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { City } from "../cities/cities.types.js";
import type { PercentageBreakdown } from "./city-profile.types.js";

const SOURCE_NAME = "MIT Election Data and Science Lab / Harvard Dataverse";
const DATA_FILE = "county-politics-2024.json";

type PoliticsResult = {
  distribution: PercentageBreakdown[];
  sourceScope: "county";
  sourceName: string;
  asOf: string;
};

type CountyPoliticsRecord = {
  state: string;
  countyName: string;
  asOf: string;
  sourceName: string;
  sourceScope: "county";
  distribution: PercentageBreakdown[];
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, "../../data", DATA_FILE);

let politicsByCountyFips: Record<string, CountyPoliticsRecord> | null = null;
const missingCountyWarnings = new Set<string>();

export async function getPoliticalAffiliation(city: City): Promise<PoliticsResult | null> {
  const reference = getPoliticsReference();
  const match = reference[city.countyFips];
  if (!match) {
    warnMissingCounty(city);
    return null;
  }

  return {
    distribution: match.distribution,
    sourceScope: "county",
    sourceName: match.sourceName || SOURCE_NAME,
    asOf: match.asOf,
  };
}

function getPoliticsReference(): Record<string, CountyPoliticsRecord> {
  if (politicsByCountyFips) return politicsByCountyFips;

  const raw = readFileSync(DATA_PATH, "utf8");
  politicsByCountyFips = JSON.parse(raw) as Record<string, CountyPoliticsRecord>;
  return politicsByCountyFips;
}

function warnMissingCounty(city: City): void {
  if (process.env.NODE_ENV === "production") return;
  const key = `${city.state}:${city.countyFips}:${city.slug}`;
  if (missingCountyWarnings.has(key)) return;
  missingCountyWarnings.add(key);
  console.warn(
    `Political affiliation data unavailable for ${city.fullName} (countyFips=${city.countyFips}).`,
  );
}
