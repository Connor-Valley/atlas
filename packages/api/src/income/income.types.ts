export type IncomeDistribution = {
    under25k: number;
    from25to50k: number;
    from50to75k: number;
    from75to100k: number;
    from100to150k: number;
    over150k: number;
};

export type CityIncome = {
    city: string;
    state: string;
    medianHouseholdIncome: number;
    medianRenterIncome: number;
    totalHouseholds: number;
    incomeDistribution: IncomeDistribution;
    povertyRate: number | null;
};

// ─── Detailed income types ────────────────────────────────────────────────────

export type RawIncomeDistribution = {
    under10k: number;
    from10to15k: number;
    from15to20k: number;
    from20to25k: number;
    from25to30k: number;
    from30to35k: number;
    from35to40k: number;
    from40to45k: number;
    from45to50k: number;
    from50to60k: number;
    from60to75k: number;
    from75to100k: number;
    from100to125k: number;
    from125to150k: number;
    from150to200k: number;
    over200k: number;
};

export type EarningsByEducation = {
    lessThanHS: number | null;
    hsGraduate: number | null;
    someCollege: number | null;
    bachelors: number | null;
    graduate: number | null;
};

export type PovertyDepth = {
    total: number;
    deepPoverty: number;    // < 0.50x FPL
    poverty: number;        // 0.50–0.99x FPL
    nearPoverty: number;    // 1.00–1.24x FPL
    low: number;            // 1.25–1.49x FPL
    moderate: number;       // 1.50–1.84x FPL
    nearMiddle: number;     // 1.85–1.99x FPL
    above200pct: number;    // 2.00x+ FPL
};

export type IndustrySector = {
    name: string;
    count: number;
    share: number; // ratio of total employed (0.1234 = 12.34%)
};

export type IncomeAffordabilityMetrics = {
    rentToIncomeRatio: number | null;        // (medianRent * 12) / medianRenterIncome
    incomeNeededForRent: number;             // annual income at 30% threshold
    affordabilityGap: number | null;         // medianRenterIncome - incomeNeededForRent (negative = unaffordable)
    priceToIncomeRatio: number | null;       // medianHomeValue / medianHHIncome ("years of income to buy")
    downPaymentSavingsYears: number | null;  // years to save 20% down at 10% savings rate
    ownerRenterIncomeGap: number | null;     // medianOwnerIncome / medianRenterIncome
    incomeNeededForMortgage: number | null;  // annual income for mortgage at 28% front-end DTI
};

export type DetailedCityIncome = {
    city: string;
    state: string;
    medianHouseholdIncome: number;
    medianRenterIncome: number;
    medianOwnerIncome: number | null;
    perCapitaIncome: number;
    giniCoefficient: number | null;
    totalHouseholds: number;
    rawIncomeDistribution: RawIncomeDistribution;
    earningsByEducation: EarningsByEducation;
    povertyDepth: PovertyDepth;
    industryBreakdown: IndustrySector[];
    industryDiversityIndex: number | null;
    affordabilityMetrics: IncomeAffordabilityMetrics;
};
  