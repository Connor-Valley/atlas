<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { fetchDetailedAffordability } from "../api/affordability";

const props = defineProps<{ city: string; state: string }>();
const emit = defineEmits<{ (e: "close"): void }>();

const data    = ref<any>(null);
const loading = ref(false);
const error   = ref<string | null>(null);

async function load() {
  if (!props.city || !props.state) return;
  loading.value = true;
  error.value   = null;
  data.value    = null;
  try {
    data.value = await fetchDetailedAffordability(props.state, props.city);
  } catch {
    error.value = "Failed to load affordability details";
  } finally {
    loading.value = false;
  }
}

watch(() => [props.city, props.state], load, { immediate: true });

// TODO(color-tokens): This component still uses hardcoded chart colors outside shared CSS variables. Keep them unchanged during the token refactor.
// Colors for rent burden bands: under30% → 30-35% → 35-40% → 40-50% → 50%+
const BAND_COLORS = ["var(--city-b)", "var(--city-a)", "var(--accent)", "var(--accent-hover)", "var(--danger)"];

// ── Insight callouts ──────────────────────────────────────────────────────────

const burdenInsight = computed(() => {
  const d = data.value;
  if (!d) return null;
  const pct = (d.rentToIncomeRatio * 100).toFixed(1);
  const tier = d.affordability as string;

  if (tier === "Comfortably Affordable") {
    return {
      type: "positive",
      icon: "mdi-check-circle-outline",
      headline: `Renters spend just ${pct}% of income on rent`,
      detail: "Well below the 30% affordability threshold — most renters here have meaningful financial headroom.",
    };
  }
  if (tier === "Affordable") {
    return {
      type: "positive",
      icon: "mdi-check-circle-outline",
      headline: `Renters spend ${pct}% of income on rent`,
      detail: "Right at the 30% affordability boundary — manageable for most renter households.",
    };
  }
  if (tier === "Moderately Burdened") {
    return {
      type: "neutral",
      icon: "mdi-alert-circle-outline",
      headline: `Renters spend ${pct}% of income on rent`,
      detail: "Slightly above the 30% threshold — a modest burden, though not uncommon in many metros.",
    };
  }
  if (tier === "Rent Burdened") {
    return {
      type: "warning",
      icon: "mdi-alert-outline",
      headline: `Renters spend ${pct}% of income on rent`,
      detail: "Significantly above the 30% threshold — housing costs are a real strain on renter budgets here.",
    };
  }
  return {
    type: "warning",
    icon: "mdi-alert-outline",
    headline: `Renters spend ${pct}% of income on rent`,
    detail: "Severe housing cost burden — many renters face significant financial stress in this city.",
  };
});

const gapInsight = computed(() => {
  const d = data.value;
  if (!d || d.affordabilityGap == null) return null;
  const gap = d.affordabilityGap as number;
  const monthly = Math.abs(Math.round(gap / 12));
  if (gap >= 1000) {
    return {
      type: "positive",
      icon: "mdi-wallet-plus-outline",
      headline: "Renter incomes exceed what's needed for affordable rent",
      detail: `Median renters earn ~$${monthly.toLocaleString()}/mo more than the 30%-threshold income — a comfortable buffer.`,
    };
  }
  if (gap >= 0) {
    return {
      type: "positive",
      icon: "mdi-wallet-outline",
      headline: "Renter incomes slightly exceed the affordability threshold",
      detail: `Median renters earn ~$${monthly.toLocaleString()}/mo more than needed to keep rent below 30% of income.`,
    };
  }
  return {
    type: "warning",
    icon: "mdi-alert-circle-outline",
    headline: `Renters need ~$${monthly.toLocaleString()}/mo more to afford housing comfortably`,
    detail: "Based on median renter income vs. the income needed to keep rent below 30% of earnings.",
  };
});

const buyVsRentInsight = computed(() => {
  const d = data.value;
  if (!d?.estimatedMortgage || !d?.medianRent) return null;
  const diff = d.medianRent - d.estimatedMortgage;
  const abs  = Math.abs(diff);
  if (abs < 100) {
    return {
      type: "neutral",
      icon: "mdi-home-outline",
      headline: "Buying and renting cost about the same here",
      detail: `$${d.medianRent.toLocaleString()}/mo rent · $${d.estimatedMortgage.toLocaleString()}/mo est. mortgage`,
    };
  }
  if (diff > 0) {
    return {
      type: "positive",
      icon: "mdi-home-plus-outline",
      headline: `Buying saves ~$${abs.toLocaleString()}/mo vs renting`,
      detail: `$${d.estimatedMortgage.toLocaleString()}/mo est. mortgage · $${d.medianRent.toLocaleString()}/mo rent`,
    };
  }
  return {
    type: "warning",
    icon: "mdi-home-remove-outline",
    headline: `Buying costs ~$${abs.toLocaleString()}/mo more than renting`,
    detail: `$${d.estimatedMortgage.toLocaleString()}/mo est. mortgage · $${d.medianRent.toLocaleString()}/mo rent`,
  };
});

const insights = computed(() =>
  [burdenInsight.value, buyVsRentInsight.value, gapInsight.value].filter(Boolean),
);

// ── Status helpers ────────────────────────────────────────────────────────────

const statusClass = computed(() => {
  const tier = data.value?.affordability as string | undefined;
  if (tier === "Comfortably Affordable") return "positive";
  if (tier === "Affordable")             return "positive";
  if (tier === "Moderately Burdened")    return "status-caution";
  if (tier === "Rent Burdened")          return "status-warning";
  return "status-danger";
});

function formatChange(ratio: number) {
  const sign = ratio >= 0 ? "+" : "";
  return `${sign}${(ratio * 100).toFixed(2)}%`;
}

const loadingInsightCards = [1, 2, 3];
</script>

<template>
  <div class="housing-exp">

    <!-- Insight callouts -->
    <div v-if="loading" class="housing-exp__insights">
      <div
        v-for="card in loadingInsightCards"
        :key="card"
        class="insight-card insight-card--skeleton"
      >
        <span class="insight-card__icon insight-card__icon--skeleton skeleton-line"></span>
        <div class="insight-card__body">
          <span class="insight-card__headline insight-card__headline--skeleton skeleton-line"></span>
          <span class="insight-card__detail insight-card__detail--skeleton skeleton-line"></span>
          <span class="insight-card__detail insight-card__detail--skeleton insight-card__detail--skeleton-short skeleton-line"></span>
        </div>
      </div>
    </div>
    <div v-else-if="insights.length" class="housing-exp__insights">
      <div
        v-for="insight in insights"
        :key="insight!.headline"
        class="insight-card"
        :class="`insight-card--${insight!.type}`"
      >
        <span class="insight-card__icon mdi" :class="insight!.icon"></span>
        <div class="insight-card__body">
          <span class="insight-card__headline">{{ insight!.headline }}</span>
          <span class="insight-card__detail">{{ insight!.detail }}</span>
        </div>
      </div>
    </div>

    <!-- Snapshot card -->
    <div class="data-card housing-exp__snapshot">
      <div class="housing-exp__snapshot-header">
        <span class="mdi mdi-chart-box-outline housing-exp__snapshot-icon"></span>
        <span class="housing-exp__snapshot-title">Affordability Snapshot</span>
      </div>

      <div v-if="loading" class="housing-exp__snapshot-skeleton" aria-hidden="true">
        <div class="housing-exp__snapshot-grid">
          <div class="snap-metric snap-metric--primary snap-metric--skeleton">
            <span class="snap-metric__label snap-metric__label--skeleton skeleton-line"></span>
            <span class="snap-metric__value snap-metric__value--skeleton snap-metric__value--skeleton-lg skeleton-line"></span>
          </div>
          <div class="snap-metric snap-metric--primary snap-metric--skeleton">
            <span class="snap-metric__label snap-metric__label--skeleton skeleton-line"></span>
            <span class="snap-metric__value snap-metric__value--skeleton snap-metric__value--skeleton-lg skeleton-line"></span>
          </div>
          <div class="snap-metric snap-metric--primary snap-metric--skeleton">
            <span class="snap-metric__label snap-metric__label--skeleton skeleton-line"></span>
            <span class="snap-metric__value snap-metric__value--skeleton snap-metric__value--skeleton-lg skeleton-line"></span>
          </div>
          <div class="snap-metric snap-metric--secondary snap-metric--skeleton">
            <span class="snap-metric__label snap-metric__label--skeleton skeleton-line"></span>
            <span class="snap-metric__value snap-metric__value--skeleton skeleton-line"></span>
          </div>
          <div class="snap-metric snap-metric--secondary snap-metric--skeleton">
            <span class="snap-metric__label snap-metric__label--skeleton skeleton-line"></span>
            <span class="snap-metric__value snap-metric__value--skeleton skeleton-line"></span>
          </div>
          <div class="snap-metric snap-metric--secondary snap-metric--skeleton">
            <span class="snap-metric__label snap-metric__label--skeleton skeleton-line"></span>
            <span class="snap-metric__value snap-metric__value--skeleton skeleton-line"></span>
          </div>
        </div>
      </div>
      <div v-else-if="error" class="housing-exp__state">
        <p class="muted">{{ error }}</p>
      </div>

      <template v-else-if="data">
        <div class="housing-exp__snapshot-grid">
          <div class="snap-metric snap-metric--primary">
            <span class="snap-metric__label"><span class="mdi mdi-home-outline snap-metric__icon"></span>Median Rent</span>
            <span class="snap-metric__value">${{ data.medianRent.toLocaleString() }}/mo</span>
          </div>
          <div class="snap-metric snap-metric--primary">
            <span class="snap-metric__label"><span class="mdi mdi-account-outline snap-metric__icon"></span>Renter Income</span>
            <span class="snap-metric__value">${{ data.medianRenterIncome.toLocaleString() }}</span>
          </div>
          <div class="snap-metric snap-metric--primary">
            <span class="snap-metric__label"><span class="mdi mdi-percent snap-metric__icon"></span>Rent / Income</span>
            <span class="snap-metric__value" :class="statusClass">{{ (data.rentToIncomeRatio * 100).toFixed(1) }}%</span>
          </div>
          <div v-if="data.medianHomeValue" class="snap-metric snap-metric--secondary">
            <span class="snap-metric__label"><span class="mdi mdi-office-building-outline snap-metric__icon"></span>Median Home Value</span>
            <span class="snap-metric__value">${{ data.medianHomeValue.toLocaleString() }}</span>
          </div>
          <div v-if="data.estimatedMortgage" class="snap-metric snap-metric--secondary">
            <span class="snap-metric__label"><span class="mdi mdi-bank-outline snap-metric__icon"></span>Est. Mortgage</span>
            <span class="snap-metric__value">${{ data.estimatedMortgage.toLocaleString() }}/mo</span>
          </div>
          <div class="snap-metric snap-metric--secondary">
            <span class="snap-metric__label"><span class="mdi mdi-scale-balance snap-metric__icon"></span>Status</span>
            <span class="snap-metric__value" :class="statusClass">{{ data.affordability }}</span>
          </div>
        </div>
      </template>
    </div>

    <!-- Loading skeleton for grid -->
    <div v-if="loading" class="housing-exp__grid" aria-hidden="true">
      <section class="data-card housing-exp__panel housing-exp__panel--wide">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-scale-unbalanced"></span>
          <span class="housing-exp__panel-title">Rent Burden Analysis</span>
        </div>
        <div class="aff-burden-skeleton">
          <div class="skeleton-line aff-burden-badge-skeleton"></div>
          <div class="skeleton-line aff-burden-bar-skeleton"></div>
          <div class="aff-burden-legend-skeleton">
            <div v-for="i in 5" :key="i" class="skeleton-line aff-burden-legend-item-skeleton"></div>
          </div>
        </div>
      </section>
      <section class="data-card housing-exp__panel housing-exp__panel--compact">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-home-switch-outline"></span>
          <span class="housing-exp__panel-title">Buying vs Renting</span>
        </div>
        <div class="housing-exp__panel-metrics">
          <div v-for="i in 3" :key="i" class="metric skeleton-block">
            <span class="metric__label skeleton-line skeleton-line--label"></span>
            <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
          </div>
        </div>
      </section>
      <section class="data-card housing-exp__panel housing-exp__panel--compact">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-bridge"></span>
          <span class="housing-exp__panel-title">Income Bridge</span>
        </div>
        <div class="housing-exp__panel-metrics">
          <div v-for="i in 4" :key="i" class="metric skeleton-block">
            <span class="metric__label skeleton-line skeleton-line--label"></span>
            <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
          </div>
        </div>
      </section>
    </div>

    <!-- Data grid -->
    <div v-else-if="data" class="housing-exp__grid">

      <!-- Rent Burden Analysis (full width) -->
      <section class="data-card housing-exp__panel housing-exp__panel--wide">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-scale-unbalanced"></span>
          <span class="housing-exp__panel-title">Rent Burden Analysis</span>
        </div>

        <div class="aff-burden-tier">
          <span class="aff-burden-tier__label" :class="statusClass">{{ data.affordability }}</span>
          <span class="muted aff-burden-tier__ratio">{{ (data.rentToIncomeRatio * 100).toFixed(1) }}% of renter income spent on rent</span>
        </div>

        <div v-if="data.rentBurdenBands?.length" class="aff-burden-bar-wrap">
          <div class="aff-burden-bar">
            <div
              v-for="(band, i) in data.rentBurdenBands"
              :key="band.label"
              class="aff-burden-bar__seg"
              :style="{ width: Math.max(band.share * 100, 0) + '%', background: BAND_COLORS[i] }"
              :title="`${band.label}: ${(band.share * 100).toFixed(1)}%`"
            ></div>
          </div>
          <div class="aff-burden-legend">
            <div v-for="(band, i) in data.rentBurdenBands" :key="band.label" class="aff-burden-legend__item">
              <span class="aff-burden-legend__dot" :style="{ background: BAND_COLORS[i] }"></span>
              <span class="aff-burden-legend__label">{{ band.label }}</span>
              <span class="aff-burden-legend__val">{{ (band.share * 100).toFixed(1) }}%</span>
            </div>
          </div>
        </div>

        <p v-if="data.rentBurdenPercent != null" class="muted housing-exp__note">
          {{ (data.rentBurdenPercent * 100).toFixed(1) }}% of renters in this city pay 30% or more of their income on rent.
          Bars show the full distribution of renter households by rent-to-income bracket.
        </p>
      </section>

      <!-- Buying vs Renting -->
      <section class="data-card housing-exp__panel housing-exp__panel--compact housing-exp__panel--buying">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-home-switch-outline"></span>
          <span class="housing-exp__panel-title">Buying vs Renting</span>
        </div>
        <div class="housing-exp__panel-metrics housing-exp__panel-metrics--buying">
          <div v-if="data.medianRent" class="metric buying-metric buying-metric--hero">
            <span class="metric__label">Monthly Rent</span>
            <span class="metric__value">${{ data.medianRent.toLocaleString() }}</span>
          </div>
          <div v-if="data.estimatedMortgage" class="metric buying-metric">
            <span class="metric__label">Est. Mortgage</span>
            <span class="metric__value">${{ data.estimatedMortgage.toLocaleString() }}</span>
          </div>
          <div v-if="data.mortgageToIncomeRatio != null" class="metric buying-metric">
            <span class="metric__label">Mortgage / Income</span>
            <span
              class="metric__value"
              :class="data.mortgageToIncomeRatio > 0.28 ? 'status-warning' : 'positive'"
            >{{ (data.mortgageToIncomeRatio * 100).toFixed(1) }}%</span>
          </div>
          <div v-if="data.priceToIncomeRatio != null" class="metric buying-metric">
            <span class="metric__label">Price-to-Income</span>
            <span class="metric__value">{{ data.priceToIncomeRatio.toFixed(1) }}×</span>
          </div>
          <div v-if="data.fhfaYoyChange != null" class="metric buying-metric">
            <span class="metric__label">Home Price YoY</span>
            <span class="metric__value" :class="data.fhfaYoyChange >= 0 ? 'positive' : 'status-warning'">
              {{ formatChange(data.fhfaYoyChange) }}
            </span>
          </div>
        </div>
        <p class="muted housing-exp__note">Mortgage assumes 20% down, 6.5% rate, 30-year term.</p>
      </section>

      <!-- Income Bridge -->
      <section class="data-card housing-exp__panel housing-exp__panel--compact housing-exp__panel--income-bridge">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-bridge"></span>
          <span class="housing-exp__panel-title">Income Bridge</span>
        </div>
        <div class="housing-exp__panel-metrics housing-exp__panel-metrics--income-bridge">
          <div v-if="data.incomeNeededForRent" class="metric income-bridge-metric">
            <span class="metric__label">Income Needed for Rent</span>
            <span class="metric__value">${{ data.incomeNeededForRent.toLocaleString() }}/yr</span>
          </div>
          <div v-if="data.affordabilityGap != null" class="metric income-bridge-metric">
            <span class="metric__label">Renter Income Gap</span>
            <span
              class="metric__value"
              :class="data.affordabilityGap >= 0 ? 'positive' : 'status-danger'"
            >
              {{ data.affordabilityGap >= 0 ? '+' : '' }}${{ Math.abs(data.affordabilityGap).toLocaleString() }}/yr
            </span>
          </div>
          <div v-if="data.incomeNeededForMortgage != null" class="metric income-bridge-metric">
            <span class="metric__label">Income for Mortgage</span>
            <span class="metric__value">${{ data.incomeNeededForMortgage.toLocaleString() }}/yr</span>
          </div>
          <div v-if="data.downPaymentSavingsYears != null" class="metric income-bridge-metric">
            <span class="metric__label">Years to Save Down Payment</span>
            <span class="metric__value">{{ data.downPaymentSavingsYears }} yrs</span>
          </div>
        </div>
        <p class="muted housing-exp__note">30% rent threshold · 28% mortgage DTI · 20% down · 10% annual savings rate</p>
      </section>

    </div>
  </div>
</template>

<style scoped>
/* TODO(color-tokens): This file still contains hardcoded colors outside shared CSS variables. Keep them unchanged during the token refactor. */
/* Tier badge */
.aff-burden-tier {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.aff-burden-tier__label {
  font-size: 1.1rem;
  font-weight: 700;
}

.aff-burden-tier__ratio {
  font-size: 0.84rem;
}

/* Stacked bar */
.aff-burden-bar-wrap {
  margin-bottom: 6px;
}

.aff-burden-bar {
  display: flex;
  height: 20px;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 12px;
  background: var(--progress-bg);
}

.aff-burden-bar__seg {
  transition: width 0.4s ease;
  min-width: 0;
}

/* Legend */
.aff-burden-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
}

.aff-burden-legend__item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8rem;
}

.aff-burden-legend__dot {
  width: 9px;
  height: 9px;
  border-radius: 2px;
  flex-shrink: 0;
}

.aff-burden-legend__label {
  color: var(--text-secondary);
}

.aff-burden-legend__val {
  color: var(--text-primary);
  font-weight: 600;
  min-width: 3.2ch;
}

/* Loading skeletons */
.aff-burden-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.aff-burden-badge-skeleton {
  height: 22px;
  width: 180px;
  border-radius: 4px;
}

.aff-burden-bar-skeleton {
  height: 20px;
  border-radius: 6px;
  width: 100%;
}

.aff-burden-legend-skeleton {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.aff-burden-legend-item-skeleton {
  height: 14px;
  width: 70px;
  border-radius: 3px;
}
</style>
