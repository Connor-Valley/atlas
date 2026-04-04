type Winner = "a" | "b" | "tie" | "difference";
type MetricDirection = "higher" | "lower" | "context";
type MetricStyle = "bar" | "text";
type SectionVariant = "bars" | "split" | "pressure" | "context";

export type SummaryScoreSet = {
  income: number;
  housing: number;
  affordability: number;
  people: number;
};

export type ComparedCity = {
  key: "a" | "b";
  city: string;
  state: string;
  cityInfo: any;
  income: any;
  housing: any;
  affordability: any;
  scores: SummaryScoreSet;
};

export type CompareMetric = {
  label: string;
  aText: string;
  bText: string;
  aValue: number | null;
  bValue: number | null;
  aVisual: number | null;
  bVisual: number | null;
  winner: Winner;
  direction: MetricDirection;
  style: MetricStyle;
  centerLabel: string;
};

export type CompareSectionData = {
  id: string;
  title: string;
  icon: string;
  variant: SectionVariant;
  winner: Winner;
  verdict: string;
  insight: string;
  summaryLabel: string;
  summaryDelta: string;
  aSummary: string;
  bSummary: string;
  metrics: CompareMetric[];
};

export type SummaryCardData = {
  title: string;
  icon: string;
  winner: Winner;
  verdict: string;
  delta: string;
  label: string;
  sentence: { before: string; value: string; after: string };
};

export function slugToDisplay(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function cityLabel(city: string, state: string) {
  return `${slugToDisplay(city)}, ${state.toUpperCase()}`;
}

export function calculateScores(cityInfo: any, income: any, housing: any, affordability: any): SummaryScoreSet {
  return {
    income: Math.min(100, Math.round((income.medianHouseholdIncome / 150000) * 100)),
    housing: Math.min(100, Math.round((2000 / housing.housing.medianRent) * 100)),
    affordability: Math.max(0, Math.min(100, Math.round((1 - affordability.rentToIncomeRatio / 0.6) * 100))),
    people: Math.min(100, Math.round((cityInfo.population / 1000000) * 100)),
  };
}

function compareNumeric(a: number | null | undefined, b: number | null | undefined, direction: MetricDirection, tolerance = 0) {
  if (a == null || b == null) return "difference" as const;
  if (Math.abs(a - b) <= tolerance) return "tie" as const;
  if (direction === "context") return "difference" as const;
  if (direction === "higher") return a > b ? "a" : "b";
  return a < b ? "a" : "b";
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return `$${Math.round(value).toLocaleString()}`;
}

function formatPercent(value: number | null | undefined, digits = 1) {
  if (value == null) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

function formatInteger(value: number | null | undefined) {
  if (value == null) return "—";
  return Math.round(value).toLocaleString();
}

function formatDelta(value: number | null | undefined, formatter: (v: number) => string) {
  if (value == null) return "No comparison available";
  return formatter(Math.abs(value));
}

function buildVisualValues(
  aValue: number | null | undefined,
  bValue: number | null | undefined,
  direction: MetricDirection,
) {
  if (aValue == null || bValue == null || direction === "context") {
    return { aVisual: null, bVisual: null };
  }

  if (direction === "higher") {
    const max = Math.max(aValue, bValue, 1);
    return {
      aVisual: (aValue / max) * 100,
      bVisual: (bValue / max) * 100,
    };
  }

  const min = Math.max(Math.min(aValue, bValue), 0.0001);
  return {
    aVisual: Math.min(100, (min / Math.max(aValue, 0.0001)) * 100),
    bVisual: Math.min(100, (min / Math.max(bValue, 0.0001)) * 100),
  };
}

function buildCenterLabel(
  label: string,
  aValue: number | null | undefined,
  bValue: number | null | undefined,
  direction: MetricDirection,
  winner: Winner,
  formatter: (value: number | null | undefined) => string,
) {
  if (aValue == null || bValue == null) return "vs";
  if (winner === "tie") return "Nearly tied";

  const delta = Math.abs(aValue - bValue);
  if (label === "Poverty rate" || label === "Rent / income") {
    return `${delta.toFixed(1)} pts`;
  }
  if (label.toLowerCase().includes("score")) {
    return `${Math.round(delta)} pts`;
  }
  return formatter(delta);
}

function winnerLabel(winner: Winner, cityA: ComparedCity, cityB: ComparedCity) {
  if (winner === "a") return slugToDisplay(cityA.city);
  if (winner === "b") return slugToDisplay(cityB.city);
  if (winner === "tie") return "Nearly tied";
  return "Difference";
}

function buildMetric(
  label: string,
  aValue: number | null | undefined,
  bValue: number | null | undefined,
  direction: MetricDirection,
  formatter: (value: number | null | undefined) => string,
  options?: { tolerance?: number; style?: MetricStyle },
): CompareMetric {
  const winner = compareNumeric(aValue, bValue, direction, options?.tolerance ?? 0);
  const { aVisual, bVisual } = buildVisualValues(aValue, bValue, direction);

  return {
    label,
    aText: formatter(aValue),
    bText: formatter(bValue),
    aValue: aValue ?? null,
    bValue: bValue ?? null,
    aVisual,
    bVisual,
    winner,
    direction,
    style: options?.style ?? "bar",
    centerLabel: buildCenterLabel(label, aValue, bValue, direction, winner, formatter),
  };
}

function sectionVerdict(winner: Winner, cityA: ComparedCity, cityB: ComparedCity) {
  if (winner === "a") return `${slugToDisplay(cityA.city)} leads`;
  if (winner === "b") return `${slugToDisplay(cityB.city)} leads`;
  if (winner === "tie") return "Nearly tied";
  return "Different strengths";
}

export function buildSummaryCards(cityA: ComparedCity, cityB: ComparedCity): SummaryCardData[] {
  const incomeWinner = compareNumeric(cityA.scores.income, cityB.scores.income, "higher", 2);
  const housingWinner = compareNumeric(cityA.scores.housing, cityB.scores.housing, "higher", 2);
  const affordabilityWinner = compareNumeric(cityA.scores.affordability, cityB.scores.affordability, "higher", 2);

  const incomeLeader = winnerLabel(incomeWinner, cityA, cityB);
  const housingLeader = winnerLabel(housingWinner, cityA, cityB);
  const affordLeader = winnerLabel(affordabilityWinner, cityA, cityB);

  const incomeDiff = Math.abs((cityA.income.medianHouseholdIncome ?? 0) - (cityB.income.medianHouseholdIncome ?? 0));
  const rentDiff = Math.abs((cityA.housing.housing.medianRent ?? 0) - (cityB.housing.housing.medianRent ?? 0));
  const rtiDiff = Math.abs(((cityA.affordability.rentToIncomeRatio ?? 0) - (cityB.affordability.rentToIncomeRatio ?? 0)) * 100);

  function incomeSentence(): SummaryCardData["sentence"] {
    if (incomeWinner === "tie") return { before: "Both cities have ", value: "nearly equal", after: " median household incomes." };
    return { before: `${incomeLeader} earns `, value: `$${Math.round(incomeDiff).toLocaleString()}`, after: " more in median household income." };
  }

  function housingSentence(): SummaryCardData["sentence"] {
    if (housingWinner === "tie") return { before: "Median rent is ", value: "nearly equal", after: " in both cities." };
    return { before: `${housingLeader} has `, value: `$${Math.round(rentDiff).toLocaleString()}/mo`, after: " lower median rent." };
  }

  function affordSentence(): SummaryCardData["sentence"] {
    if (affordabilityWinner === "tie") return { before: "Renter burden is ", value: "nearly equal", after: " in both cities." };
    return { before: `${affordLeader} renters spend `, value: `${rtiDiff.toFixed(1)} pts`, after: " less of their income on rent." };
  }

  return [
    {
      title: "Income",
      icon: "mdi-trending-up",
      winner: incomeWinner,
      delta: `${Math.abs(cityA.scores.income - cityB.scores.income)} pts`,
      verdict: incomeWinner === "difference" ? "Different profiles" : `${incomeLeader} • ${Math.abs(cityA.scores.income - cityB.scores.income)} pts`,
      label: "Income Gap",
      sentence: incomeSentence(),
    },
    {
      title: "Housing",
      icon: "mdi-home-city",
      winner: housingWinner,
      delta: `${Math.abs(cityA.scores.housing - cityB.scores.housing)} pts`,
      verdict: housingWinner === "difference" ? "Different profiles" : `${housingLeader} • ${Math.abs(cityA.scores.housing - cityB.scores.housing)} pts`,
      label: "Housing Costs",
      sentence: housingSentence(),
    },
    {
      title: "Affordability",
      icon: "mdi-scale-balance",
      winner: affordabilityWinner,
      delta: `${Math.abs(cityA.scores.affordability - cityB.scores.affordability)} pts`,
      verdict: affordabilityWinner === "difference" ? "Different profiles" : `${affordLeader} • ${Math.abs(cityA.scores.affordability - cityB.scores.affordability)} pts`,
      label: "Affordability",
      sentence: affordSentence(),
    },
  ];
}

export function buildSections(cityA: ComparedCity, cityB: ComparedCity): CompareSectionData[] {
  const incomeWinner = compareNumeric(cityA.scores.income, cityB.scores.income, "higher", 2);
  const incomeDelta = cityA.scores.income - cityB.scores.income;
  const incomeMetrics = [
    buildMetric("Median household income", cityA.income.medianHouseholdIncome, cityB.income.medianHouseholdIncome, "higher", formatCurrency, { tolerance: 1500 }),
    buildMetric("Median renter income", cityA.income.medianRenterIncome, cityB.income.medianRenterIncome, "higher", formatCurrency, { tolerance: 1000 }),
    buildMetric("Poverty rate", cityA.income.povertyRate, cityB.income.povertyRate, "lower", (value) => value == null ? "—" : `${value.toFixed(1)}%`, { tolerance: 0.3 }),
  ];

  const housingWinner = compareNumeric(cityA.scores.housing, cityB.scores.housing, "higher", 2);
  const housingRentDelta = (cityA.housing.housing.medianRent ?? 0) - (cityB.housing.housing.medianRent ?? 0);
  const housingMetrics = [
    buildMetric("Median rent", cityA.housing.housing.medianRent, cityB.housing.housing.medianRent, "lower", formatCurrency, { tolerance: 40 }),
    buildMetric("Renter share", cityA.housing.housing.renterShare, cityB.housing.housing.renterShare, "context", (value) => formatPercent(value), { tolerance: 0.01, style: "text" }),
    buildMetric("Home value", cityA.housing.housing.medianHomeValue ?? null, cityB.housing.housing.medianHomeValue ?? null, "context", formatCurrency, { tolerance: 5000, style: "text" }),
  ];

  const affordabilityWinner = compareNumeric(cityA.scores.affordability, cityB.scores.affordability, "higher", 2);
  const affordabilityMetrics = [
    buildMetric("Affordability score", cityA.scores.affordability, cityB.scores.affordability, "higher", formatInteger, { tolerance: 2 }),
    buildMetric("Rent / income", cityA.affordability.rentToIncomeRatio, cityB.affordability.rentToIncomeRatio, "lower", (value) => formatPercent(value), { tolerance: 0.01 }),
    buildMetric("Median rent", cityA.affordability.medianRent, cityB.affordability.medianRent, "lower", formatCurrency, { tolerance: 40 }),
    (() => {
      const burdenOrder = ["Not Burdened", "Moderately Burdened", "Severely Burdened", "Rent Burdened"];
      const aRank = burdenOrder.indexOf(cityA.affordability.affordability);
      const bRank = burdenOrder.indexOf(cityB.affordability.affordability);
      const statusWinner: Winner =
        aRank >= 0 && bRank >= 0
          ? aRank < bRank ? "a" : aRank > bRank ? "b" : "tie"
          : "difference";
      const tierDiff = aRank >= 0 && bRank >= 0 ? Math.abs(aRank - bRank) : 0;
      return {
        label: "Status",
        aText: cityA.affordability.affordability,
        bText: cityB.affordability.affordability,
        aValue: aRank >= 0 ? aRank : null,
        bValue: bRank >= 0 ? bRank : null,
        aVisual: null,
        bVisual: null,
        winner: statusWinner,
        direction: "context" as MetricDirection,
        style: "text" as MetricStyle,
        centerLabel: statusWinner === "tie" ? "Nearly tied" : tierDiff === 1 ? "1 tier" : `${tierDiff} tiers`,
      };
    })(),
  ];

  return [
    {
      id: "income",
      title: "Income",
      icon: "mdi-trending-up",
      variant: "bars",
      winner: incomeWinner,
      verdict: sectionVerdict(incomeWinner, cityA, cityB),
      insight:
        incomeWinner === "tie"
          ? `Both cities land within ${Math.abs(incomeDelta)} points on the income score.`
          : `${winnerLabel(incomeWinner, cityA, cityB)} has the stronger income profile, with a ${formatDelta(incomeDelta, (value) => `${value} point`)} score edge.`,
      summaryLabel: "Income score",
      summaryDelta: `${Math.abs(incomeDelta)} pts`,
      aSummary: `${cityA.scores.income}/100`,
      bSummary: `${cityB.scores.income}/100`,
      metrics: incomeMetrics,
    },
    {
      id: "housing",
      title: "Housing",
      icon: "mdi-home-city",
      variant: "split",
      winner: housingWinner,
      verdict: sectionVerdict(housingWinner, cityA, cityB),
      insight:
        housingWinner === "tie"
          ? "Housing conditions are nearly even on the dashboard score."
          : housingRentDelta === 0
            ? "Rents are effectively even, so the broader housing mix is doing the work."
            : housingRentDelta < 0
              ? `${slugToDisplay(cityA.city)} rents are ${formatDelta(housingRentDelta, formatCurrency)} lower per month.`
              : `${slugToDisplay(cityB.city)} rents are ${formatDelta(housingRentDelta, formatCurrency)} lower per month.`,
      summaryLabel: "Housing score",
      summaryDelta: `${Math.abs(cityA.scores.housing - cityB.scores.housing)} pts`,
      aSummary: `${cityA.scores.housing}/100`,
      bSummary: `${cityB.scores.housing}/100`,
      metrics: housingMetrics,
    },
    {
      id: "affordability",
      title: "Affordability",
      icon: "mdi-scale-balance",
      variant: "pressure",
      winner: affordabilityWinner,
      verdict: sectionVerdict(affordabilityWinner, cityA, cityB),
      insight:
        affordabilityWinner === "tie"
          ? "Both cities put renters under nearly the same amount of pressure."
          : cityA.affordability.rentToIncomeRatio < cityB.affordability.rentToIncomeRatio
            ? `${slugToDisplay(cityA.city)} asks for a smaller share of renter income, even before broader tradeoffs.`
            : `${slugToDisplay(cityB.city)} asks for a smaller share of renter income, even before broader tradeoffs.`,
      summaryLabel: "Renter pressure",
      summaryDelta: formatDelta((cityA.affordability.rentToIncomeRatio - cityB.affordability.rentToIncomeRatio) * 100, (value) => `${value.toFixed(1)} pts`),
      aSummary: formatPercent(cityA.affordability.rentToIncomeRatio),
      bSummary: formatPercent(cityB.affordability.rentToIncomeRatio),
      metrics: affordabilityMetrics,
    },
  ];
}
