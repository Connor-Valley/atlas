import type { City } from '../cities/cities.types.js';
import type { CityIncome } from './income.types.js'

export async function getCityIncome(city: City, year: number): Promise<CityIncome> {
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
    `&for=place:${city.placeCode}&in=state:${city.stateFips}` +
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
  const n = (v: string | undefined) => {
    const num = Number(v);
    return Number.isFinite(num) ? num : 0;
  };

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
