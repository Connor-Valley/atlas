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
    medianRenterIncome: number;
    medianRent: number;
    annualRent: number;
    rentToIncomeRatio: number;
    affordability: AffordabilityLevel;
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
};
