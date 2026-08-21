import type { City } from '../cities/cities.types.js';
import type { CityIncome, DetailedCityIncome, EarningsByEducation, IncomeAffordabilityMetrics, IndustrySector, PovertyDepth, RawIncomeDistribution } from './income.types.js'
import { buildCensusGeoQuery, toNumber } from "../common/census.js";
import { getCached } from "../common/cache.js";

export function getCityIncome(city: City, year: number): Promise<CityIncome> {
  return getCached(`income:${year}:${city.state}:${city.slug}`, () => fetchCityIncome(city, year));
}

async function fetchCityIncome(city: City, year: number): Promise<CityIncome> {
    const url =
    `https://api.census.gov/data/${year}/acs/acs5` +
    `?get=` +
    [
      // headline
      "B19013_001E", // median household income
      "B25119_003E", // median renter household income

      // distribution
      "B19001_001E", // total households
      "B19001_002E", // <10k
      "B19001_003E", // 10-15
      "B19001_004E", // 15-20
      "B19001_005E", // 20-25
      "B19001_006E", // 25-30
      "B19001_007E", // 30-35
      "B19001_008E", // 35-40
      "B19001_009E", // 40-45
      "B19001_010E", // 45-50
      "B19001_011E", // 50-60
      "B19001_012E", // 60-75
      "B19001_013E", // 75-100
      "B19001_014E", // 100-125
      "B19001_015E", // 125-150
      "B19001_016E", // 150-200
      "B19001_017E", // 200+

      "B17001_001E", // total population
      "B17001_002E", // below poverty
    ].join(",") +
    buildCensusGeoQuery(city) +
    (process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : "");

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch Census income data: ${res.status} ${text}`);
  }

  const data = (await res.json()) as string[][];
  const row = data[1];
  if (!row) throw new Error("Census income response missing data row");

  // Helper: Census sometimes returns null-like strings
  const n = toNumber;

  // IMPORTANT: Order here must match the ?get= list above
  const [
    medianIncome,
    medianRenterIncome,

    totalHouseholds,
    b002,
    b003,
    b004,
    b005,
    b006,
    b007,
    b008,
    b009,
    b010,
    b011,
    b012,
    b013,
    b014,
    b015,
    b016,
    b017,

    povertyTotal,
    povertyBelow,

    // trailing geography columns (because Census appends these)
    // stateFipsOut,
    // placeCodeOut,
  ] = row;

  const povertyRate = 
    n(povertyTotal) > 0
      ? (n(povertyBelow) / n(povertyTotal)) * 100
      : null;

  const under25k = n(b002) + n(b003) + n(b004) + n(b005);
  const from25to50k = n(b006) + n(b007) + n(b008) + n(b009) + n(b010);
  const from50to75k = n(b011) + n(b012);
  const from75to100k = n(b013);
  const from100to150k = n(b014) + n(b015);
  const over150k = n(b016) + n(b017);

  const displayCity = city.name.replace(/\s+city$/i, "");

  return {
    city: displayCity,
    state: city.state,
    medianHouseholdIncome: n(medianIncome),
    medianRenterIncome: n(medianRenterIncome),
    totalHouseholds: n(totalHouseholds),
    incomeDistribution: {
      under25k,
      from25to50k,
      from50to75k,
      from75to100k,
      from100to150k,
      over150k,
    },
    povertyRate,
  };
}

// =============================================================================
// Detailed Income
// =============================================================================

const INDUSTRY_NAMES = [
  'Agriculture, Forestry & Mining',
  'Construction',
  'Manufacturing',
  'Wholesale Trade',
  'Retail Trade',
  'Transportation & Utilities',
  'Information',
  'Finance, Insurance & Real Estate',
  'Professional & Management Services',
  'Education, Health & Social Services',
  'Arts, Entertainment & Food Services',
  'Other Services',
  'Public Administration',
] as const;

export function getDetailedCityIncome(city: City, year: number): Promise<DetailedCityIncome> {
  return getCached(`income-details:${year}:${city.state}:${city.slug}`, () => fetchDetailedCityIncome(city, year));
}

async function fetchDetailedCityIncome(city: City, year: number): Promise<DetailedCityIncome> {
  const baseUrl = `https://api.census.gov/data/${year}/acs/acs5`;
  const geo = buildCensusGeoQuery(city);
  const key = process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : '';

  const emp2019Url = `https://api.census.gov/data/2019/acs/acs5?get=B23025_004E` + geo + key;

  const [incomeRow, industryRow, emp2019Row] = await Promise.all([
    fetchCensusRow(
      `${baseUrl}?get=` + [
        // Headline income
        'B19013_001E', // median household income
        'B25119_002E', // median owner household income
        'B25119_003E', // median renter household income
        'B19301_001E', // per capita income
        'B19083_001E', // gini coefficient
        // Earnings by education (B20004)
        'B20004_002E', // less than HS
        'B20004_003E', // HS graduate
        'B20004_004E', // some college / associate's
        'B20004_005E', // bachelor's degree
        'B20004_006E', // graduate or professional degree
        // Poverty depth (C17002)
        'C17002_001E', // total population
        'C17002_002E', // < 0.50x FPL (deep poverty)
        'C17002_003E', // 0.50–0.99x FPL
        'C17002_004E', // 1.00–1.24x FPL
        'C17002_005E', // 1.25–1.49x FPL
        'C17002_006E', // 1.50–1.84x FPL
        'C17002_007E', // 1.85–1.99x FPL
        'C17002_008E', // 2.00x+ FPL
        // Full income distribution (B19001) — all 16 brackets
        'B19001_001E',
        'B19001_002E', 'B19001_003E', 'B19001_004E', 'B19001_005E',
        'B19001_006E', 'B19001_007E', 'B19001_008E', 'B19001_009E',
        'B19001_010E', 'B19001_011E', 'B19001_012E', 'B19001_013E',
        'B19001_014E', 'B19001_015E', 'B19001_016E', 'B19001_017E',
        // Housing vars for derived affordability metrics
        'B25064_001E', // median gross rent
        'B25077_001E', // median home value
      ].join(',') + geo + key
    ),
    fetchCensusRow(
      `${baseUrl}?get=` + [
        'C24030_001E', // total civilian employed 16+
        // Male sectors (_003E–_015E)
        'C24030_003E', 'C24030_004E', 'C24030_005E', 'C24030_006E', 'C24030_007E',
        'C24030_008E', 'C24030_009E', 'C24030_010E', 'C24030_011E', 'C24030_012E',
        'C24030_013E', 'C24030_014E', 'C24030_015E',
        // Female sectors (_017E–_029E)
        'C24030_017E', 'C24030_018E', 'C24030_019E', 'C24030_020E', 'C24030_021E',
        'C24030_022E', 'C24030_023E', 'C24030_024E', 'C24030_025E', 'C24030_026E',
        'C24030_027E', 'C24030_028E', 'C24030_029E',
      ].join(',') + geo + key
    ),
    fetchCensusRow(emp2019Url),
  ]);

  const n = toNumber;
  const nullable = (v: string | undefined): number | null => {
    const num = Number(v);
    return num > 0 ? num : null;
  };

  // ── Parse income row ───────────────────────────────────────────────────────
  const [
    medianHHIncome, medianOwnerIncome, medianRenterIncome,
    perCapitaIncome, giniRaw,
    edu_ltHS, edu_hs, edu_someCollege, edu_bachelors, edu_graduate,
    pov_total, pov_deep, pov_poverty, pov_nearPoverty, pov_low, pov_moderate, pov_nearMiddle, pov_above200,
    totalHouseholds,
    d002, d003, d004, d005, d006, d007, d008, d009, d010,
    d011, d012, d013, d014, d015, d016, d017,
    medianRent, medianHomeValue,
  ] = incomeRow;

  // ── Parse industry row ─────────────────────────────────────────────────────
  const [
    totalEmployed,
    m_agri, m_constr, m_mfg, m_wholesale, m_retail, m_transport,
    m_info, m_finance, m_prof, m_edu, m_arts, m_other, m_pubAdmin,
    f_agri, f_constr, f_mfg, f_wholesale, f_retail, f_transport,
    f_info, f_finance, f_prof, f_edu, f_arts, f_other, f_pubAdmin,
  ] = industryRow;

  const employed = n(totalEmployed);
  const maleSectors = [m_agri, m_constr, m_mfg, m_wholesale, m_retail, m_transport, m_info, m_finance, m_prof, m_edu, m_arts, m_other, m_pubAdmin];
  const femaleSectors = [f_agri, f_constr, f_mfg, f_wholesale, f_retail, f_transport, f_info, f_finance, f_prof, f_edu, f_arts, f_other, f_pubAdmin];

  const industryBreakdown: IndustrySector[] = INDUSTRY_NAMES.map((name, i) => {
    const count = n(maleSectors[i]) + n(femaleSectors[i]);
    return {
      name,
      count,
      share: employed > 0 ? parseFloat((count / employed).toFixed(4)) : 0,
    };
  }).sort((a, b) => b.share - a.share);

  // ── Poverty depth ──────────────────────────────────────────────────────────
  const povertyDepth: PovertyDepth = {
    total: n(pov_total),
    deepPoverty: n(pov_deep),
    poverty: n(pov_poverty),
    nearPoverty: n(pov_nearPoverty),
    low: n(pov_low),
    moderate: n(pov_moderate),
    nearMiddle: n(pov_nearMiddle),
    above200pct: n(pov_above200),
  };

  // ── Earnings by education ──────────────────────────────────────────────────
  const earningsByEducation: EarningsByEducation = {
    lessThanHS: nullable(edu_ltHS),
    hsGraduate: nullable(edu_hs),
    someCollege: nullable(edu_someCollege),
    bachelors: nullable(edu_bachelors),
    graduate: nullable(edu_graduate),
  };

  // ── Raw income distribution ────────────────────────────────────────────────
  const rawIncomeDistribution: RawIncomeDistribution = {
    under10k: n(d002),
    from10to15k: n(d003),
    from15to20k: n(d004),
    from20to25k: n(d005),
    from25to30k: n(d006),
    from30to35k: n(d007),
    from35to40k: n(d008),
    from40to45k: n(d009),
    from45to50k: n(d010),
    from50to60k: n(d011),
    from60to75k: n(d012),
    from75to100k: n(d013),
    from100to125k: n(d014),
    from125to150k: n(d015),
    from150to200k: n(d016),
    over200k: n(d017),
  };

  // ── Employment growth ──────────────────────────────────────────────────────
  const emp2019 = n(emp2019Row[0]);
  const empCurrent = n(totalEmployed);
  const employmentGrowthPct5yr = emp2019 > 0 && empCurrent > 0
    ? parseFloat((((empCurrent - emp2019) / emp2019) * 100).toFixed(1))
    : null;

  // ── Affordability derived metrics ──────────────────────────────────────────
  const rent = n(medianRent);
  const homeValue = n(medianHomeValue);
  const hhIncome = n(medianHHIncome);
  const renterIncome = n(medianRenterIncome);
  const ownerIncome = n(medianOwnerIncome);

  const incomeNeededForRent = rent > 0 ? (rent * 12) / 0.30 : 0;

  // Estimated monthly mortgage (20% down, 6.5% rate, 30yr)
  let estimatedMortgage = 0;
  if (homeValue > 0) {
    const loanAmount = homeValue * 0.80;
    const monthlyRate = 0.065 / 12;
    const payments = 360;
    const compound = Math.pow(1 + monthlyRate, payments);
    estimatedMortgage = Math.round(loanAmount * (monthlyRate * compound) / (compound - 1));
  }

  const affordabilityMetrics: IncomeAffordabilityMetrics = {
    rentToIncomeRatio: renterIncome > 0 ? parseFloat(((rent * 12) / renterIncome).toFixed(4)) : null,
    incomeNeededForRent,
    affordabilityGap: renterIncome > 0 ? Math.round(renterIncome - incomeNeededForRent) : null,
    priceToIncomeRatio: hhIncome > 0 && homeValue > 0 ? parseFloat((homeValue / hhIncome).toFixed(2)) : null,
    downPaymentSavingsYears: hhIncome > 0 && homeValue > 0
      ? parseFloat(((homeValue * 0.20) / (hhIncome * 0.10)).toFixed(1))
      : null,
    ownerRenterIncomeGap: renterIncome > 0 && ownerIncome > 0
      ? parseFloat((ownerIncome / renterIncome).toFixed(2))
      : null,
    incomeNeededForMortgage: estimatedMortgage > 0
      ? Math.round((estimatedMortgage * 12) / 0.28)
      : null,
  };

  return {
    city: city.name.replace(/\s+city$/i, ''),
    state: city.state,
    medianHouseholdIncome: hhIncome,
    medianRenterIncome: renterIncome,
    medianOwnerIncome: ownerIncome > 0 ? ownerIncome : null,
    perCapitaIncome: n(perCapitaIncome),
    giniCoefficient: nullable(giniRaw),
    totalHouseholds: n(totalHouseholds),
    rawIncomeDistribution,
    earningsByEducation,
    povertyDepth,
    industryBreakdown,
    affordabilityMetrics,
    employmentGrowthPct5yr,
  };
}

async function fetchCensusRow(url: string): Promise<string[]> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch Census data: ${res.status} ${text}`);
  }
  const data = (await res.json()) as string[][];
  const row = data[1];
  if (!row) throw new Error('Census response missing data row');
  return row;
}
