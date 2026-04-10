import type { MetricWithSource } from "../common/source.types.js";

export type TransitMode = 'bus' | 'subway' | 'light-rail' | 'commuter-rail' | 'ferry' | 'streetcar' | 'cable-car';

export type TransitAgency = {
  name: string;
  shortName: string;
  modes: TransitMode[];
  annualRidership: number; // NTD unlinked passenger trips
};

export type TransitInfo = {
  agencies: TransitAgency[];
};

export type AirportInfo = {
  code: string;
  name: string;
  city: string;
  state: string;
  category: "primary-commercial";
};

export type AirportBusyness = {
  code: string;
  annualEnplanements: number;
  busyScale: number; // 1–5
  hubCategory: "large" | "medium" | "small" | "regional";
  hubLabel: string;
  nationalPercentile: number; // 0–100
  hubAirlines: string[];
};

export type QualityOfLifeSummary = {
  city: string;
  state: string;
  unemploymentRate: MetricWithSource<number | null>;
  laborForceParticipationRate: MetricWithSource<number | null>;
  violentCrimeRate: MetricWithSource<number | null>;
  propertyCrimeRate: MetricWithSource<number | null>;
  nearestMajorAirport: MetricWithSource<AirportInfo | null>;
  airportBusyness: MetricWithSource<AirportBusyness | null>;
  transitInfo: MetricWithSource<TransitInfo | null>;
};

export type QualityOfLifeDetails = QualityOfLifeSummary & {
  airportDistanceMiles: MetricWithSource<number | null>;
  reportingNotes: string[];
};
