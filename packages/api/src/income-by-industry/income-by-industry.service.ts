import type { City } from "../cities/cities.types.js";
import { getCached } from "../common/cache.js";
import { INDUSTRY_SOC_GROUPS, INDUSTRY_LABELS } from "./soc-mapping.js";
import { MSA_CODES } from "./msa-codes.js";
import type { IndustrySalaryData, IndustrySalaryTier, SeniorityLevel } from "./income-by-industry.types.js";

const BLS_BASE = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
const SOURCE = "BLS Occupational Employment & Wage Statistics (OEWS)";

// Datatype codes — verified live against the BLS API (see PR notes): 01 employment,
// 11/13/15 annual 10th/median/90th percentile wage. Median/10th/90th stand in for
// mid/entry/senior — OEWS has no literal "seniority" concept, percentile of the wage
// distribution is the closest real proxy.
// 17 Location Quotient: local employment share of this occupation vs. its national employment
// share — 1.0 = exactly proportional to the national average, 2.0 = twice as concentrated here.
// 16 Employment per 1,000 jobs: this occupation's headcount as a rate against ALL local
// employment — a raw headcount alone is nearly meaningless without knowing the size of the
// metro it's in (50,000 jobs is huge in a small city, tiny in NYC); the rate is comparable
// across any two cities regardless of size.
const DATATYPE = { employment: "01", entry: "11", mid: "13", senior: "15", locationQuotient: "17", employmentPer1000: "16" } as const;
const TIER_DATATYPE: Record<SeniorityLevel, string> = {
  entry: DATATYPE.entry,
  mid: DATATYPE.mid,
  senior: DATATYPE.senior,
};

// Area type letter is part of the series ID itself, not just the area code — M covers both
// metro AND nonmetro areas (verified live), S is statewide. Passing the wrong letter for a
// state-level area code returns "series does not exist" rather than an error, so it fails
// silently as "no data" unless caught in testing.
function buildSeriesId(areaType: "M" | "S", areaCode: string, occupationCode: string, datatype: string): string {
  return `OEU${areaType}${areaCode}000000${occupationCode}${datatype}`;
}

// Matching a city to its metro by name only recognizes the 1-3 "principal cities" a CBSA is
// titled after (e.g. "San Francisco-Oakland-Fremont, CA" never mentions San Leandro, even
// though San Leandro is squarely inside that same metro) — every other constituent city in a
// 100+-municipality metro area would silently miss. Census's own Geocoder resolves a
// coordinate straight to its real Metropolitan Statistical Area, so every city with known
// lat/lon (see cities.service.ts) gets the metro it's actually in, not just the named ones.
const VERIFIED_CBSA_CODES = new Set(MSA_CODES.map((m) => m.cbsaCode));
const GEOCODER_URL = "https://geocoding.geo.census.gov/geocoder/geographies/coordinates";

async function resolveMsaViaGeocoder(city: City): Promise<{ areaCode: string; name: string } | null> {
  if (city.lat == null || city.lon == null) return null;

  const url = `${GEOCODER_URL}?x=${city.lon}&y=${city.lat}&benchmark=Public_AR_Current&vintage=Current_Current&layers=Metropolitan%20Statistical%20Areas&format=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const body = await res.json() as {
      result?: { geographies?: { "Metropolitan Statistical Areas"?: { GEOID: string; BASENAME?: string; NAME?: string }[] } };
    };
    const match = body.result?.geographies?.["Metropolitan Statistical Areas"]?.[0];
    if (!match?.GEOID) return null;
    // Only trust CBSAs actually verified against the live BLS API (see msa-codes.ts) — a real
    // metro the geocoder finds but we haven't confirmed BLS has data for falls to state level
    // instead of guessing at an unverified series ID.
    if (!VERIFIED_CBSA_CODES.has(match.GEOID)) return null;
    return { areaCode: match.GEOID.padStart(7, "0"), name: match.BASENAME ?? match.NAME ?? match.GEOID };
  } catch {
    return null;
  }
}

function resolveMsa(city: City): Promise<{ areaCode: string; name: string } | null> {
  return getCached(`income-by-industry-msa:${city.state}:${city.slug}`, () => resolveMsaViaGeocoder(city));
}

// county-level nonmetro area codes require BLS's own area-definitions crosswalk, which isn't
// bundled here yet (see msa-codes.ts header) — every city that doesn't match an MSA falls
// straight to statewide, same "be honest about the fallback" pattern cost-of-living.service.ts
// uses for its own state-level RPP fallback.
async function resolveGeography(city: City): Promise<{ level: "msa" | "state"; areaType: "M" | "S"; areaCode: string; name: string }> {
  const msa = await resolveMsa(city);
  if (msa) return { level: "msa", areaType: "M", areaCode: msa.areaCode, name: msa.name };
  return { level: "state", areaType: "S", areaCode: `${city.stateFips}00000`, name: city.state };
}

type SeriesPoint = { occupationCode: string; datatype: string; value: number | null };

async function fetchOewsSeries(
  areaType: "M" | "S",
  areaCode: string,
  occupationCodes: string[]
): Promise<SeriesPoint[]> {
  const apiKey = process.env.BLS_API_KEY;
  if (!apiKey) throw new Error("BLS_API_KEY is not configured");

  const jobs: { occupationCode: string; datatype: string; seriesId: string }[] = [];
  for (const occupationCode of occupationCodes) {
    for (const datatype of [DATATYPE.employment, DATATYPE.entry, DATATYPE.mid, DATATYPE.senior, DATATYPE.locationQuotient, DATATYPE.employmentPer1000]) {
      jobs.push({ occupationCode, datatype, seriesId: buildSeriesId(areaType, areaCode, occupationCode, datatype) });
    }
  }

  const res = await fetch(BLS_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seriesid: jobs.map((j) => j.seriesId), registrationkey: apiKey }),
  });
  if (!res.ok) throw new Error(`BLS API request failed: ${res.status}`);
  const body = await res.json() as { Results?: { series?: { seriesID: string; data: { value: string; latest?: string }[] }[] } };

  const bySeriesId = new Map<string, number | null>();
  for (const series of body.Results?.series ?? []) {
    const latest = series.data.find((d) => d.latest === "true") ?? series.data[0];
    bySeriesId.set(series.seriesID, latest ? parseFloat(latest.value) : null);
  }

  return jobs.map((j) => ({
    occupationCode: j.occupationCode,
    datatype: j.datatype,
    value: bySeriesId.get(j.seriesId) ?? null,
  }));
}

// Combines multiple SOC groups for a broad industry bucket (e.g. education_healthcare =
// Education + Healthcare Practitioners) into one figure per tier, weighted by each group's own
// local employment — a group with 10x the workers in this area should sway the number 10x more
// than simply averaging the two groups' wages unweighted would.
function weightedAverage(
  points: SeriesPoint[],
  occupationCodes: string[],
  datatype: string,
  employmentByOcc: Map<string, number>,
): number | null {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const occ of occupationCodes) {
    const value = points.find((p) => p.occupationCode === occ && p.datatype === datatype)?.value;
    const weight = employmentByOcc.get(occ);
    if (value == null || weight == null) continue;
    weightedSum += value * weight;
    weightTotal += weight;
  }
  return weightTotal > 0 ? weightedSum / weightTotal : null;
}

function combineGroups(
  points: SeriesPoint[],
  occupationCodes: string[],
): { tiers: IndustrySalaryTier[]; employment: number | null; locationQuotient: number | null; employmentPerThousand: number | null } {
  const employmentByOcc = new Map<string, number>();
  for (const p of points) {
    if (p.datatype === DATATYPE.employment && p.value != null) employmentByOcc.set(p.occupationCode, p.value);
  }
  const totalEmployment = [...employmentByOcc.values()].reduce((a, b) => a + b, 0);

  const tiers: IndustrySalaryTier[] = (["entry", "mid", "senior"] as SeniorityLevel[]).map((level) => {
    const avg = weightedAverage(points, occupationCodes, TIER_DATATYPE[level], employmentByOcc);
    return { level, annualWage: avg != null ? Math.round(avg) : null };
  });

  const lq = weightedAverage(points, occupationCodes, DATATYPE.locationQuotient, employmentByOcc);

  // Each group's "per 1,000" figure is already a rate against the SAME denominator (this area's
  // total employment across all occupations), so the combined rate for multiple groups is a sum,
  // not an average — two occupation groups at 5 and 3 per 1,000 jobs really do add up to 8 per
  // 1,000 jobs total, the same way their raw headcounts would.
  const per1000Values = occupationCodes
    .map((occ) => points.find((p) => p.occupationCode === occ && p.datatype === DATATYPE.employmentPer1000)?.value)
    .filter((v): v is number => v != null);
  const employmentPerThousand = per1000Values.length
    ? parseFloat(per1000Values.reduce((a, b) => a + b, 0).toFixed(1))
    : null;

  return {
    tiers,
    employment: totalEmployment > 0 ? totalEmployment : null,
    locationQuotient: lq != null ? parseFloat(lq.toFixed(2)) : null,
    employmentPerThousand,
  };
}

async function fetchIndustrySalaryData(city: City, industry: string): Promise<IndustrySalaryData | null> {
  const groups = INDUSTRY_SOC_GROUPS[industry];
  const industryLabel = INDUSTRY_LABELS[industry];
  if (!groups || !industryLabel) return null;

  const geo = await resolveGeography(city);
  const occupationCodes = groups.map((g) => g.code);
  const points = await fetchOewsSeries(geo.areaType, geo.areaCode, occupationCodes);
  const { tiers, employment, locationQuotient, employmentPerThousand } = combineGroups(points, occupationCodes);

  if (tiers.every((t) => t.annualWage == null)) return null;

  return {
    industry,
    industryLabel,
    tiers,
    employment,
    employmentPerThousand,
    locationQuotient,
    geographyLevel: geo.level,
    geographyName: geo.name,
    year: new Date().getFullYear(),
    source: SOURCE,
  };
}

export function getIndustrySalaryData(city: City, industry: string): Promise<IndustrySalaryData | null> {
  return getCached(`income-by-industry:${city.state}:${city.slug}:${industry}`, () =>
    fetchIndustrySalaryData(city, industry)
  );
}

export { INDUSTRY_LABELS };
