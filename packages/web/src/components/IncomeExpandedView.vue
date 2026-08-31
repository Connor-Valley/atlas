<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { fetchDetailedIncome } from "../api/income";
import { fetchIndustrySalary, type IndustrySalaryData } from "../api/incomeByIndustry";
import { useAuth } from "../composables/useAuth";
import { usePreferences } from "../composables/usePreferences";

const props = defineProps<{ city: string; state: string }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const data    = ref<any>(null);
const loading = ref(false);
const error   = ref<string | null>(null);

// ── Salary by industry ─────────────────────────────────────────────────────────

const INDUSTRY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'tech_media_pro',           label: 'Tech, Media & Professional Services' },
  { value: 'corporate_finance',        label: 'Corporate & Finance' },
  { value: 'manufacturing',            label: 'Manufacturing & Industrial' },
  { value: 'construction_trades',      label: 'Construction & Trades' },
  { value: 'transportation_logistics', label: 'Transportation, Logistics & Distribution' },
  { value: 'education_healthcare',     label: 'Education & Healthcare' },
  { value: 'government_services',      label: 'Government & Public Services' },
  { value: 'retail',                   label: 'Retail & Consumer Services' },
  { value: 'hospitality_arts',         label: 'Hospitality, Arts & Entertainment' },
  { value: 'agriculture',              label: 'Agriculture & Natural Resources' },
  { value: 'nonprofit',                label: 'Nonprofit & Community Organizations' },
];

const TIER_LABELS: Record<string, string> = { entry: 'Entry Level', mid: 'Mid Level', senior: 'Senior Level' };

const selectedIndustry     = ref<string>('');
const industryData         = ref<IndustrySalaryData | null>(null);
const industryLoading      = ref(false);
const industryError        = ref<string | null>(null);

// Default the picker to the user's own saved industry from personalization, if they have one —
// same source AtlasScoreCard's opportunity dimension reads (opportunity_preference), so picking
// a city shows their own field first rather than an empty dropdown they have to fill in again.
const { user, loading: authLoading } = useAuth();
const { preferences, fetchPreferences } = usePreferences();
let industryAutoSelected = false;

watch([user, authLoading], ([, isAuthLoading]) => {
  if (!isAuthLoading) fetchPreferences();
}, { immediate: true });

watch(preferences, (p) => {
  if (industryAutoSelected || selectedIndustry.value) return;
  const preferred = p.opportunity_preference;
  if (preferred && preferred !== 'any' && INDUSTRY_OPTIONS.some((opt) => opt.value === preferred)) {
    selectedIndustry.value = preferred;
    industryAutoSelected = true;
  }
}, { immediate: true, deep: true });

async function loadIndustrySalary() {
  if (!selectedIndustry.value || !props.city || !props.state) return;
  industryLoading.value = true;
  industryError.value   = null;
  industryData.value    = null;
  try {
    industryData.value = await fetchIndustrySalary(props.state, props.city, selectedIndustry.value);
    if (!industryData.value) industryError.value = "No salary data available for this area/industry";
  } catch {
    industryError.value = "Failed to load salary data";
  } finally {
    industryLoading.value = false;
  }
}

// Combined into one watcher (rather than separate watchers on selectedIndustry and on
// [city, state]) so it self-heals regardless of which becomes ready first — the auto-select
// above can set selectedIndustry before props.city/state have arrived (or vice versa), and a
// watcher on selectedIndustry alone would fire once, see empty props, bail via the guard in
// loadIndustrySalary, and never retry once props actually populate.
watch(
  [selectedIndustry, () => props.city, () => props.state],
  ([industry, city, state]) => {
    if (!industry || !city || !state) return;
    loadIndustrySalary();
  },
  { immediate: true },
);

const industryTierBars = computed(() => {
  const tiers = industryData.value?.tiers;
  if (!tiers?.length) return [];
  const max = Math.max(...tiers.map((t) => t.annualWage ?? 0));
  return tiers.map((t) => ({
    label: TIER_LABELS[t.level] ?? t.level,
    value: t.annualWage,
    pct: t.annualWage != null && max > 0 ? (t.annualWage / max) * 100 : 0,
  }));
});

// Location Quotient: local employment share of this industry vs. its national share.
// 1.0 = exactly proportional to the national average.
const locationQuotientLabel = computed(() => {
  const lq = industryData.value?.locationQuotient;
  if (lq == null) return null;
  if (lq >= 1.5) return 'Highly concentrated';
  if (lq >= 1.1) return 'Above average';
  if (lq >= 0.9) return 'About average';
  return 'Below average';
});

// How much pay typically grows from entry to senior in this field, here — computed from the
// tiers already fetched, no extra request. A steep climb (tech) reads very differently from a
// flat one (retail), which the three tiles alone don't say directly.
const payGrowthPct = computed(() => {
  const entry = industryData.value?.tiers.find((t) => t.level === 'entry')?.annualWage;
  const senior = industryData.value?.tiers.find((t) => t.level === 'senior')?.annualWage;
  if (entry == null || senior == null || entry <= 0) return null;
  return Math.round(((senior - entry) / entry) * 100);
});

async function load() {
  if (!props.city || !props.state) return;
  loading.value = true;
  error.value   = null;
  data.value    = null;
  try {
    data.value = await fetchDetailedIncome(props.state, props.city);
  } catch {
    error.value = "Failed to load income details";
  } finally {
    loading.value = false;
  }
}

watch(() => [props.city, props.state], load, { immediate: true });

// ── Insight callouts ───────────────────────────────────────────────────────────

const affordabilityInsight = computed(() => {
  const gap    = data.value?.affordabilityMetrics?.affordabilityGap;
  const needed = data.value?.affordabilityMetrics?.incomeNeededForRent;
  if (gap == null || needed == null) return null;
  const absGap = Math.abs(gap).toLocaleString();
  if (gap >= 5000) {
    return {
      type: 'positive',
      icon: 'mdi-check-circle-outline',
      headline: `Renters earn $${absGap} above the rent threshold`,
      detail: `Income needed to avoid rent burden: $${Math.round(needed).toLocaleString()}/yr`,
    };
  }
  if (gap >= -5000) {
    return {
      type: 'neutral',
      icon: 'mdi-minus-circle-outline',
      headline: `Renters are near the rent affordability threshold`,
      detail: `Income needed to avoid rent burden: $${Math.round(needed).toLocaleString()}/yr`,
    };
  }
  return {
    type: 'warning',
    icon: 'mdi-alert-circle-outline',
    headline: `Renters fall $${absGap} short of the rent threshold`,
    detail: `Income needed to avoid rent burden: $${Math.round(needed).toLocaleString()}/yr`,
  };
});

const inequalityInsight = computed(() => {
  const gini = data.value?.giniCoefficient;
  if (gini == null) return null;
  const giniStr = gini.toFixed(3);
  if (gini > 0.45) {
    return {
      type: 'warning',
      icon: 'mdi-scale-unbalanced',
      headline: `High income inequality — Gini of ${giniStr}`,
      detail: 'Well above the US average of 0.39 — income is concentrated at the top',
    };
  }
  if (gini < 0.35) {
    return {
      type: 'positive',
      icon: 'mdi-scale-balance',
      headline: `Low income inequality — Gini of ${giniStr}`,
      detail: 'Below the US average of 0.39 — incomes are more evenly distributed',
    };
  }
  return {
    type: 'neutral',
    icon: 'mdi-scale-balance',
    headline: `Moderate income inequality — Gini of ${giniStr}`,
    detail: 'Near the US national average of 0.39',
  };
});

const employmentGrowthInsight = computed(() => {
  const pct = data.value?.employmentGrowthPct5yr;
  if (pct == null) return null;
  const absPct = Math.abs(pct).toFixed(1);
  if (pct > 8) {
    return {
      type: 'positive',
      icon: 'mdi-trending-up',
      headline: `Employment up ${pct.toFixed(1)}% over 5 years`,
      detail: 'Strong job growth — the local economy is expanding',
    };
  }
  if (pct > 0) {
    return {
      type: 'neutral',
      icon: 'mdi-trending-up',
      headline: `Employment up ${pct.toFixed(1)}% over 5 years`,
      detail: 'Modest job growth',
    };
  }
  return {
    type: 'warning',
    icon: 'mdi-trending-down',
    headline: `Employment down ${absPct}% over 5 years`,
    detail: 'Shrinking job base over the last 5 years',
  };
});

const insights = computed(() =>
  [affordabilityInsight.value, inequalityInsight.value, employmentGrowthInsight.value].filter(Boolean)
);

// ── Poverty rate derived from depth buckets ────────────────────────────────────

const povertyRate = computed(() => {
  const d = data.value?.povertyDepth;
  if (!d?.total) return null;
  return ((d.deepPoverty + d.poverty) / d.total) * 100;
});

// ── Income distribution donut ──────────────────────────────────────────────────

// TODO(color-tokens): This component still uses hardcoded chart colors outside shared CSS variables. Keep them unchanged during the token refactor.
const INCOME_DIST_COLORS = [
  'var(--accent)',
  'var(--accent-hover)',
  'var(--caution)',
  'var(--city-b)',
  'var(--city-a)',
  'var(--text-secondary)',
];

const DONUT_R = 45;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_R;
const DONUT_GAP = 2;

const incomeDistSegments = computed(() => {
  const d = data.value?.rawIncomeDistribution;
  if (!d) return [];
  const total = data.value.totalHouseholds || 1;
  const buckets = [
    { label: 'Under $25k',   count: d.under10k + d.from10to15k + d.from15to20k + d.from20to25k },
    { label: '$25k–$50k',    count: d.from25to30k + d.from30to35k + d.from35to40k + d.from40to45k + d.from45to50k },
    { label: '$50k–$75k',    count: d.from50to60k + d.from60to75k },
    { label: '$75k–$100k',   count: d.from75to100k },
    { label: '$100k–$150k',  count: d.from100to125k + d.from125to150k },
    { label: '$150k+',       count: d.from150to200k + d.over200k },
  ];
  return buckets
    .filter(b => b.count > 0)
    .map((b, i) => ({ ...b, pct: (b.count / total) * 100, color: INCOME_DIST_COLORS[i] }));
});

const incomeDonutSegments = computed(() => {
  let offset = 0;
  return incomeDistSegments.value.map(seg => {
    const full = (seg.pct / 100) * DONUT_CIRCUMFERENCE;
    const dash = Math.max(0, full - DONUT_GAP);
    const dashOffset = -offset * DONUT_CIRCUMFERENCE;
    offset += seg.pct / 100;
    return { ...seg, dash, dashOffset };
  });
});

// ── Earnings by education ──────────────────────────────────────────────────────

const EDU_LABELS = ['< High School', 'HS Graduate', 'Some College', "Bachelor's", 'Graduate'];

const educationBars = computed(() => {
  const e = data.value?.earningsByEducation;
  if (!e) return [];
  const values: (number | null)[] = [e.lessThanHS, e.hsGraduate, e.someCollege, e.bachelors, e.graduate];
  const max = Math.max(...values.filter((v): v is number => v != null));
  return EDU_LABELS.map((label, i) => ({
    label,
    value: values[i],
    pct: values[i] != null && max > 0 ? (values[i]! / max) * 100 : 0,
  }));
});

// ── Industry breakdown ─────────────────────────────────────────────────────────

const topIndustries = computed(() => {
  const sectors = data.value?.industryBreakdown;
  if (!sectors?.length) return [];
  const maxShare = sectors[0].share;
  // 7 rows fills the card's original fixed height (matches its neighbor panel) without growing
  // it — showing all 13 (industryBreakdown is pre-sorted descending) made this panel visibly
  // taller than everything next to it. "View all" still covers the rest.
  return sectors.filter((s: any) => s.share > 0).slice(0, 7).map((s: any) => ({
    ...s,
    barPct: maxShare > 0 ? (s.share / maxShare) * 100 : 0,
  }));
});

const allIndustries = computed(() => {
  const sectors = data.value?.industryBreakdown;
  if (!sectors?.length) return [];
  const maxShare = sectors[0].share;
  return sectors.map((s: any) => ({
    ...s,
    barPct: maxShare > 0 ? (s.share / maxShare) * 100 : 0,
  }));
});

// Herfindahl-Hirschman-based diversity index: 1 - sum(share^2). 0 = single-industry
// dependent, closer to 1 = employment spread evenly across many sectors.
const industryDiversityIndex = computed(() => {
  const sectors = data.value?.industryBreakdown;
  if (!sectors?.length) return null;
  const hhi = sectors.reduce((sum: number, s: any) => sum + s.share * s.share, 0);
  return Math.max(0, 1 - hhi);
});

const industryDiversityLabel = computed(() => {
  const idx = industryDiversityIndex.value;
  if (idx == null) return null;
  if (idx >= 0.85) return 'Highly diversified';
  if (idx >= 0.7)  return 'Diversified';
  if (idx >= 0.5)  return 'Moderately concentrated';
  return 'Concentrated';
});

// ── Loading skeletons ──────────────────────────────────────────────────────────
const loadingInsightCards  = [1, 2, 3];
const loadingEduRows       = [1, 2, 3, 4, 5];
const loadingIndustryRows    = [1, 2, 3, 4, 5];
const industryModalOpen      = ref(false);
const loadingDistRows      = [1, 2, 3, 4];

watch(industryModalOpen, (open) => {
  if (typeof document === "undefined") return;
  document.body.classList.toggle("body--scroll-locked", open);
});

onUnmounted(() => {
  if (typeof document === "undefined") return;
  document.body.classList.remove("body--scroll-locked");
});
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
        <span class="housing-exp__snapshot-title">Income Snapshot</span>
      </div>

      <div v-if="loading" class="housing-exp__snapshot-skeleton" aria-hidden="true">
        <div class="housing-exp__snapshot-grid">
          <div v-for="i in 3" :key="i" class="snap-metric snap-metric--primary snap-metric--skeleton">
            <span class="snap-metric__label snap-metric__label--skeleton skeleton-line"></span>
            <span class="snap-metric__value snap-metric__value--skeleton snap-metric__value--skeleton-lg skeleton-line"></span>
          </div>
          <div v-for="i in 3" :key="i" class="snap-metric snap-metric--secondary snap-metric--skeleton">
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
            <span class="snap-metric__label">
              <span class="mdi mdi-home-account snap-metric__icon"></span>Household Income
            </span>
            <span class="snap-metric__value">${{ data.medianHouseholdIncome.toLocaleString() }}</span>
          </div>
          <div class="snap-metric snap-metric--primary">
            <span class="snap-metric__label">
              <span class="mdi mdi-account-outline snap-metric__icon"></span>Per Capita Income
            </span>
            <span class="snap-metric__value">${{ data.perCapitaIncome.toLocaleString() }}</span>
          </div>
          <div class="snap-metric snap-metric--primary">
            <span class="snap-metric__label">
              <span class="mdi mdi-key-outline snap-metric__icon"></span>Renter Income
            </span>
            <span class="snap-metric__value">{{ data.medianRenterIncome ? `$${data.medianRenterIncome.toLocaleString()}` : "—" }}</span>
          </div>
          <div v-if="data.medianOwnerIncome" class="snap-metric snap-metric--secondary">
            <span class="snap-metric__label">
              <span class="mdi mdi-home-outline snap-metric__icon"></span>Owner Income
            </span>
            <span class="snap-metric__value">${{ data.medianOwnerIncome.toLocaleString() }}</span>
          </div>
          <div v-if="povertyRate != null" class="snap-metric snap-metric--secondary">
            <span class="snap-metric__label">
              <span class="mdi mdi-alert-outline snap-metric__icon"></span>Poverty Rate
            </span>
            <span class="snap-metric__value">{{ povertyRate.toFixed(1) }}%</span>
          </div>
          <div v-if="data.giniCoefficient != null" class="snap-metric snap-metric--secondary">
            <span class="snap-metric__label">
              <span class="mdi mdi-scale-balance snap-metric__icon"></span>Gini Index
            </span>
            <span class="snap-metric__value">{{ data.giniCoefficient.toFixed(3) }}</span>
          </div>
        </div>
      </template>
    </div>

    <!-- Panels grid (loading) -->
    <div v-if="loading" class="housing-exp__grid" aria-hidden="true">
      <section class="data-card housing-exp__panel housing-exp__panel--compact housing-exp__panel--affordability">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-scale-balance"></span>
          <span class="housing-exp__panel-title">Affordability Bridge</span>
        </div>
        <div class="housing-exp__panel-metrics">
          <div v-for="i in 4" :key="i" class="metric skeleton-block">
            <span class="metric__label skeleton-line skeleton-line--label"></span>
            <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
          </div>
        </div>
        <p class="muted housing-exp__note housing-exp__note--skeleton skeleton-line"></p>
      </section>

      <section class="data-card housing-exp__panel housing-exp__panel--compact">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-school-outline"></span>
          <span class="housing-exp__panel-title">Earnings by Education</span>
        </div>
        <div class="bar-list">
          <div v-for="i in loadingEduRows" :key="i" class="bar-list__row">
            <span class="bar-list__label skeleton-line" style="width: 110px; display: block;"></span>
            <div class="bar-list__track">
              <div class="bar-list__fill bar-list__fill--skeleton" :style="{ width: (40 + i * 12) + '%' }"></div>
            </div>
            <span class="bar-list__value skeleton-line" style="width: 56px; display: block;"></span>
          </div>
        </div>
      </section>

      <section class="data-card housing-exp__panel housing-exp__panel--compact">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-briefcase-outline"></span>
          <span class="housing-exp__panel-title">Industry Breakdown</span>
        </div>
        <div class="bar-list">
          <div v-for="i in loadingIndustryRows" :key="i" class="bar-list__row">
            <span class="bar-list__label skeleton-line" style="width: 160px; display: block;"></span>
            <div class="bar-list__track">
              <div class="bar-list__fill bar-list__fill--skeleton" :style="{ width: (100 - i * 14) + '%' }"></div>
            </div>
            <span class="bar-list__value skeleton-line" style="width: 40px; display: block;"></span>
          </div>
        </div>
      </section>

      <section class="data-card housing-exp__panel housing-exp__panel--compact">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-chart-donut"></span>
          <span class="housing-exp__panel-title">Income Distribution</span>
        </div>
        <div class="struct-donut-wrap">
          <div class="struct-donut struct-donut--skeleton skeleton-line"></div>
          <div class="struct-legend struct-legend--vertical">
            <div v-for="row in loadingDistRows" :key="row" class="struct-legend__item">
              <span class="struct-legend__dot struct-legend__dot--skeleton skeleton-line"></span>
              <span class="struct-legend__label struct-legend__label--skeleton skeleton-line"></span>
              <span class="struct-legend__pct struct-legend__pct--skeleton skeleton-line"></span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Panels grid (data) -->
    <div v-else-if="data" class="housing-exp__grid">

      <!-- Affordability bridge -->
      <section class="data-card housing-exp__panel housing-exp__panel--compact housing-exp__panel--affordability housing-exp__panel--bridge">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-scale-balance"></span>
          <span class="housing-exp__panel-title">Affordability Bridge</span>
        </div>
        <div class="housing-exp__panel-metrics housing-exp__panel-metrics--bridge">
          <div v-if="data.affordabilityMetrics?.incomeNeededForRent" class="metric bridge-metric">
            <span class="metric__label">Income Needed</span>
            <span class="metric__value">${{ Math.round(data.affordabilityMetrics.incomeNeededForRent).toLocaleString() }}/yr</span>
          </div>
          <div v-if="data.affordabilityMetrics?.affordabilityGap != null" class="metric bridge-metric">
            <span class="metric__label">Affordability Gap</span>
            <span class="metric__value" :class="data.affordabilityMetrics.affordabilityGap >= 0 ? 'positive' : 'status-warning'">
              {{ data.affordabilityMetrics.affordabilityGap >= 0 ? '+' : '−' }}${{ Math.abs(data.affordabilityMetrics.affordabilityGap).toLocaleString() }}
            </span>
          </div>
          <div v-if="data.affordabilityMetrics?.priceToIncomeRatio != null" class="metric bridge-metric">
            <span class="metric__label">Price / Income</span>
            <span class="metric__value">{{ data.affordabilityMetrics.priceToIncomeRatio }}×</span>
          </div>
          <div v-if="data.affordabilityMetrics?.downPaymentSavingsYears != null" class="metric bridge-metric">
            <span class="metric__label">Down Payment Years</span>
            <span class="metric__value">{{ data.affordabilityMetrics.downPaymentSavingsYears }} yrs</span>
          </div>
        </div>
        <p class="muted housing-exp__note housing-exp__note--bridge">30% rent threshold · 20% down · 10% annual savings rate</p>
      </section>

      <!-- Earnings by education -->
      <section v-if="educationBars.length" class="data-card housing-exp__panel housing-exp__panel--compact">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-school-outline"></span>
          <span class="housing-exp__panel-title">Earnings by Education</span>
        </div>
        <div class="bar-list">
          <div v-for="bar in educationBars" :key="bar.label" class="bar-list__row">
            <span class="bar-list__label">{{ bar.label }}</span>
            <div class="bar-list__track">
              <div class="bar-list__fill" :style="{ width: bar.pct + '%' }"></div>
            </div>
            <span class="bar-list__value">
              {{ bar.value != null ? '$' + bar.value.toLocaleString() : '—' }}
            </span>
          </div>
        </div>
        <p class="muted housing-exp__note">Median annual earnings by educational attainment</p>
      </section>

      <!-- Salary by industry -->
      <section class="data-card housing-exp__panel housing-exp__panel--compact">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-cash-multiple"></span>
          <span class="housing-exp__panel-title">Salary by Industry</span>
        </div>
        <select v-model="selectedIndustry" class="income-industry__select">
          <option value="" disabled>Choose an industry…</option>
          <option v-for="opt in INDUSTRY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>

        <div v-if="industryLoading" class="housing-exp__panel-metrics" style="margin-top: 12px;">
          <div v-for="i in 3" :key="i" class="metric skeleton-block">
            <span class="metric__label skeleton-line skeleton-line--label"></span>
            <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
          </div>
        </div>
        <p v-else-if="industryError" class="muted" style="margin-top: 12px;">{{ industryError }}</p>

        <template v-else-if="industryData">
          <div class="bar-list" style="margin-top: 12px;">
            <div v-for="bar in industryTierBars" :key="bar.label" class="bar-list__row">
              <span class="bar-list__label">{{ bar.label }}</span>
              <div class="bar-list__track">
                <div class="bar-list__fill" :style="{ width: bar.pct + '%' }"></div>
              </div>
              <span class="bar-list__value">{{ bar.value != null ? `$${bar.value.toLocaleString()}` : '—' }}</span>
            </div>
          </div>

          <div class="housing-exp__panel-metrics" style="margin-top: 12px;">
            <div v-if="industryData.employment != null" class="metric">
              <span class="metric__label">Jobs in Field</span>
              <span class="metric__value">{{ industryData.employment.toLocaleString() }}</span>
              <span v-if="industryData.employmentPerThousand != null" class="muted" style="display: block; font-size: 0.74rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                {{ industryData.employmentPerThousand }} per 1,000 local jobs
              </span>
            </div>
            <div v-if="industryData.locationQuotient != null" class="metric">
              <span class="metric__label">Concentration</span>
              <span class="metric__value">{{ industryData.locationQuotient.toFixed(2) }}×</span>
              <span class="muted" style="display: block; font-size: 0.74rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ locationQuotientLabel }}</span>
            </div>
            <div v-if="payGrowthPct != null" class="metric">
              <span class="metric__label">Entry → Senior Growth</span>
              <span class="metric__value">+{{ payGrowthPct }}%</span>
              <span class="muted" style="display: block; font-size: 0.74rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Typical for this field</span>
            </div>
          </div>
          <p class="muted housing-exp__note">
            {{ industryData.geographyLevel === 'msa' ? industryData.geographyName : `Statewide (${industryData.geographyName}) — no metro-level data for this city` }}
            · BLS OEWS {{ industryData.year }}
          </p>
        </template>
        <p v-else class="muted housing-exp__note">Pick an industry to see entry, mid, and senior-level pay here.</p>
      </section>

      <!-- Industry breakdown -->
      <section v-if="topIndustries.length" class="data-card housing-exp__panel housing-exp__panel--compact">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-briefcase-outline"></span>
          <span class="housing-exp__panel-title">Industry Breakdown</span>
          <span v-if="industryDiversityLabel" class="muted" style="margin-left: auto; font-size: 0.74rem;">
            {{ industryDiversityLabel }}
          </span>
        </div>
        <div class="bar-list bar-list--wide">
          <div v-for="sector in topIndustries" :key="sector.name" class="bar-list__row">
            <span class="bar-list__label">{{ sector.name }}</span>
            <div class="bar-list__track">
              <div class="bar-list__fill" :style="{ width: sector.barPct + '%' }"></div>
            </div>
            <span class="bar-list__value">{{ (sector.share * 100).toFixed(1) }}%</span>
          </div>
        </div>
        <div class="housing-exp__note" style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px;">
          <span class="muted">Share of civilian employed residents 16+</span>
          <button v-if="allIndustries.length > topIndustries.length" class="data-card__link" style="font-size: 0.78rem;" @click="industryModalOpen = true">
            View all →
          </button>
        </div>
      </section>

      <!-- Income distribution donut -->
      <section v-if="incomeDonutSegments.length" class="data-card housing-exp__panel housing-exp__panel--compact">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-chart-donut"></span>
          <span class="housing-exp__panel-title">Income Distribution</span>
        </div>
        <div class="struct-donut-wrap">
          <svg viewBox="0 0 120 120" class="struct-donut" aria-hidden="true">
            <circle cx="60" cy="60" r="45" fill="none" stroke="var(--border-card)" stroke-width="20" />
            <circle
              v-for="seg in incomeDonutSegments"
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
            <div v-for="seg in incomeDonutSegments" :key="seg.label" class="struct-legend__item">
              <span class="struct-legend__dot" :style="{ background: seg.color }"></span>
              <span class="struct-legend__label">{{ seg.label }}</span>
              <span class="struct-legend__pct">{{ seg.pct.toFixed(1) }}%</span>
            </div>
          </div>
        </div>
      </section>

    </div>

    <!-- Industry all-sectors modal -->
    <Teleport to="body">
      <Transition name="industry-modal">
        <div v-if="industryModalOpen" class="industry-modal__backdrop" @click.self="industryModalOpen = false">
          <div class="industry-modal__panel data-card">
            <div class="industry-modal__header">
              <div class="housing-exp__panel-head" style="margin-bottom: 0;">
                <span class="data-card__icon mdi mdi-briefcase-outline"></span>
                <span class="housing-exp__panel-title">All Industries</span>
              </div>
              <button class="industry-modal__close" @click="industryModalOpen = false">
                <span class="mdi mdi-close"></span>
              </button>
            </div>
            <div class="bar-list bar-list--modal">
              <div
                v-for="sector in allIndustries"
                :key="sector.name"
                class="bar-list__row"
                :style="{ '--row-fill': `${sector.barPct}%` }"
              >
                <span class="bar-list__label">{{ sector.name }}</span>
                <div class="bar-list__track">
                  <div class="bar-list__fill" :style="{ width: sector.barPct + '%' }"></div>
                </div>
                <span class="bar-list__value">{{ (sector.share * 100).toFixed(1) }}%</span>
              </div>
            </div>
            <p class="muted housing-exp__note" style="margin-top: 12px;">Share of civilian employed residents 16+</p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
