export type EducationAttainment = {
  city: string;
  state: string;
  population25Plus: number;
  hsOrHigherPct: number;
  someCollegeOrHigherPct: number;
  bachelorsPlusPct: number;
  graduatePlusPct: number;
  source: {
    sourceName: string;
    sourceUrl: string;
    asOf: string;
    geographyLevel: "place" | "county-subdivision";
    methodologyNote: string;
  };
};
