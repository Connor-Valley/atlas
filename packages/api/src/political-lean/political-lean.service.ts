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
// county FIPS, sourced from official election data (rather than the national county-level MIT
// dataset). County-level data is a poor proxy for any place whose politics diverge from its
// county's aggregate (see Oxford Charter Township, MI — labeled "Democrat" via Oakland
// County's county-wide number despite voting Strong Republican itself). Add an entry here
// whenever a county's precinct results have been sourced and aggregated up to place level.
//
// The 8 California entries (all but Alameda) were built from UC Berkeley's Statewide
// Database (statewidedatabase.org), which publishes, for every CA county, both precinct-level
// vote totals (Statement of Vote by SR Precinct) AND a precinct-to-city crosswalk with
// population-weighted overlap fractions — no GIS spatial join needed, since UC Berkeley
// already did it: sum each precinct's votes into a city weighted by the crosswalk's
// n_in_city/n fraction (handles precincts that straddle a city line). Alameda was originally
// built via a manual GIS join (ACGov precinct boundaries + Census place boundaries + MEDSL
// vote data) before this simpler statewide source was found; both methods produced
// consistent results for Alameda (independent cross-check).
const PLACE_OVERRIDE_SOURCES: Record<string, { fileName: string; sourceName: string; sourceUrl: string }> = {
  "26125": {
    fileName: "political_lean_2024_oakland_places.json",
    sourceName: "Oakland County, MI — official election results (Clarity Elections)",
    sourceUrl: "https://results.enr.clarityelections.com/MI/Oakland/",
  },
  "06001": {
    fileName: "political_lean_2024_alameda_places.json",
    sourceName: "Alameda County, CA — UC Berkeley Statewide Database precinct-level results",
    sourceUrl: "https://statewidedatabase.org/d20/g24.html",
  },
  "06013": {
    fileName: "political_lean_2024_contra_costa_places.json",
    sourceName: "Contra Costa County, CA — UC Berkeley Statewide Database precinct-level results",
    sourceUrl: "https://statewidedatabase.org/d20/g24.html",
  },
  "06075": {
    fileName: "political_lean_2024_san_francisco_places.json",
    sourceName: "San Francisco County, CA — UC Berkeley Statewide Database precinct-level results",
    sourceUrl: "https://statewidedatabase.org/d20/g24.html",
  },
  "06081": {
    fileName: "political_lean_2024_san_mateo_places.json",
    sourceName: "San Mateo County, CA — UC Berkeley Statewide Database precinct-level results",
    sourceUrl: "https://statewidedatabase.org/d20/g24.html",
  },
  "06085": {
    fileName: "political_lean_2024_santa_clara_places.json",
    sourceName: "Santa Clara County, CA — UC Berkeley Statewide Database precinct-level results",
    sourceUrl: "https://statewidedatabase.org/d20/g24.html",
  },
  "06041": {
    fileName: "political_lean_2024_marin_places.json",
    sourceName: "Marin County, CA — UC Berkeley Statewide Database precinct-level results",
    sourceUrl: "https://statewidedatabase.org/d20/g24.html",
  },
  "06055": {
    fileName: "political_lean_2024_napa_places.json",
    sourceName: "Napa County, CA — UC Berkeley Statewide Database precinct-level results",
    sourceUrl: "https://statewidedatabase.org/d20/g24.html",
  },
  "06095": {
    fileName: "political_lean_2024_solano_places.json",
    sourceName: "Solano County, CA — UC Berkeley Statewide Database precinct-level results",
    sourceUrl: "https://statewidedatabase.org/d20/g24.html",
  },
  "06097": {
    fileName: "political_lean_2024_sonoma_places.json",
    sourceName: "Sonoma County, CA — UC Berkeley Statewide Database precinct-level results",
    sourceUrl: "https://statewidedatabase.org/d20/g24.html",
  },
  // The following nine were built directly from MEDSL's 2024 precinct-level CSV (no state-specific
  // crosswalk needed): each state either resolves `jurisdiction_name` straight to the town/city
  // (New England states + WI) or embeds the city name in the precinct string in a way that maps
  // 1:1 onto the city's boundary with no annexation ambiguity (Des Moines, Boston, Newark — verified
  // precinct-by-precinct against the full county precinct list before shipping). Two other candidates
  // built the same way — Columbus, OH and Charleston, SC — were DROPPED after that same verification
  // step showed their counties name precincts by township/neighborhood, not by city, so a chunk of
  // each city's own annexed area doesn't carry the city's name and silently falls out of the filter.
  "19153": {
    fileName: "political_lean_2024_ia_polk_places.json",
    sourceName: "Polk County, IA — MIT Election Data and Science Lab, Harvard Dataverse (precinct-level, name-parsed)",
    sourceUrl: "https://doi.org/10.7910/DVN/XDJYKC",
  },
  "25025": {
    fileName: "political_lean_2024_ma_suffolk_places.json",
    sourceName: "Suffolk County, MA — MIT Election Data and Science Lab, Harvard Dataverse (precinct-level, all 22 Boston wards)",
    sourceUrl: "https://doi.org/10.7910/DVN/XDJYKC",
  },
  "44007": {
    fileName: "political_lean_2024_ri_providence_places.json",
    sourceName: "Providence County, RI — MIT Election Data and Science Lab, Harvard Dataverse (jurisdiction-level)",
    sourceUrl: "https://doi.org/10.7910/DVN/XDJYKC",
  },
  "09001": {
    fileName: "political_lean_2024_ct_fairfield_places.json",
    sourceName: "Fairfield County, CT — MIT Election Data and Science Lab, Harvard Dataverse (jurisdiction-level)",
    sourceUrl: "https://doi.org/10.7910/DVN/XDJYKC",
  },
  "23005": {
    fileName: "political_lean_2024_me_cumberland_places.json",
    sourceName: "Cumberland County, ME — MIT Election Data and Science Lab, Harvard Dataverse (jurisdiction-level)",
    sourceUrl: "https://doi.org/10.7910/DVN/XDJYKC",
  },
  "33011": {
    fileName: "political_lean_2024_nh_hillsborough_places.json",
    sourceName: "Hillsborough County, NH — MIT Election Data and Science Lab, Harvard Dataverse (jurisdiction-level)",
    sourceUrl: "https://doi.org/10.7910/DVN/XDJYKC",
  },
  "50007": {
    fileName: "political_lean_2024_vt_chittenden_places.json",
    sourceName: "Chittenden County, VT — MIT Election Data and Science Lab, Harvard Dataverse (jurisdiction-level)",
    sourceUrl: "https://doi.org/10.7910/DVN/XDJYKC",
  },
  "55079": {
    fileName: "political_lean_2024_wi_milwaukee_places.json",
    sourceName: "Milwaukee County, WI — MIT Election Data and Science Lab, Harvard Dataverse (jurisdiction-level)",
    sourceUrl: "https://doi.org/10.7910/DVN/XDJYKC",
  },
  "34013": {
    fileName: "political_lean_2024_nj_essex_places.json",
    sourceName: "Essex County, NJ — MIT Election Data and Science Lab, Harvard Dataverse (precinct-level, name-parsed)",
    sourceUrl: "https://doi.org/10.7910/DVN/XDJYKC",
  },
  // Huntsville: matched by polling-place name between the county's own 2024 precinct-level
  // results export (detail.xls, 83 county precincts total, user-provided) and the City of
  // Huntsville's own "MunicipalVotingPrecincts" GIS layer (the subset of those precincts that
  // fall inside city limits). Two of that GIS layer's precincts ("Rivertree Church", "Church on
  // the Hill") had no confident name match in the 2024 county export — likely renamed or added
  // since — and were excluded rather than guessed, so this slightly undercounts Huntsville's
  // true total (37 of ~39 city precincts included).
  "01089": {
    fileName: "political_lean_2024_madison_al_places.json",
    sourceName: "Madison County, AL — official 2024 precinct-level election results, matched to Huntsville's municipal voting precinct boundaries",
    sourceUrl: "https://www.madisoncountyvotesal.gov/voter-resources/polling-locations/",
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

// New York City is one Census place (place code 51000) spanning five separate counties, one
// per borough — so city.countyFips only ever holds ONE of them, and the plain county fallback
// silently stands in for the whole city with whichever borough that happens to be. Since we
// already have accurate 2020 results for all five boroughs individually in the county-level
// dataset, no precinct data is needed here — just a population-weighted blend of the five,
// computed live from leanCache so it stays correct if that file is ever updated. Confirmed
// this matters: Staten Island (Richmond County) actually voted Republican in 2020, which the
// single-county stand-in (e.g. Bronx) erases entirely.
const NYC_STATE_FIPS = "36";
const NYC_PLACE_CODE = "51000";
const NYC_BOROUGH_FIPS_AND_POPULATION: Array<[string, number]> = [
  ["36061", 1629153], // New York County (Manhattan)
  ["36047", 2576771], // Kings County (Brooklyn)
  ["36081", 2270976], // Queens County
  ["36005", 1427056], // Bronx County
  ["36085", 475596],  // Richmond County (Staten Island)
];

function getNycBoroughBlend(): PoliticalLean | null {
  if (!leanCache) return null;
  let totalPop = 0;
  let demWeighted = 0;
  let repWeighted = 0;
  for (const [fips, population] of NYC_BOROUGH_FIPS_AND_POPULATION) {
    const record = leanCache[fips];
    if (!record) return null;
    totalPop += population;
    demWeighted += record.demPct * population;
    repWeighted += record.repPct * population;
  }
  const demPct = parseFloat((demWeighted / totalPop).toFixed(1));
  const repPct = parseFloat((repWeighted / totalPop).toFixed(1));
  const marginPct = parseFloat((demPct - repPct).toFixed(1));
  const a = Math.abs(marginPct);
  const lean: PoliticalLeanLabel =
    a < 5 ? "Swing" :
    a < 10 ? (marginPct > 0 ? "Lean Democrat" : "Lean Republican") :
    a < 20 ? (marginPct > 0 ? "Democrat" : "Republican") :
    (marginPct > 0 ? "Strong Democrat" : "Strong Republican");

  return {
    city: "New York",
    state: "NY",
    year: 2020,
    demPct,
    repPct,
    marginPct,
    lean,
    countyName: "All five boroughs",
    source: {
      sourceName: "MIT Election Data and Science Lab, Harvard Dataverse (population-weighted across all 5 boroughs)",
      sourceUrl: "https://doi.org/10.7910/DVN/VOQCHQ",
      asOf: "2020 Presidential Election",
      geographyLevel: "place",
      methodologyNote:
        "New York City spans five counties (one per borough); this blends each borough's own " +
        "2020 county-level result, weighted by population, instead of standing in with a single " +
        "borough's number for the whole city. Margin = Democrat% − Republican% (positive = " +
        "Democrat advantage). Lean labels: Swing (<5%), Lean (5–10%), [Party] (10–20%), Strong [Party] (20%+).",
    },
  };
}

// These twelve are consolidated city-counties or independent cities: the Census place IS the
// county-equivalent (no separate incorporated area within it), so the "county" fallback isn't
// actually a proxy here — it's already an exact match for the city. They still show up as
// "County Political Lean" (the county-fallback label) with no indication that the number is, in
// fact, exact. Relabeling them as place-level costs nothing (same underlying county-level 2020
// numbers) and stops the UI from under-selling data that's already precinct-accurate for the city.
const COTERMINOUS_CITY_COUNTIES: Record<string, string> = {
  "02020": "Anchorage",       // Municipality of Anchorage (unified city-borough)
  "08031": "Denver",          // City and County of Denver
  "12031": "Jacksonville",    // consolidated with Duval County
  "15003": "Honolulu",        // City and County of Honolulu (all of Oahu)
  "18097": "Indianapolis",    // UniGov, consolidated with Marion County
  "21111": "Louisville",      // Louisville Metro, consolidated with Jefferson County
  "22071": "New Orleans",     // consolidated with Orleans Parish
  "24510": "Baltimore",       // independent city, own county-equivalent
  "47037": "Nashville",       // Metro Nashville, consolidated with Davidson County
  "42101": "Philadelphia",    // coterminous with Philadelphia County
  "51810": "Virginia Beach",  // independent city, own county-equivalent
  "11001": "Washington",      // District of Columbia
};

function getCoterminousCityLean(city: City): PoliticalLean | null {
  const displayName = COTERMINOUS_CITY_COUNTIES[city.countyFips];
  if (!displayName || !leanCache) return null;
  const record = leanCache[city.countyFips];
  if (!record) return null;
  return {
    city: displayName,
    state: city.state,
    year: record.year,
    demPct: record.demPct,
    repPct: record.repPct,
    marginPct: record.marginPct,
    lean: record.lean,
    countyName: record.countyName,
    source: {
      sourceName: POLITICAL_SOURCE.sourceName,
      sourceUrl: POLITICAL_SOURCE.sourceUrl,
      asOf: POLITICAL_SOURCE.asOf,
      geographyLevel: "place",
      methodologyNote:
        `${displayName} is a consolidated city-county (or independent city): its Census place ` +
        "boundary is the same as its county-equivalent, so this county-level result already IS " +
        "the city's result — no separate precinct aggregation is needed. Margin = Democrat% − " +
        "Republican% (positive = Democrat advantage). Lean labels: Swing (<5%), Lean (5–10%), " +
        "[Party] (10–20%), Strong [Party] (20%+).",
    },
  };
}

export function getCityPoliticalLean(city: City): PoliticalLean | null {
  if (city.stateFips === NYC_STATE_FIPS && city.placeCode === NYC_PLACE_CODE) {
    return getNycBoroughBlend();
  }

  const coterminous = getCoterminousCityLean(city);
  if (coterminous) return coterminous;

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
