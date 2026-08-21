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
  // Extended data (may be null if fetch failed)
  qualityOfLife: any | null;
  cityProfile: any | null;
  detailedAffordability: any | null;
  financial: any | null;
};

export type DumbbellMetric = {
  category: string;
  label: string;
  aFormatted: string;
  bFormatted: string;
  aValue: number | null;
  bValue: number | null;
  aNormalized: number; // 0-100 position on dumbbell
  bNormalized: number;
  winner: Winner;
};

export type VerdictProse = {
  incomeLeader: string;
  incomeDiff: string;
  rentLeader: string;
  rentDiff: string;
  rtiA: string;
  rtiB: string;
  cityAName: string;
  cityBName: string;
  incomeWinner: Winner;
  housingWinner: Winner;
};

export type VerdictColumn = {
  title: string;
  metrics: Array<{ label: string; aValue: string; bValue: string; winner: Winner }>;
  insight: string;
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
  const rent = housing.housing.medianRent;
  const rentToIncomeRatio = affordability.rentToIncomeRatio;
  return {
    income: Math.min(100, Math.round((income.medianHouseholdIncome / 150000) * 100)),
    // rent/ratio can be null when Census suppresses the underlying sample (too few renters) —
    // fall back to a neutral 50 rather than letting missing data score as a perfect 100.
    housing: rent ? Math.min(100, Math.round((2000 / rent) * 100)) : 50,
    affordability: rentToIncomeRatio != null
      ? Math.max(0, Math.min(100, Math.round((1 - rentToIncomeRatio / 0.6) * 100)))
      : 50,
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
        centerLabel: tierDiff === 1 ? "1 tier" : `${tierDiff} tiers`,
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
          : cityA.affordability.rentToIncomeRatio == null || cityB.affordability.rentToIncomeRatio == null
            ? "Rent-to-income data isn't available for at least one of these cities."
            : cityA.affordability.rentToIncomeRatio < cityB.affordability.rentToIncomeRatio
              ? `${slugToDisplay(cityA.city)} asks for a smaller share of renter income, even before broader tradeoffs.`
              : `${slugToDisplay(cityB.city)} asks for a smaller share of renter income, even before broader tradeoffs.`,
      summaryLabel: "Renter pressure",
      summaryDelta: formatDelta(
        cityA.affordability.rentToIncomeRatio == null || cityB.affordability.rentToIncomeRatio == null
          ? null
          : (cityA.affordability.rentToIncomeRatio - cityB.affordability.rentToIncomeRatio) * 100,
        (value) => `${value.toFixed(1)} pts`,
      ),
      aSummary: formatPercent(cityA.affordability.rentToIncomeRatio),
      bSummary: formatPercent(cityB.affordability.rentToIncomeRatio),
      metrics: affordabilityMetrics,
    },
  ];
}

function normalizePair(aVal: number | null, bVal: number | null, direction: MetricDirection): { aN: number; bN: number } {
  if (aVal == null || bVal == null) return { aN: 50, bN: 50 };
  if (aVal === bVal) return { aN: 50, bN: 50 };

  const maxVal = Math.max(Math.abs(aVal), Math.abs(bVal));
  if (maxVal === 0) return { aN: 50, bN: 50 };

  // Overall spread reflects how different the values are
  const relativeDiff = Math.min(Math.abs(aVal - bVal) / maxVal, 1);
  const maxHalfSpread = 8 + relativeDiff * 30; // 8–38

  // City A always anchors LEFT of center, city B always RIGHT.
  // Winner gets full maxHalfSpread from center; loser gets proportionally less
  // so the winning city's dot is visibly further from the midpoint.
  let aFrac: number;
  let bFrac: number;

  if (direction === 'higher') {
    const winnerVal = Math.max(aVal, bVal);
    aFrac = aVal / winnerVal;
    bFrac = bVal / winnerVal;
  } else {
    // lower is better — smaller value is the winner
    const winnerVal = Math.min(aVal, bVal);
    aFrac = winnerVal / aVal;
    bFrac = winnerVal / bVal;
  }

  return {
    aN: 50 - aFrac * maxHalfSpread,
    bN: 50 + bFrac * maxHalfSpread,
  };
}

export function buildDumbbellMetrics(cityA: ComparedCity, cityB: ComparedCity): DumbbellMetric[] {
  function metric(
    category: string,
    label: string,
    aVal: number | null | undefined,
    bVal: number | null | undefined,
    direction: MetricDirection,
    formatter: (v: number | null | undefined) => string,
    tolerance = 0,
  ): DumbbellMetric {
    const aValue = aVal ?? null;
    const bValue = bVal ?? null;
    const winner = compareNumeric(aValue, bValue, direction, tolerance);
    const { aN, bN } = normalizePair(aValue, bValue, direction);
    return { category, label, aFormatted: formatter(aValue), bFormatted: formatter(bValue), aValue, bValue, aNormalized: aN, bNormalized: bN, winner };
  }

  const collegeGradShareA = getCollegeGradShare(cityA.cityProfile);
  const collegeGradShareB = getCollegeGradShare(cityB.cityProfile);
  const unemploymentA = cityA.qualityOfLife?.unemploymentRate?.value ?? null;
  const unemploymentB = cityB.qualityOfLife?.unemploymentRate?.value ?? null;
  const rentBurdenA = cityA.detailedAffordability?.rentBurdenPercent ?? null;
  const rentBurdenB = cityB.detailedAffordability?.rentBurdenPercent ?? null;

  return [
    metric("Income", "Median HH Income", cityA.income.medianHouseholdIncome, cityB.income.medianHouseholdIncome, "higher", formatCurrency, 1500),
    metric("Income", "Median Renter Income", cityA.income.medianRenterIncome, cityB.income.medianRenterIncome, "higher", formatCurrency, 1000),
    metric("Income", "Poverty Rate", cityA.income.povertyRate, cityB.income.povertyRate, "lower", (v) => v == null ? "—" : `${v.toFixed(1)}%`, 0.3),
    metric("Housing", "Median Rent", cityA.housing.housing.medianRent, cityB.housing.housing.medianRent, "lower", (v) => v == null ? "—" : `$${Math.round(v).toLocaleString()}/mo`, 40),
    metric("Housing", "Median Home Value", cityA.housing.housing.medianHomeValue, cityB.housing.housing.medianHomeValue, "lower", formatCurrency, 5000),
    metric("Housing", "Renter Share", cityA.housing.housing.renterShare, cityB.housing.housing.renterShare, "context", (v) => formatPercent(v), 0.01),
    metric("Affordability", "Rent-to-Income", cityA.affordability.rentToIncomeRatio, cityB.affordability.rentToIncomeRatio, "lower", (v) => formatPercent(v), 0.005),
    metric("Affordability", "Share Rent-Burdened", rentBurdenA, rentBurdenB, "lower", (v) => formatPercent(v), 0.01),
    metric("Lifestyle", "Walk Score", null, null, "higher", () => "—"),
    metric("Lifestyle", "Sunny Days / yr", null, null, "higher", () => "—"),
    ...(unemploymentA != null || unemploymentB != null
      ? [metric("Income", "Unemployment Rate", unemploymentA, unemploymentB, "lower", (v) => v == null ? "—" : `${(v * 100).toFixed(1)}%`, 0.002)]
      : []),
    ...(collegeGradShareA != null || collegeGradShareB != null
      ? [metric("Income", "College Grads", collegeGradShareA, collegeGradShareB, "higher", (v) => formatPercent(v), 0.01)]
      : []),
  ];
}

function getCollegeGradShare(cityProfile: any): number | null {
  if (!cityProfile?.educationalAttainment) return null;
  const attainment = cityProfile.educationalAttainment as Array<{ label: string; share: number }>;
  const bachelors = attainment.find(e => e.label === "Bachelor's degree")?.share ?? 0;
  const graduate = attainment.find(e => e.label === "Graduate degree")?.share ?? 0;
  return bachelors + graduate;
}

export function buildVerdictProse(cityA: ComparedCity, cityB: ComparedCity): VerdictProse {
  const incomeWinner = compareNumeric(cityA.income.medianHouseholdIncome, cityB.income.medianHouseholdIncome, "higher", 1500);
  const housingWinner = compareNumeric(cityA.housing.housing.medianRent, cityB.housing.housing.medianRent, "lower", 40);
  const incomeDiff = Math.abs((cityA.income.medianHouseholdIncome ?? 0) - (cityB.income.medianHouseholdIncome ?? 0));
  const rentDiff = Math.abs((cityA.housing.housing.medianRent ?? 0) - (cityB.housing.housing.medianRent ?? 0));

  return {
    cityAName: slugToDisplay(cityA.city),
    cityBName: slugToDisplay(cityB.city),
    incomeLeader: incomeWinner === "a" ? slugToDisplay(cityA.city) : incomeWinner === "b" ? slugToDisplay(cityB.city) : "Neither city",
    incomeDiff: `$${Math.round(incomeDiff).toLocaleString()}`,
    rentLeader: housingWinner === "a" ? slugToDisplay(cityA.city) : housingWinner === "b" ? slugToDisplay(cityB.city) : "Neither city",
    rentDiff: `$${Math.round(rentDiff).toLocaleString()}/mo`,
    rtiA: formatPercent(cityA.affordability.rentToIncomeRatio),
    rtiB: formatPercent(cityB.affordability.rentToIncomeRatio),
    incomeWinner,
    housingWinner,
  };
}

export function buildVerdictColumns(cityA: ComparedCity, cityB: ComparedCity): VerdictColumn[] {
  function row(label: string, aText: string, bText: string, winner: Winner) {
    return { label, aValue: aText, bValue: bText, winner };
  }

  const incomeWinner = compareNumeric(cityA.income.medianHouseholdIncome, cityB.income.medianHouseholdIncome, "higher", 1500);
  const rentWinner = compareNumeric(cityA.housing.housing.medianRent, cityB.housing.housing.medianRent, "lower", 40);
  const affordWinner = compareNumeric(cityA.affordability.rentToIncomeRatio, cityB.affordability.rentToIncomeRatio, "lower", 0.005);

  const unemploymentA = cityA.qualityOfLife?.unemploymentRate?.value ?? null;
  const unemploymentB = cityB.qualityOfLife?.unemploymentRate?.value ?? null;
  const unemployWinner = compareNumeric(unemploymentA, unemploymentB, "lower", 0.002);

  const rentBurdenA = cityA.detailedAffordability?.rentBurdenPercent ?? null;
  const rentBurdenB = cityB.detailedAffordability?.rentBurdenPercent ?? null;
  const rentBurdenWinner = compareNumeric(rentBurdenA, rentBurdenB, "lower", 0.01);

  const groceriesA = cityA.financial?.essentialsCostBundle?.groceries ?? null;
  const groceriesB = cityB.financial?.essentialsCostBundle?.groceries ?? null;
  const groceriesWinner = compareNumeric(groceriesA, groceriesB, "lower", 20);

  const transportA = cityA.financial?.essentialsCostBundle?.transportation ?? null;
  const transportB = cityB.financial?.essentialsCostBundle?.transportation ?? null;
  const transportWinner = compareNumeric(transportA, transportB, "lower", 20);

  const fhfaA = cityA.detailedAffordability?.fhfaYoyChange ?? null;
  const fhfaB = cityB.detailedAffordability?.fhfaYoyChange ?? null;
  const fhfaWinner = compareNumeric(fhfaA, fhfaB, "lower", 0.005);

  const incomeLeader = incomeWinner === "a" ? slugToDisplay(cityA.city) : incomeWinner === "b" ? slugToDisplay(cityB.city) : null;
  const rentLeader = rentWinner === "a" ? slugToDisplay(cityA.city) : rentWinner === "b" ? slugToDisplay(cityB.city) : null;
  const affordLeader = affordWinner === "a" ? slugToDisplay(cityA.city) : affordWinner === "b" ? slugToDisplay(cityB.city) : null;

  return [
    {
      title: "Income",
      metrics: [
        row("Household Median", formatCurrency(cityA.income.medianHouseholdIncome), formatCurrency(cityB.income.medianHouseholdIncome), incomeWinner),
        row("Renter Median", formatCurrency(cityA.income.medianRenterIncome), formatCurrency(cityB.income.medianRenterIncome), compareNumeric(cityA.income.medianRenterIncome, cityB.income.medianRenterIncome, "higher", 1000)),
        row("Poverty", cityA.income.povertyRate != null ? `${cityA.income.povertyRate.toFixed(1)}%` : "—", cityB.income.povertyRate != null ? `${cityB.income.povertyRate.toFixed(1)}%` : "—", compareNumeric(cityA.income.povertyRate, cityB.income.povertyRate, "lower", 0.3)),
        row("Jobless", unemploymentA != null ? `${(unemploymentA * 100).toFixed(1)}%` : "—", unemploymentB != null ? `${(unemploymentB * 100).toFixed(1)}%` : "—", unemployWinner),
      ],
      insight: incomeLeader
        ? `${incomeLeader} carries a higher typical income.`
        : "Income profiles are closely matched.",
    },
    {
      title: "Housing",
      metrics: [
        row("Median Rent", cityA.housing.housing.medianRent != null ? `$${Math.round(cityA.housing.housing.medianRent).toLocaleString()}/mo` : "—", cityB.housing.housing.medianRent != null ? `$${Math.round(cityB.housing.housing.medianRent).toLocaleString()}/mo` : "—", rentWinner),
        row("Home Value", formatCurrency(cityA.housing.housing.medianHomeValue), formatCurrency(cityB.housing.housing.medianHomeValue), compareNumeric(cityA.housing.housing.medianHomeValue, cityB.housing.housing.medianHomeValue, "context", 5000)),
        row("Renter Share", formatPercent(cityA.housing.housing.renterShare), formatPercent(cityB.housing.housing.renterShare), "difference"),
        row("Home Price YoY", fhfaA != null ? `${(fhfaA * 100).toFixed(1)}%` : "—", fhfaB != null ? `${(fhfaB * 100).toFixed(1)}%` : "—", fhfaWinner),
      ],
      insight: rentLeader
        ? `Rents are roughly $${Math.round(Math.abs((cityA.housing.housing.medianRent ?? 0) - (cityB.housing.housing.medianRent ?? 0))).toLocaleString()} apart.`
        : "Rents are effectively even between both cities.",
    },
    {
      title: "Affordability",
      metrics: [
        row("Rent / Income", formatPercent(cityA.affordability.rentToIncomeRatio), formatPercent(cityB.affordability.rentToIncomeRatio), affordWinner),
        row("Rent-Burdened", formatPercent(rentBurdenA), formatPercent(rentBurdenB), rentBurdenWinner),
        row("Groceries", groceriesA != null ? `$${Math.round(groceriesA).toLocaleString()}/mo` : "—", groceriesB != null ? `$${Math.round(groceriesB).toLocaleString()}/mo` : "—", groceriesWinner),
        row("Transport", transportA != null ? `$${Math.round(transportA).toLocaleString()}/mo` : "—", transportB != null ? `$${Math.round(transportB).toLocaleString()}/mo` : "—", transportWinner),
      ],
      insight: affordLeader
        ? `${affordLeader} asks for a smaller share of renter income.`
        : "Renter pressure is identical between both cities.",
    },
  ];
}
