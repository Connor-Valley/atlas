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
  