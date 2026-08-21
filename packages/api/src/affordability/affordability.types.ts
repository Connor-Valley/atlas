export type AffordabilityLevel =
    | "Comfortably Affordable"
    | "Affordable"
    | "Moderately Burdened"
    | "Rent Burdened"
    | "Severely Rent Burdened";

export type RentBurdenBand = {
    label: string;  // e.g. "Under 30%", "30–35%", "35–40%", "40–50%", "50%+"
    share: number;  // fraction of renter households (0–1)
};

export type CityAffordability = {
    city: string;
    state: string;
    medianHouseholdIncome: number;
    medianRenterIncome: number | null;   // null when Census suppresses the renter-income sample (e.g. very few renters)
    medianRent: number | null;           // null when Census suppresses median gross rent for the same reason
    annualRent: number | null;
    rentToIncomeRatio: number | null;    // null (not 0) when rent or renter income is unavailable — 0 would wrongly read as "free rent"
    affordability: AffordabilityLevel | null;
};

export type DetailedCityAffordability = CityAffordability & {
    // Renting vs buying
    medianHomeValue: number | null;
    estimatedMortgage: number | null;
    mortgageToIncomeRatio: number | null;

    // Ownership affordability
    priceToIncomeRatio: number | null;
    downPaymentSavingsYears: number | null;
    incomeNeededForMortgage: number | null;

    // Income bridge
    incomeNeededForRent: number;        // annual income needed for rent at 30% threshold
    affordabilityGap: number | null;    // renter income minus income needed (negative = unaffordable)
    medianOwnerIncome: number | null;

    // Rent burden distribution
    rentBurdenPercent: number;          // fraction of renters paying 30%+ of income on rent
    rentBurdenBands: RentBurdenBand[];  // 5-segment distribution

    // Price trends
    fhfaYoyChange: number | null;

    // Gas context (state-level)
    gasVsNationalPct: number | null;       // e.g. 41.0 → gas is 41% above national avg
    incomeVsNationalPct: number | null;    // e.g. 18.0 → city income is 18% above national median
    adjustedFuelBurden: number | null;     // gasVsNationalPct - incomeVsNationalPct (positive = net burden)

    // EV context (state-level)
    electricityVsNationalPct: number | null; // e.g. 67.8 → electricity 67.8% above national avg
    evChargersPerCapita: number | null;      // public chargers per 100k residents
    evAdoptionPct: number | null;            // % of registered vehicles that are EVs
};
