import type { PlaceType } from "../places/place-resolver.js";

export type City = {
    name: string;
    state: string;
    county: string;
    fullName: string;
    slug: string;
    placeType: PlaceType;
    geographyType: "place" | "county-subdivision";

    stateFips: string;
    placeCode: string;
    countyFips: string;
    
    population: number;
    medianIncome: number;
    lat: number | null;
    lon: number | null;
}
