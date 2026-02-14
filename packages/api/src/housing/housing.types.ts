export type CityHousing = {
    city: string;
    state: string;
    medianRent: number;
    renterShare: number; // Ratio of renters (0.4596 = 45.96%)
    medianHomeValue?: number;
}

export type HousingStructure = {
    singleFamily: number; // Ratio of single-family units (0.6140 = 61.40%)
    duplex: number; // Ratio of duplex units (0.0980 = 9.80%)
    smallApartment: number; // Ratio of 3-9 unit buildings (0.1080 = 10.80%)
    largeApartment: number; // Ratio of 10+ unit buildings (0.1740 = 17.40%)
    mobile: number; // Ratio of mobile homes (0.0040 = 0.40%)
    other: number; // Ratio of other structure types (0.0002 = 0.02%)
};

export type DetailedCityHousing = CityHousing & {
    medianHouseholdIncome: number;
    rentBurdenPercent: number; // Ratio paying 30%+ of income on rent (0.3250 = 32.50%)
    vacancyRate: number; // Ratio of vacant units (0.0650 = 6.50%)
    housingStructure: HousingStructure;
    medianYearBuilt: number;
    estimatedMortgage: number; // Estimated monthly mortgage payment (principal + interest)
    mortgageToIncomeRatio: number; // Monthly mortgage payment to monthly income ratio (0.2850 = 28.50%)
    fhfaData?: FhfaData;
};

export type FhfaData = {
    yoyChange: number; // Year-over-year change ratio (0.0520 = 5.20%)
    qoqChange: number; // Quarter-over-quarter change ratio (0.0110 = 1.10%)
    fiveYearChange?: number; // 5-year change ratio (0.3580 = 35.80%)
    lastUpdated: string; // Quarter format "2024 Q3"
    level: "msa" | "state"; // Data source level
    geographyName: string; // MSA name or state name
};
