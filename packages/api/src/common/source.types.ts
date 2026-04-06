export type GeographyLevel =
  | "place"
  | "city"
  | "county"
  | "metro"
  | "state"
  | "federal";

export type SourceAttribution = {
  sourceName: string;
  sourceUrl?: string;
  asOf: string;
  geographyLevel: GeographyLevel;
  methodologyNote?: string;
};

export type MetricWithSource<T> = {
  value: T;
  source: SourceAttribution;
};
