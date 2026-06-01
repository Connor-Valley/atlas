export type ColCategory =
  | "Much Below Average"
  | "Below Average"
  | "Near Average"
  | "Above Average"
  | "Much Above Average";

export type CostOfLivingIndex = {
  city: string;
  state: string;
  rppIndex: number;
  rppVsNational: number;
  category: ColCategory;
  level: "msa" | "state";
  geographyName: string;
  year: number;
  source: {
    sourceName: string;
    sourceUrl: string;
    asOf: string;
    geographyLevel: "msa" | "state";
    methodologyNote: string;
  };
};
