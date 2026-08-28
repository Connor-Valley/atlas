import type { City } from "../cities/cities.types.js";
import type { EducationAttainment } from "./education.types.js";
import { buildCensusGeoQuery } from "../common/census.js";
import { getCached, TTL_ACS_YEAR_SECONDS } from "../common/cache.js";

export function getCityEducation(city: City, year: number): Promise<EducationAttainment> {
  return getCached(`education:${year}:${city.state}:${city.slug}`, () => fetchCityEducation(city, year), {
    ttlSeconds: TTL_ACS_YEAR_SECONDS,
  });
}

async function fetchCityEducation(city: City, year: number): Promise<EducationAttainment> {
  const variables = [
    "B15003_001E", // total population 25+
    "B15003_017E", // HS diploma
    "B15003_018E", // GED / alternative credential
    "B15003_019E", // some college, < 1 year
    "B15003_020E", // some college, 1+ years, no degree
    "B15003_021E", // associate's degree
    "B15003_022E", // bachelor's degree
    "B15003_023E", // master's degree
    "B15003_024E", // professional school degree
    "B15003_025E", // doctorate degree
  ];

  const url =
    `https://api.census.gov/data/${year}/acs/acs5` +
    `?get=${variables.join(",")}` +
    buildCensusGeoQuery(city) +
    (process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : "");

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Census education fetch failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as string[][];
  const row = data[1];
  if (!row) throw new Error("Census education response missing data row");

  const n = (v: string | undefined) => {
    const num = Number(v);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  };

  const [total, hs, ged, someCollege1, someCollege2, associates, bachelors, masters, professional, doctorate] = row;

  const pop = n(total);
  const hsOrHigher = n(hs) + n(ged) + n(someCollege1) + n(someCollege2) + n(associates) + n(bachelors) + n(masters) + n(professional) + n(doctorate);
  const someCollegeOrHigher = n(someCollege1) + n(someCollege2) + n(associates) + n(bachelors) + n(masters) + n(professional) + n(doctorate);
  const bachelorsPlus = n(bachelors) + n(masters) + n(professional) + n(doctorate);
  const graduatePlus = n(masters) + n(professional) + n(doctorate);

  const pct = (num: number) => pop > 0 ? parseFloat(((num / pop) * 100).toFixed(1)) : 0;

  return {
    city: city.name.replace(/\s+city$/i, ""),
    state: city.state,
    population25Plus: pop,
    hsOrHigherPct: pct(hsOrHigher),
    someCollegeOrHigherPct: pct(someCollegeOrHigher),
    bachelorsPlusPct: pct(bachelorsPlus),
    graduatePlusPct: pct(graduatePlus),
    source: {
      sourceName: "U.S. Census Bureau American Community Survey 5-Year Estimates",
      sourceUrl: "https://data.census.gov/table/ACSDT5Y2023.B15003",
      asOf: String(year),
      geographyLevel: city.geographyType,
      methodologyNote:
        "Educational attainment for population 25 years and over (ACS table B15003). " +
        "HS or higher includes diploma, GED, some college, associate's, and higher degrees. " +
        "Bachelor's+ and graduate+ are subsets of that total.",
    },
  };
}
