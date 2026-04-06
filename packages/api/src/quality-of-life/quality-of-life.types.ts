import type { MetricWithSource } from "../common/source.types.js";

export type AirportInfo = {
  code: string;
  name: string;
  city: string;
  state: string;
  category: "primary-commercial";
};

export type QualityOfLifeSummary = {
  city: string;
  state: string;
  unemploymentRate: MetricWithSource<number | null>;
  laborForceParticipationRate: MetricWithSource<number | null>;
  violentCrimeRate: MetricWithSource<number | null>;
  propertyCrimeRate: MetricWithSource<number | null>;
  nearestMajorAirport: MetricWithSource<AirportInfo | null>;
};

export type QualityOfLifeDetails = QualityOfLifeSummary & {
  airportDistanceMiles: MetricWithSource<number | null>;
  reportingNotes: string[];
};
