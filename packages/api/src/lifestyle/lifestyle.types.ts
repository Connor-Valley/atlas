import type { SourceAttribution } from "../common/source.types.js";

export type EstablishmentDensity = {
  total: number | null;
  perTenThousandResidents: number | null;
};

export type LifestyleSummary = {
  city: string;
  state: string;
  restaurants: EstablishmentDensity;
  bars: EstablishmentDensity;
  artsAndCulture: EstablishmentDensity;
  countyPopulation: number | null;
  source: SourceAttribution;
};
