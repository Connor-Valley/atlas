import type { SourceAttribution } from "../common/source.types.js";

export type PercentageBreakdown = {
  label: string;
  share: number;
};

export type CityProfileSummary = {
  city: string;
  state: string;
  county: string;
  population: number;
  metroArea: string | null;
  medianAge: number | null;
  averageHouseholdSize: number | null;
  educationHeadline: string | null;
  meanCommuteMinutes: number | null;
  remoteWorkShare: number | null;
  transitShare: number | null;
  ownerShare: number | null;
  renterShare: number | null;
  source: SourceAttribution;
};

export type UrbanCharacter =
  | 'Urban Core'
  | 'Urban'
  | 'City'
  | 'Suburban City'
  | 'Suburb'
  | 'Small Town'
  | 'Rural';

export type CityProfileDetails = CityProfileSummary & {
  ageDistribution: PercentageBreakdown[];
  politicalAffiliationDistribution: PercentageBreakdown[] | null;
  politicalAffiliationSourceScope: 'city' | 'county' | null;
  politicalAffiliationSourceName: string | null;
  politicalAffiliationAsOf: string | null;
  householdComposition: PercentageBreakdown[];
  raceEthnicityMix: PercentageBreakdown[];
  foreignBornShare: number | null;
  educationalAttainment: PercentageBreakdown[];
  commuteModes: PercentageBreakdown[];
  densityPerSquareMile: number | null;
  urbanCharacter: UrbanCharacter | null;
};
