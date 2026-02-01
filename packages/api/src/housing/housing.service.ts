import type { City } from "../cities/cities.types.js";
import type { CityHousing } from "./housing.types.js";

export async function getCityHousing(
  city: City,
  year: number
): Promise<CityHousing> {
  const url =
    `https://api.census.gov/data/${year}/acs/acs5` +
    `?get=` +
    [
      "B25064_001E", // median gross rent
      "B25003_001E", // total occupied units
      "B25003_003E", // renter-occupied units
      "B25077_001E", // median home value
    ].join(",") +
    `&for=place:${city.placeCode}&in=state:${city.stateFips}` +
    (process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : "");

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch housing data: ${res.status} ${text}`);
  }

  const data = (await res.json()) as string[][];
  const row = data[1];
  if (!row) throw new Error("Census housing response missing data row");

  // Census helper (handles nulls / missing values safely)
  const n = (v: string | undefined) => {
    const num = Number(v);
    return Number.isFinite(num) ? num : 0;
  };

  const [
    medianRent,
    totalUnits,
    renterUnits,
    medianHomeValue,
  ] = row;

  const renterShare =
    n(totalUnits) > 0 ? n(renterUnits) / n(totalUnits) : 0;

  const displayCity = city.name.replace(/\s+city$/i, "");

  return {
    city: displayCity,
    state: city.state,
    medianRent: n(medianRent),
    renterShare,
    medianHomeValue: Number.isFinite(Number(medianHomeValue))
      ? Number(medianHomeValue)
      : undefined,
  };
}
