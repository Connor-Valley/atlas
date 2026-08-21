type CensusGeo = {
  geographyType: "place" | "county-subdivision";
  stateFips: string;
  placeCode: string;
  countyFips: string;
};

export function buildCensusGeoQuery(geo: CensusGeo): string {
  if (geo.geographyType === "county-subdivision") {
    const countyCode = geo.countyFips.slice(2);
    return `&for=county%20subdivision:${geo.placeCode}&in=state:${geo.stateFips}&in=county:${countyCode}`;
  }

  return `&for=place:${geo.placeCode}&in=state:${geo.stateFips}`;
}

// Census ACS uses these negative constants in place of a real value to mean
// "not available" (e.g. median can't be computed from too small a sample).
// They're finite numbers, so a plain `Number.isFinite` check lets them through.
const CENSUS_SENTINEL_VALUES = new Set([
  -111111111, -222222222, -333333333, -444444444,
  -555555555, -666666666, -777777777, -888888888, -999999999,
]);

/**
 * Parses a numeric value from a Census API response row, filtering out
 * Census's "not available" sentinel codes. Returns `fallback` (default 0)
 * for missing, non-numeric, or sentinel values.
 */
export function toNumber(value: string | undefined, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || CENSUS_SENTINEL_VALUES.has(parsed)) return fallback;
  return parsed;
}
