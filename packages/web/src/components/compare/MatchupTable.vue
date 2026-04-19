<script setup lang="ts">
import { computed } from "vue";
import type { ComparedCity } from "../../lib/compare";

const props = defineProps<{
  cityA: ComparedCity;
  cityB: ComparedCity;
}>();

type Winner = "a" | "b" | "tie" | "difference";

function compareNum(a: number | null, b: number | null, dir: "higher" | "lower", tol = 0): Winner {
  if (a == null || b == null) return "difference";
  if (Math.abs(a - b) <= tol) return "tie";
  if (dir === "higher") return a > b ? "a" : "b";
  return a < b ? "a" : "b";
}

function fmt$( v: number | null | undefined): string {
  return v == null ? "—" : `$${Math.round(v).toLocaleString()}`;
}
function fmt$mo(v: number | null | undefined): string {
  return v == null ? "—" : `$${Math.round(v).toLocaleString()}/mo`;
}
function fmtPct(v: number | null | undefined, scale = 1): string {
  if (v == null) return "—";
  return `${(v * scale * 100).toFixed(1)}%`;
}
function fmtPctRaw(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v.toFixed(1)}%`;
}

const a = computed(() => props.cityA);
const b = computed(() => props.cityB);

const categories = computed(() => {
  const unemploymentA = a.value.qualityOfLife?.unemploymentRate?.value ?? null;
  const unemploymentB = b.value.qualityOfLife?.unemploymentRate?.value ?? null;

  const collegeGradA = getCollegeGrad(a.value);
  const collegeGradB = getCollegeGrad(b.value);

  const rentBurdenA = a.value.detailedAffordability?.rentBurdenPercent ?? null;
  const rentBurdenB = b.value.detailedAffordability?.rentBurdenPercent ?? null;

  const fhfaA = a.value.detailedAffordability?.fhfaYoyChange ?? null;
  const fhfaB = b.value.detailedAffordability?.fhfaYoyChange ?? null;

  const groceriesA = a.value.financial?.essentialsCostBundle?.groceries ?? null;
  const groceriesB = b.value.financial?.essentialsCostBundle?.groceries ?? null;

  const transportA = a.value.financial?.essentialsCostBundle?.transportation ?? null;
  const transportB = b.value.financial?.essentialsCostBundle?.transportation ?? null;

  return [
    {
      title: "Income & Jobs",
      rows: [
        { label: "Median HH Income", aVal: fmt$(a.value.income.medianHouseholdIncome), bVal: fmt$(b.value.income.medianHouseholdIncome), winner: compareNum(a.value.income.medianHouseholdIncome, b.value.income.medianHouseholdIncome, "higher", 1500) },
        { label: "Median Renter Income", aVal: fmt$(a.value.income.medianRenterIncome), bVal: fmt$(b.value.income.medianRenterIncome), winner: compareNum(a.value.income.medianRenterIncome, b.value.income.medianRenterIncome, "higher", 1000) },
        { label: "Poverty Rate", aVal: fmtPctRaw(a.value.income.povertyRate), bVal: fmtPctRaw(b.value.income.povertyRate), winner: compareNum(a.value.income.povertyRate, b.value.income.povertyRate, "lower", 0.3) },
        { label: "Unemployment", aVal: fmtPct(unemploymentA), bVal: fmtPct(unemploymentB), winner: compareNum(unemploymentA, unemploymentB, "lower", 0.002) },
        { label: "College Grads", aVal: fmtPct(collegeGradA), bVal: fmtPct(collegeGradB), winner: compareNum(collegeGradA, collegeGradB, "higher", 0.01) },
      ],
    },
    {
      title: "Housing",
      rows: [
        { label: "Median Rent", aVal: fmt$mo(a.value.housing.housing.medianRent), bVal: fmt$mo(b.value.housing.housing.medianRent), winner: compareNum(a.value.housing.housing.medianRent, b.value.housing.housing.medianRent, "lower", 40) },
        { label: "Home Value", aVal: fmt$(a.value.housing.housing.medianHomeValue), bVal: fmt$(b.value.housing.housing.medianHomeValue), winner: compareNum(a.value.housing.housing.medianHomeValue, b.value.housing.housing.medianHomeValue, "lower", 5000) },
        { label: "Renter Share", aVal: fmtPct(a.value.housing.housing.renterShare), bVal: fmtPct(b.value.housing.housing.renterShare), winner: "difference" as Winner },
        { label: "Home Price YoY", aVal: fhfaA != null ? `${(fhfaA * 100).toFixed(1)}%` : "—", bVal: fhfaB != null ? `${(fhfaB * 100).toFixed(1)}%` : "—", winner: compareNum(fhfaA, fhfaB, "lower", 0.005) },
      ],
    },
    {
      title: "Affordability",
      rows: [
        { label: "Rent / Income", aVal: fmtPct(a.value.affordability.rentToIncomeRatio), bVal: fmtPct(b.value.affordability.rentToIncomeRatio), winner: compareNum(a.value.affordability.rentToIncomeRatio, b.value.affordability.rentToIncomeRatio, "lower", 0.005) },
        { label: "Share Rent-Burdened", aVal: fmtPct(rentBurdenA), bVal: fmtPct(rentBurdenB), winner: compareNum(rentBurdenA, rentBurdenB, "lower", 0.01) },
        { label: "Groceries", aVal: fmt$mo(groceriesA), bVal: fmt$mo(groceriesB), winner: compareNum(groceriesA, groceriesB, "lower", 20) },
        { label: "Transportation", aVal: fmt$mo(transportA), bVal: fmt$mo(transportB), winner: compareNum(transportA, transportB, "lower", 20) },
      ],
    },
    {
      title: "Place",
      rows: [
        { label: "Population", aVal: a.value.cityInfo.population?.toLocaleString() ?? "—", bVal: b.value.cityInfo.population?.toLocaleString() ?? "—", winner: "difference" as Winner },
        { label: "Elevation (ft)", aVal: "—", bVal: "—", winner: "difference" as Winner },
        { label: "Sunny Days / yr", aVal: "—", bVal: "—", winner: "difference" as Winner },
        { label: "Walk Score", aVal: "—", bVal: "—", winner: "difference" as Winner },
      ],
    },
  ];
});

function getCollegeGrad(city: ComparedCity): number | null {
  const att = city.cityProfile?.educationalAttainment as Array<{ label: string; share: number }> | undefined;
  if (!att) return null;
  const b = att.find(e => e.label === "Bachelor's degree")?.share ?? 0;
  const g = att.find(e => e.label === "Graduate degree")?.share ?? 0;
  return b + g;
}
</script>

<template>
  <div class="ed-section matchup-metrics">
    <div class="ed-section__header">
      <div class="ed-section-label">
        <span class="ed-section-label__num">§ 02</span>
        <span class="ed-section-label__dot">·</span>
        <span>ALL METRICS</span>
      </div>
      <h2 class="ed-section__heading">Every number, side-by-side</h2>
    </div>

    <div v-for="cat in categories" :key="cat.title">
      <div class="ed-group-header">
        <span class="ed-group-header__dash">—</span>
        <span>{{ cat.title.toUpperCase() }}</span>
      </div>
      <div v-for="row in cat.rows" :key="row.label" class="ed-metric-row matchup-table__row">
        <div
          class="ed-metric-row__val ed-metric-row__val--a"
          :class="{ 'ed-metric-row__val--wins-a': row.winner === 'a' }"
        >
          {{ row.aVal }}
        </div>
        <div class="matchup-table__metric">
          <div class="ed-metric-row__label">{{ row.label }}</div>
        </div>
        <div
          class="ed-metric-row__val ed-metric-row__val--b"
          :class="{ 'ed-metric-row__val--wins-b': row.winner === 'b' }"
        >
          {{ row.bVal }}
        </div>
      </div>
    </div>
  </div>
</template>
