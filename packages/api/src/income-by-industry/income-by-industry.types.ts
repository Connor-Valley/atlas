export type SeniorityLevel = "entry" | "mid" | "senior";

export type IndustrySalaryTier = {
  level: SeniorityLevel;
  annualWage: number | null;
};

export type IndustrySalaryData = {
  industry: string; // opportunity_preference key, e.g. "tech_media_pro"
  industryLabel: string; // friendly label, e.g. "Tech & Professional Services"
  tiers: IndustrySalaryTier[]; // entry / mid / senior, in that order
  employment: number | null; // jobs in the mapped occupation group(s) for this area — job availability
  employmentPerThousand: number | null; // same headcount, normalized as a rate per 1,000 total local jobs — comparable across cities of any size
  locationQuotient: number | null; // industry concentration here vs. the national average (1.0 = same, 2.0 = 2x)
  geographyLevel: "msa" | "state";
  geographyName: string; // e.g. "New York-Newark-Jersey City, NY-NJ" or "New York"
  year: number;
  source: string;
};
