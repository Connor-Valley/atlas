export type PoliticalLeanLabel =
  | "Strong Democrat"
  | "Democrat"
  | "Lean Democrat"
  | "Swing"
  | "Lean Republican"
  | "Republican"
  | "Strong Republican";

export type PoliticalLean = {
  city: string;
  state: string;
  year: number;
  demPct: number;
  repPct: number;
  marginPct: number;
  lean: PoliticalLeanLabel;
  countyName: string;
  source: {
    sourceName: string;
    sourceUrl: string;
    asOf: string;
    geographyLevel: "county";
    methodologyNote: string;
  };
};
