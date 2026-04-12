import type { City } from "../cities/cities.types.js";
import { buildCensusGeoQuery } from "../common/census.js";
import type { SourceAttribution } from "../common/source.types.js";
import type { CityProfileDetails, CityProfileSummary, PercentageBreakdown } from "./city-profile.types.js";
import { getPoliticalAffiliation } from "./politics-reference.js";

const ACS_SOURCE = (year: number): SourceAttribution => ({
  sourceName: "U.S. Census Bureau ACS 5-year",
  sourceUrl: "https://www.census.gov/data/developers/data-sets/acs-5year.2010.html",
  asOf: `${year}`,
  geographyLevel: "place",
});

export async function getCityProfileSummary(city: City, year: number): Promise<CityProfileSummary> {
  const vars = [
    "B01002_001E",
    "B25010_001E",
    "B15003_001E",
    "B15003_022E",
    "B15003_023E",
    "B15003_024E",
    "B15003_025E",
    "B08135_001E",
    "B08301_001E",
    "B08301_010E",
    "B08301_021E",
    "B25003_001E",
    "B25003_002E",
    "B25003_003E",
  ];
  const row = await fetchCensusRow(city, year, vars);
  const n = toNumber;

  const [
    medianAge,
    avgHouseholdSize,
    educationTotal,
    bachelors,
    masters,
    professional,
    doctorate,
    meanCommuteMinutes,
    totalCommuters,
    publicTransit,
    workFromHome,
    occupiedUnits,
    ownerUnits,
    renterUnits,
  ] = row;

  const educationBase = n(educationTotal);
  const bachelorsOrHigher = n(bachelors) + n(masters) + n(professional) + n(doctorate);
  const commuteBase = n(totalCommuters);
  const housingBase = n(occupiedUnits);

  return {
    city: city.name,
    state: city.state,
    county: city.county,
    population: city.population,
    metroArea: null,
    medianAge: toNullableNumber(medianAge),
    averageHouseholdSize: toNullableNumber(avgHouseholdSize),
    educationHeadline: educationBase > 0
      ? `${formatPercent(bachelorsOrHigher / educationBase)} bachelor's or higher`
      : null,
    meanCommuteMinutes: commuteBase > 0 ? Math.round(n(meanCommuteMinutes) / commuteBase) : null,
    remoteWorkShare: commuteBase > 0 ? roundRatio(n(workFromHome) / commuteBase) : null,
    transitShare: commuteBase > 0 ? roundRatio(n(publicTransit) / commuteBase) : null,
    ownerShare: housingBase > 0 ? roundRatio(n(ownerUnits) / housingBase) : null,
    renterShare: housingBase > 0 ? roundRatio(n(renterUnits) / housingBase) : null,
    source: ACS_SOURCE(year),
  };
}

export async function getCityProfileDetails(city: City, year: number): Promise<CityProfileDetails> {
  const summary = await getCityProfileSummary(city, year);
  const politicalAffiliation = await getPoliticalAffiliation(city);

  // Batch 1: age (47) + household (2) = 49 vars
  const vars1 = [
    "B01001_001E",
    "B01001_003E", "B01001_004E", "B01001_005E", "B01001_006E",
    "B01001_007E", "B01001_008E", "B01001_009E", "B01001_010E",
    "B01001_011E", "B01001_012E", "B01001_013E", "B01001_014E",
    "B01001_015E", "B01001_016E", "B01001_017E", "B01001_018E", "B01001_019E",
    "B01001_020E", "B01001_021E", "B01001_022E", "B01001_023E", "B01001_024E", "B01001_025E",
    "B01001_027E", "B01001_028E", "B01001_029E", "B01001_030E",
    "B01001_031E", "B01001_032E", "B01001_033E", "B01001_034E",
    "B01001_035E", "B01001_036E", "B01001_037E", "B01001_038E",
    "B01001_039E", "B01001_040E", "B01001_041E", "B01001_042E", "B01001_043E",
    "B01001_044E", "B01001_045E", "B01001_046E", "B01001_047E", "B01001_048E", "B01001_049E",
    "B11001_001E", "B11001_002E",
  ];

  // Batch 2: race/eth B03002 (9) + nativity (2) + education (25) + commute (5) = 41 vars
  const vars2 = [
    "B03002_001E", "B03002_003E", "B03002_004E", "B03002_005E", "B03002_006E", "B03002_007E", "B03002_008E", "B03002_009E", "B03002_012E",
    "B05002_001E", "B05002_013E",
    "B15003_001E", "B15003_002E", "B15003_003E", "B15003_004E", "B15003_005E", "B15003_006E", "B15003_007E", "B15003_008E", "B15003_009E", "B15003_010E", "B15003_011E", "B15003_012E", "B15003_013E", "B15003_014E", "B15003_015E", "B15003_016E", "B15003_017E", "B15003_018E", "B15003_019E", "B15003_020E", "B15003_021E", "B15003_022E", "B15003_023E", "B15003_024E", "B15003_025E",
    "B08301_001E", "B08301_003E", "B08301_004E", "B08301_010E", "B08301_021E",
  ];

  const [row1, row2] = await Promise.all([
    fetchCensusRow(city, year, vars1),
    fetchCensusRow(city, year, vars2),
  ]);
  const values = [...row1, ...row2].map(toNumber);
  let offset = 0;

  const totalPopulation = values[offset++];
  const maleUnder18 = sum(values.slice(offset, offset + 4)); offset += 4;
  const male18to24 = sum(values.slice(offset, offset + 4)); offset += 4;
  const male25to44 = sum(values.slice(offset, offset + 4)); offset += 4;
  const male45to64 = sum(values.slice(offset, offset + 5)); offset += 5;
  const male65Plus = sum(values.slice(offset, offset + 6)); offset += 6;
  const femaleUnder18 = sum(values.slice(offset, offset + 4)); offset += 4;
  const female18to24 = sum(values.slice(offset, offset + 4)); offset += 4;
  const female25to44 = sum(values.slice(offset, offset + 4)); offset += 4;
  const female45to64 = sum(values.slice(offset, offset + 5)); offset += 5;
  const female65Plus = sum(values.slice(offset, offset + 6)); offset += 6;

  const totalHouseholds = values[offset++];
  const familyHouseholds = values[offset++];

  // B03002: mutually exclusive race × Hispanic/Latino breakdown
  const raceEthTotal = values[offset++];
  const nhWhite = values[offset++];
  const nhBlack = values[offset++];
  const nhNative = values[offset++];
  const nhAsian = values[offset++];
  const nhPacific = values[offset++];
  const nhOther = values[offset++];
  const nhMulti = values[offset++];
  const hispanic = values[offset++];

  const nativityTotal = values[offset++];
  const foreignBorn = values[offset++];

  const educationTotal = values[offset++];
  const lessThanHighSchool = sum(values.slice(offset, offset + 15)); offset += 15;
  const highSchool = sum(values.slice(offset, offset + 2)); offset += 2;
  const someCollege = sum(values.slice(offset, offset + 2)); offset += 2;
  const associates = values[offset++];
  const bachelors = values[offset++];
  const graduate = sum(values.slice(offset, offset + 3)); offset += 3;

  const commuteTotal = values[offset++];
  const droveAlone = values[offset++];
  const carpooled = values[offset++];
  const publicTransit = values[offset++];
  const workFromHome = values[offset++];

  const under18 = maleUnder18 + femaleUnder18;
  const age18to24 = male18to24 + female18to24;
  const age25to44 = male25to44 + female25to44;
  const age45to64 = male45to64 + female45to64;
  const age65Plus = male65Plus + female65Plus;

  const commuteOther = Math.max(0, commuteTotal - droveAlone - carpooled - publicTransit - workFromHome);

  return {
    ...summary,
    ageDistribution: ratioBreakdown(totalPopulation, [
      ["Under 18", under18],
      ["18-24", age18to24],
      ["25-44", age25to44],
      ["45-64", age45to64],
      ["65+", age65Plus],
    ]),
    politicalAffiliationDistribution: politicalAffiliation?.distribution ?? null,
    politicalAffiliationSourceScope: politicalAffiliation?.sourceScope ?? null,
    politicalAffiliationSourceName: politicalAffiliation?.sourceName ?? null,
    politicalAffiliationAsOf: politicalAffiliation?.asOf ?? null,
    householdComposition: ratioBreakdown(totalHouseholds, [
      ["Family households", familyHouseholds],
      ["Non-family households", Math.max(0, totalHouseholds - familyHouseholds)],
    ]),
    raceEthnicityMix: ratioBreakdown(raceEthTotal, [
      ["Hispanic or Latino", hispanic],
      ["White (non-Hispanic)", nhWhite],
      ["Black or African American", nhBlack],
      ["Asian", nhAsian],
      ["Two or more races", nhMulti],
      ["Native American", nhNative],
      ["Pacific Islander", nhPacific],
      ["Other", nhOther],
    ]),
    foreignBornShare: nativityTotal > 0 ? roundRatio(foreignBorn / nativityTotal) : null,
    educationalAttainment: ratioBreakdown(educationTotal, [
      ["Less than high school", lessThanHighSchool],
      ["High school or GED", highSchool],
      ["Some college", someCollege],
      ["Associate degree", associates],
      ["Bachelor's degree", bachelors],
      ["Graduate degree", graduate],
    ]),
    commuteModes: ratioBreakdown(commuteTotal, [
      ["Drove alone", droveAlone],
      ["Carpooled", carpooled],
      ["Public transit", publicTransit],
      ["Worked from home", workFromHome],
      ["Other commute modes", commuteOther],
    ]),
    densityPerSquareMile: null,
  };
}

async function fetchCensusRow(city: City, year: number, vars: string[]): Promise<string[]> {
  const response = await fetch(
      `https://api.census.gov/data/${year}/acs/acs5` +
      `?get=${vars.join(",")}` +
      buildCensusGeoQuery(city) +
      (process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : ""),
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Failed to fetch Census city profile data: ${response.status} ${body}`);
  }

  const data = (await response.json()) as string[][];
  const row = data[1];
  if (!row) {
    throw new Error("Census city profile response missing data row");
  }

  return row.slice(0, vars.length);
}

function ratioBreakdown(total: number, entries: Array<[string, number]>): PercentageBreakdown[] {
  if (total <= 0) {
    return entries.map(([label]) => ({ label, share: 0 }));
  }

  return entries.map(([label, value]) => ({
    label,
    share: roundRatio(value / total),
  }));
}

function roundRatio(value: number): number {
  return Number(value.toFixed(4));
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function toNumber(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNumber(value: string | undefined): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
