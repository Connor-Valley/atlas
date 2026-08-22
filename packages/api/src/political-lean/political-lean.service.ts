import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import type { City } from "../cities/cities.types.js";
import type { PoliticalLean, PoliticalLeanLabel } from "./political-lean.types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, "../data/political_lean_2020.json");

type LeanRecord = {
  year: number;
  demPct: number;
  repPct: number;
  marginPct: number;
  lean: PoliticalLeanLabel;
  countyName: string;
};

type LeanReference = Record<string, LeanRecord>;

// Place-level overrides: real precinct-aggregated results for specific counties, keyed by
// county FIPS, sourced from that county's own official election results site (rather than
// the national county-level MIT dataset). County-level data is a poor proxy for any place
// whose politics diverge from its county's aggregate (see Oxford Charter Township, MI —
// labeled "Democrat" via Oakland County's county-wide number despite voting Strong Republican
// itself). Add an entry here whenever a county's precinct results have been manually sourced
// and aggregated up to place level.
const PLACE_OVERRIDE_SOURCES: Record<string, { fileName: string; sourceName: string; sourceUrl: string }> = {
  "26125": {
    fileName: "political_lean_2024_oakland_places.json",
    sourceName: "Oakland County, MI — official election results (Clarity Elections)",
    sourceUrl: "https://results.enr.clarityelections.com/MI/Oakland/",
  },
};

type PlaceOverrideRecord = {
  placeName: string;
  year: number;
  demPct: number;
  repPct: number;
  marginPct: number;
  lean: PoliticalLeanLabel;
  totalVotes: number;
};

type PlaceOverrideReference = Record<string, Record<string, PlaceOverrideRecord>>;

let leanCache: LeanReference | null = null;
let placeOverrideCache: PlaceOverrideReference = {};

export function initializePoliticalLeanCache(): void {
  try {
    const raw = readFileSync(DATA_FILE, "utf-8");
    leanCache = JSON.parse(raw) as LeanReference;
    console.log(`Political lean reference loaded: ${Object.keys(leanCache).length} counties`);
  } catch (err) {
    console.warn("Failed to load political lean reference file:", err);
  }

  for (const [countyFips, { fileName }] of Object.entries(PLACE_OVERRIDE_SOURCES)) {
    try {
      const raw = readFileSync(path.resolve(__dirname, "../data", fileName), "utf-8");
      placeOverrideCache[countyFips] = JSON.parse(raw) as Record<string, PlaceOverrideRecord>;
      console.log(
        `Political lean place-level override loaded for county ${countyFips}: ` +
        `${Object.keys(placeOverrideCache[countyFips]!).length} places`,
      );
    } catch (err) {
      console.warn(`Failed to load political lean place override file "${fileName}":`, err);
    }
  }
}

// Mirrors the base-name normalization in place-resolver.ts (city vs. "Foo Township" strip),
// plus a township/other tag — Michigan counties can have both a "Royal Oak" city and a
// "Royal Oak Township" as distinct places, so the tag is required to avoid collisions.
function placeOverrideKey(city: City): string {
  const isTownship = city.placeType === "township";
  const base = city.name
    .replace(/\s+charter township$/i, "")
    .replace(/\s+township$/i, "")
    .trim()
    .toLowerCase();
  return `${base}|${isTownship ? "township" : "other"}`;
}

export function getCityPoliticalLean(city: City): PoliticalLean | null {
  const override = placeOverrideCache[city.countyFips]?.[placeOverrideKey(city)];
  const overrideSource = PLACE_OVERRIDE_SOURCES[city.countyFips];
  if (override && overrideSource) {
    return {
      city: city.name.replace(/\s+city$/i, ""),
      state: city.state,
      year: override.year,
      demPct: override.demPct,
      repPct: override.repPct,
      marginPct: override.marginPct,
      lean: override.lean,
      countyName: leanCache?.[city.countyFips]?.countyName ?? "",
      source: {
        sourceName: overrideSource.sourceName,
        sourceUrl: overrideSource.sourceUrl,
        asOf: `${override.year} Presidential Election`,
        geographyLevel: "place",
        methodologyNote:
          `Place-level ${override.year} presidential results, aggregated from official ` +
          "county precinct results (not the county-wide aggregate). Margin = Democrat% − " +
          "Republican% (positive = Democrat advantage). Lean labels: Swing (<5%), Lean " +
          "(5–10%), [Party] (10–20%), Strong [Party] (20%+).",
      },
    };
  }

  if (!leanCache) return null;

  const record = leanCache[city.countyFips];
  if (!record) return null;

  return {
    city: city.name.replace(/\s+city$/i, ""),
    state: city.state,
    year: record.year,
    demPct: record.demPct,
    repPct: record.repPct,
    marginPct: record.marginPct,
    lean: record.lean,
    countyName: record.countyName,
    source: POLITICAL_SOURCE,
  };
}

const POLITICAL_SOURCE = {
  sourceName: "MIT Election Data and Science Lab, Harvard Dataverse",
  sourceUrl: "https://doi.org/10.7910/DVN/VOQCHQ",
  asOf: "2020 Presidential Election",
  geographyLevel: "county" as const,
  methodologyNote:
    "County-level 2020 presidential results. Margin = Democrat% − Republican% (positive = Democrat advantage). " +
    "Lean labels: Swing (<5%), Lean (5–10%), [Party] (10–20%), Strong [Party] (20%+).",
};
