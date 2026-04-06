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
