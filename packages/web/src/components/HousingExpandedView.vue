<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { fetchDetailedHousing } from "../api/housing";

const props = defineProps<{ city: string; state: string }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const data    = ref<any>(null);
const loading = ref(false);
const error   = ref<string | null>(null);

async function load() {
  if (!props.city || !props.state) return;
  loading.value = true;
  error.value   = null;
  data.value    = null;
  try {
    data.value = await fetchDetailedHousing(props.state, props.city);
  } catch {
    error.value = "Failed to load housing details";
  } finally {
    loading.value = false;
  }
}

watch(() => [props.city, props.state], load, { immediate: true });

function formatChange(ratio: number) {
  const sign = ratio >= 0 ? "+" : "";
  return `${sign}${(ratio * 100).toFixed(2)}%`;
}

const housingScore = computed(() => {
  if (!data.value?.housing?.medianRent) return null;
  return Math.min(100, Math.round((2000 / data.value.housing.medianRent) * 100));
});

// ── Insight callouts ──────────────────────────────────────────────────────────

const buyVsRentInsight = computed(() => {
  const rent = data.value?.housing?.medianRent;
  const mortgage = data.value?.housing?.estimatedMortgage;
  if (!rent || !mortgage) return null;
  const diff = rent - mortgage;
  const absDiff = Math.abs(diff);
  if (absDiff < 50) {
    return {
      type: 'neutral',
      icon: 'mdi-home-outline',
      headline: 'Buying costs about the same as renting',
      detail: `$${mortgage.toLocaleString()}/mo mortgage · $${rent.toLocaleString()}/mo rent`,
    };
  }
  if (diff > 0) {
    return {
      type: 'positive',
      icon: 'mdi-home-plus-outline',
      headline: `Buying saves $${absDiff.toLocaleString()}/mo vs renting`,
      detail: `$${mortgage.toLocaleString()}/mo mortgage · $${rent.toLocaleString()}/mo rent`,
    };
  }
  return {
    type: 'warning',
    icon: 'mdi-home-minus-outline',
    headline: `Renting saves $${absDiff.toLocaleString()}/mo vs buying`,
    detail: `$${rent.toLocaleString()}/mo rent · $${mortgage.toLocaleString()}/mo mortgage`,
  };
});

const priceAppreciationInsight = computed(() => {
  const change = data.value?.housing?.fhfaData?.fiveYearChange;
  if (change == null) return null;
  const pct = (change * 100).toFixed(0);
  const absPct = Math.abs(Number(pct));
  if (change > 0.4) {
    return {
      type: 'warning',
      icon: 'mdi-trending-up',
      headline: `Home prices up ${pct}% over 5 years`,
      detail: 'Fast-appreciating market — equity builds quickly but entry cost is rising',
    };
  }
  if (change > 0.1) {
    return {
      type: 'positive',
      icon: 'mdi-trending-up',
      headline: `Home prices up ${pct}% over 5 years`,
      detail: 'Steady appreciation — a healthy, growing market',
    };
  }
  if (change >= 0) {
    return {
      type: 'neutral',
      icon: 'mdi-trending-neutral',
      headline: `Home prices up ${pct}% over 5 years`,
      detail: 'Stable market with modest appreciation',
    };
  }
  return {
    type: 'positive',
    icon: 'mdi-trending-down',
    headline: `Home prices down ${absPct}% over 5 years`,
    detail: 'Declining prices may create buying opportunities',
  };
});

const rentBurdenInsight = computed(() => {
  const burden = data.value?.housing?.rentBurdenPercent;
  if (burden == null) return null;
  const pct = (burden * 100).toFixed(0);
  if (burden < 0.25) {
    return {
      type: 'positive',
      icon: 'mdi-shield-check-outline',
      headline: `Low rent burden — ${pct}% of renters cost-burdened`,
      detail: 'Well below the 30% threshold — housing is relatively affordable here',
    };
  }
  if (burden < 0.30) {
    return {
      type: 'neutral',
      icon: 'mdi-shield-half-full',
      headline: `Moderate rent burden — ${pct}% of renters cost-burdened`,
      detail: 'Approaching the 30% affordability threshold',
    };
  }
  return {
    type: 'warning',
    icon: 'mdi-shield-alert-outline',
    headline: `High rent burden — ${pct}% of renters cost-burdened`,
    detail: 'Above the 30% threshold — many residents are housing cost-burdened',
  };
});

const insights = computed(() =>
  [buyVsRentInsight.value, priceAppreciationInsight.value, rentBurdenInsight.value].filter(Boolean)
);

// ── Housing structure donut chart ─────────────────────────────────────────────

const STRUCTURE_COLORS = [
  '#14B8A6',
  '#0891b2',
  '#6366f1',
  '#8b5cf6',
  '#f59e0b',
  '#94a3b8',
];

const DONUT_R = 45;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_R;

const structureSegments = computed(() => {
  const s = data.value?.housing?.housingStructure;
  if (!s) return [];
  const all = [
    { label: 'Single Family', pct: s.singleFamily * 100, color: STRUCTURE_COLORS[0] },
    { label: 'Duplex', pct: s.duplex * 100, color: STRUCTURE_COLORS[1] },
    { label: 'Small Apt (3–9)', pct: s.smallApartment * 100, color: STRUCTURE_COLORS[2] },
    { label: 'Large Apt (10+)', pct: s.largeApartment * 100, color: STRUCTURE_COLORS[3] },
    { label: 'Mobile Home', pct: s.mobile * 100, color: STRUCTURE_COLORS[4] },
    { label: 'Other', pct: s.other * 100, color: STRUCTURE_COLORS[5] },
  ];
  return all.filter(seg => seg.pct >= 0.5);
});

const DONUT_GAP = 2; // SVG units of space between segments

const donutSegments = computed(() => {
  let offset = 0;
  return structureSegments.value.map(seg => {
    const full = (seg.pct / 100) * DONUT_CIRCUMFERENCE;
    const dash = Math.max(0, full - DONUT_GAP);
    const dashOffset = -offset * DONUT_CIRCUMFERENCE;
    offset += seg.pct / 100;
    return { ...seg, dash, dashOffset };
  });
});

const loadingInsightCards = [1, 2, 3];
const loadingStructureRows = [1, 2, 3, 4];
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

    <div class="data-card housing-exp__snapshot">
      <div class="housing-exp__snapshot-header">
        <span class="mdi mdi-chart-box-outline housing-exp__snapshot-icon"></span>
        <span class="housing-exp__snapshot-title">Market Snapshot</span>
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
          <div v-if="data.housing?.medianRent" class="snap-metric snap-metric--primary">
            <span class="snap-metric__label"><span class="mdi mdi-home-outline snap-metric__icon"></span>Median Rent</span>
            <span class="snap-metric__value">${{ data.housing.medianRent.toLocaleString() }}</span>
          </div>
          <div v-if="data.housing?.medianHomeValue" class="snap-metric snap-metric--primary">
            <span class="snap-metric__label"><span class="mdi mdi-office-building-outline snap-metric__icon"></span>Home Value</span>
            <span class="snap-metric__value">${{ data.housing.medianHomeValue.toLocaleString() }}</span>
          </div>
          <div v-if="data.housing?.medianHouseholdIncome" class="snap-metric snap-metric--primary">
            <span class="snap-metric__label"><span class="mdi mdi-wallet-outline snap-metric__icon"></span>Household Income</span>
            <span class="snap-metric__value">${{ data.housing.medianHouseholdIncome.toLocaleString() }}</span>
          </div>
          <div v-if="data.housing?.renterShare != null" class="snap-metric snap-metric--secondary">
            <span class="snap-metric__label"><span class="mdi mdi-key-outline snap-metric__icon"></span>Renter Share</span>
            <span class="snap-metric__value">{{ (data.housing.renterShare * 100).toFixed(1) }}%</span>
          </div>
          <div v-if="data.housing?.vacancyRate != null" class="snap-metric snap-metric--secondary">
            <span class="snap-metric__label"><span class="mdi mdi-door-open snap-metric__icon"></span>Vacancy Rate</span>
            <span class="snap-metric__value">{{ (data.housing.vacancyRate * 100).toFixed(1) }}%</span>
          </div>
          <div v-if="data.housing?.rentBurdenPercent != null" class="snap-metric snap-metric--secondary">
            <span class="snap-metric__label"><span class="mdi mdi-scale-balance snap-metric__icon"></span>Rent Burdened</span>
            <span class="snap-metric__value" :class="{ 'status-warning': data.housing.rentBurdenPercent > 0.30 }">
              {{ (data.housing.rentBurdenPercent * 100).toFixed(1) }}%
            </span>
          </div>
        </div>
      </template>
    </div>

    <div v-if="loading" class="housing-exp__grid" aria-hidden="true">
      <section class="data-card housing-exp__panel housing-exp__panel--compact housing-exp__panel--affordability">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-scale-balance"></span>
          <span class="housing-exp__panel-title">Affordability</span>
        </div>
        <div class="housing-exp__panel-metrics">
          <div class="metric skeleton-block skeleton-block--hero">
            <span class="metric__label skeleton-line skeleton-line--label"></span>
            <span class="metric__value skeleton-line skeleton-line--value"></span>
          </div>
          <div class="metric skeleton-block">
            <span class="metric__label skeleton-line skeleton-line--label"></span>
            <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
          </div>
          <div class="metric skeleton-block">
            <span class="metric__label skeleton-line skeleton-line--label"></span>
            <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
          </div>
        </div>
        <p class="muted housing-exp__note housing-exp__note--skeleton skeleton-line"></p>
      </section>

      <section class="data-card housing-exp__panel housing-exp__panel--compact">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-office-building-outline"></span>
          <span class="housing-exp__panel-title">Housing Structure</span>
        </div>
        <div class="struct-donut-wrap">
          <div class="struct-donut struct-donut--skeleton skeleton-line"></div>
          <div class="struct-legend struct-legend--vertical">
            <div v-for="row in loadingStructureRows" :key="row" class="struct-legend__item">
              <span class="struct-legend__dot struct-legend__dot--skeleton skeleton-line"></span>
              <span class="struct-legend__label struct-legend__label--skeleton skeleton-line"></span>
              <span class="struct-legend__pct struct-legend__pct--skeleton skeleton-line"></span>
            </div>
          </div>
        </div>
      </section>

      <section class="data-card housing-exp__panel housing-exp__panel--wide">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-chart-line"></span>
          <span class="housing-exp__panel-title">Home Price Trends</span>
        </div>
        <div class="housing-exp__panel-metrics">
          <div class="metric skeleton-block">
            <span class="metric__label skeleton-line skeleton-line--label"></span>
            <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
          </div>
          <div class="metric skeleton-block">
            <span class="metric__label skeleton-line skeleton-line--label"></span>
            <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
          </div>
          <div class="metric skeleton-block">
            <span class="metric__label skeleton-line skeleton-line--label"></span>
            <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
          </div>
        </div>
        <p class="muted housing-exp__note housing-exp__note--skeleton skeleton-line"></p>
      </section>
    </div>

    <div v-else-if="data" class="housing-exp__grid">
      <section class="data-card housing-exp__panel housing-exp__panel--compact housing-exp__panel--affordability">
            <div class="housing-exp__panel-head">
              <span class="data-card__icon mdi mdi-scale-balance"></span>
              <span class="housing-exp__panel-title">Affordability</span>
            </div>
            <div class="housing-exp__panel-metrics">
              <div v-if="data.housing?.estimatedMortgage" class="metric">
                <span class="metric__label">Est. Monthly Mortgage</span>
                <span class="metric__value">${{ data.housing.estimatedMortgage.toLocaleString() }}</span>
              </div>
              <div v-if="data.housing?.mortgageToIncomeRatio != null" class="metric">
                <span class="metric__label">Mortgage / Income</span>
                <span class="metric__value" :class="{ 'status-warning': data.housing.mortgageToIncomeRatio > 0.30 }">
                  {{ (data.housing.mortgageToIncomeRatio * 100).toFixed(1) }}%
                </span>
              </div>
              <div v-if="data.housing?.rentBurdenPercent != null" class="metric">
                <span class="metric__label">Rent Burdened</span>
                <span class="metric__value" :class="{ 'status-warning': data.housing.rentBurdenPercent > 0.30 }">
                  {{ (data.housing.rentBurdenPercent * 100).toFixed(1) }}%
                </span>
              </div>
            </div>
            <p class="muted housing-exp__note">
              Mortgage assumes 20% down, 6.5% rate, 30-year term.
            </p>
      </section>

      <section v-if="donutSegments.length" class="data-card housing-exp__panel housing-exp__panel--compact">
            <div class="housing-exp__panel-head">
              <span class="data-card__icon mdi mdi-office-building-outline"></span>
              <span class="housing-exp__panel-title">Housing Structure</span>
            </div>
            <div class="struct-donut-wrap">
              <svg viewBox="0 0 120 120" class="struct-donut" aria-hidden="true">
                <circle cx="60" cy="60" r="45" fill="none" stroke="var(--border-card)" stroke-width="20" />
                <circle
                  v-for="seg in donutSegments"
                  :key="seg.label"
                  cx="60" cy="60" r="45"
                  fill="none"
                  :stroke="seg.color"
                  stroke-width="20"
                  stroke-linecap="butt"
                  :stroke-dasharray="`${seg.dash} ${DONUT_CIRCUMFERENCE}`"
                  :stroke-dashoffset="seg.dashOffset"
                  style="transform: rotate(-90deg); transform-origin: 60px 60px;"
                />
              </svg>
              <div class="struct-legend struct-legend--vertical">
                <div v-for="seg in donutSegments" :key="seg.label" class="struct-legend__item">
                  <span class="struct-legend__dot" :style="{ background: seg.color }"></span>
                  <span class="struct-legend__label">{{ seg.label }}</span>
                  <span class="struct-legend__pct">{{ seg.pct.toFixed(1) }}%</span>
                </div>
              </div>
            </div>
      </section>

      <section v-if="data.housing?.fhfaData" class="data-card housing-exp__panel housing-exp__panel--wide">
            <div class="housing-exp__panel-head">
              <span class="data-card__icon mdi mdi-chart-line"></span>
              <span class="housing-exp__panel-title">Home Price Trends</span>
            </div>
            <div class="housing-exp__panel-metrics">
              <div class="metric">
                <span class="metric__label">Year-over-Year</span>
                <span class="metric__value" :class="data.housing.fhfaData.yoyChange >= 0 ? 'positive' : 'status-warning'">
                  {{ formatChange(data.housing.fhfaData.yoyChange) }}
                </span>
              </div>
              <div class="metric">
                <span class="metric__label">Quarter-over-Quarter</span>
                <span class="metric__value" :class="data.housing.fhfaData.qoqChange >= 0 ? 'positive' : 'status-warning'">
                  {{ formatChange(data.housing.fhfaData.qoqChange) }}
                </span>
              </div>
              <div v-if="data.housing.fhfaData.fiveYearChange != null" class="metric">
                <span class="metric__label">5-Year Change</span>
                <span class="metric__value" :class="data.housing.fhfaData.fiveYearChange >= 0 ? 'positive' : 'status-warning'">
                  {{ formatChange(data.housing.fhfaData.fiveYearChange) }}
                </span>
              </div>
            </div>
            <p class="muted housing-exp__note">
              FHFA House Price Index · {{ data.housing.fhfaData.geographyName }}
              ({{ data.housing.fhfaData.level === 'msa' ? 'MSA-level' : 'State-level' }},
              updated {{ data.housing.fhfaData.lastUpdated }})
            </p>
      </section>
    </div>
  </div>
</template>
