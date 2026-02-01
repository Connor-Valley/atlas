export type AffordabilityLevel = 
    | "Affordable"
    | "Rent Burdened"
    | "Severely Rent Burdened";

export type CityAffordability = {
    city: string;
    state: string;
    medianHouseholdIncome: number;
    medianRenterIncome: number;
    medianRent: number;
    annualRent: number;
    rentToIncomeRatio: number;
    affordability: AffordabilityLevel;
}