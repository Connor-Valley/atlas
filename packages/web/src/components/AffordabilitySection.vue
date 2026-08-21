<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { fetchAffordability } from "../api/affordability";
import { fetchCostOfLiving } from "../api/costOfLiving";

const props = defineProps<{ city: string; state: string }>();
const emit = defineEmits<{
  (e: 'score', value: number): void;
  (e: 'expand'): void;
  (e: 'data-unavailable', value: boolean): void;
}>();

const data    = ref<any>(null);
const col     = ref<any>(null);
const loading = ref(false);
const error   = ref<string | null>(null);

const score = computed(() => {
  if (!data.value || data.value.rentToIncomeRatio == null) return null;
  return Math.max(0, Math.min(100, Math.round((1 - data.value.rentToIncomeRatio / 0.6) * 100)));
});

// Loaded successfully, but Census suppressed rent and/or renter income for
// this city — distinct from "still loading," which also has score === null.
const dataUnavailable = computed(() => !!data.value && score.value === null);
watch(dataUnavailable, (v) => emit('data-unavailable', v), { immediate: true });

const statusClass = computed(() => {
  const a = data.value?.affordability;
  if (a === "Comfortably Affordable") return "positive";
  if (a === "Affordable") return "positive";
  if (a === "Moderately Burdened") return "status-caution";
  if (a === "Rent Burdened") return "status-warning";
  if (a === "Severely Rent Burdened") return "status-danger";
  return "";
});

const colDeltaClass = computed(() => {
  const v = col.value?.rppVsNational;
  if (v == null) return "";
  if (v <= -5)  return "positive";
  if (v >= 10)  return "status-danger";
  if (v >= 5)   return "status-warning";
  return "";
});

const colDeltaLabel = computed(() => {
  const v = col.value?.rppVsNational;
  if (v == null) return null;
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
});

const NATIONAL_MEDIAN_INCOME = 77719;

const colEquivalentIncome = computed(() => {
  const v = col.value?.rppIndex;
  if (v == null) return null;
  return Math.round(NATIONAL_MEDIAN_INCOME * (v / 100));
});

async function load() {
  if (!props.city || !props.state) return;
  loading.value = true;
  error.value   = null;
  data.value    = null;
  col.value     = null;

  const [aff, colResult] = await Promise.allSettled([
    fetchAffordability(props.state, props.city),
    fetchCostOfLiving(props.state, props.city),
  ]);

  if (aff.status === "fulfilled") {
    data.value = aff.value;
    if (score.value !== null) emit("score", score.value);
  } else {
    error.value = "Failed to load affordability data";
  }
  if (colResult.status === "fulfilled") col.value = colResult.value;

  loading.value = false;
}

watch(() => [props.city, props.state], ([city, state]) => {
  if (!city || !state) return;
  load();
}, { immediate: true });
</script>

<template>
  <div class="data-card">
    <div class="data-card__header">
      <div class="data-card__title">
        <span class="data-card__icon mdi mdi-scale-balance"></span>
        <span class="data-card__name">Affordability &amp; Cost of Living</span>
      </div>
      <span v-if="score !== null" class="data-card__score">{{ score }}</span>
      <span v-else-if="dataUnavailable" class="data-card__score data-card__score--unavailable">N/A</span>
    </div>

    <div v-if="score !== null" class="data-card__bar-row">
      <div class="data-card__bar">
        <div class="data-card__bar-fill" :style="{ width: Math.max(0, score) + '%' }"></div>
      </div>
      <span class="data-card__bar-label">{{ Math.max(0, score) }}/100</span>
    </div>
    <div v-else-if="dataUnavailable" class="data-card__bar-row">
      <div class="data-card__bar data-card__bar--unavailable"></div>
      <span class="data-card__bar-label data-card__bar-label--unavailable">N/A</span>
    </div>
    <div v-else class="data-card__bar-row">
      <div class="data-card__bar data-card__bar--placeholder">
        <div class="data-card__bar-fill data-card__bar-fill--placeholder" style="width: 54%"></div>
      </div>
      <span class="data-card__bar-label skeleton-line skeleton-line--label"></span>
    </div>

    <div class="data-card__body">
      <div v-if="loading" class="data-card__metrics affordability-card__metrics">
        <div class="metric skeleton-block skeleton-block--hero affordability-card__metric affordability-card__metric--rent">
          <span class="metric__label skeleton-line skeleton-line--label"></span>
          <span class="metric__value skeleton-line skeleton-line--value"></span>
        </div>
        <div class="metric skeleton-block affordability-card__metric affordability-card__metric--income">
          <span class="metric__label skeleton-line skeleton-line--label"></span>
          <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
        </div>
        <div class="metric skeleton-block affordability-card__metric affordability-card__metric--ratio">
          <span class="metric__label skeleton-line skeleton-line--label"></span>
          <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
        </div>
        <div class="metric skeleton-block affordability-card__metric affordability-card__metric--status">
          <span class="metric__label skeleton-line skeleton-line--label"></span>
          <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
        </div>
        <div class="metric skeleton-block affordability-card__metric affordability-card__metric--col-index">
          <span class="metric__label skeleton-line skeleton-line--label"></span>
          <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
        </div>
        <div class="metric skeleton-block affordability-card__metric affordability-card__metric--col-delta">
          <span class="metric__label skeleton-line skeleton-line--label"></span>
          <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
        </div>
        <div class="metric skeleton-block affordability-card__metric affordability-card__metric--purchasing-power">
          <span class="metric__label skeleton-line skeleton-line--label"></span>
          <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
        </div>
      </div>
      <p v-else-if="error" class="muted">{{ error }}</p>

      <div v-else-if="data" class="data-card__metrics affordability-card__metrics">
        <div class="metric affordability-card__metric affordability-card__metric--rent">
          <span class="metric__label">Median Rent</span>
          <span class="metric__value">{{ data.medianRent != null ? `$${data.medianRent.toLocaleString()}` : "—" }}</span>
        </div>
        <div class="metric affordability-card__metric affordability-card__metric--income">
          <span class="metric__label">Renter Income</span>
          <span class="metric__value">{{ data.medianRenterIncome != null ? `$${data.medianRenterIncome.toLocaleString()}` : "—" }}</span>
        </div>
        <div class="metric affordability-card__metric affordability-card__metric--ratio">
          <span class="metric__label">Rent / Income</span>
          <span class="metric__value">{{ data.rentToIncomeRatio != null ? `${(data.rentToIncomeRatio * 100).toFixed(1)}%` : "—" }}</span>
        </div>
        <div class="metric affordability-card__metric affordability-card__metric--status">
          <span class="metric__label">Rent Status</span>
          <span class="metric__value" :class="statusClass">{{ data.affordability ?? "—" }}</span>
        </div>
        <div v-if="col" class="metric affordability-card__metric affordability-card__metric--col-index">
          <span class="metric__label">Cost of Living Index</span>
          <span class="metric__value">{{ col.rppIndex.toFixed(1) }}</span>
          <span class="metric__sub">US avg = 100</span>
        </div>
        <div v-if="col" class="metric affordability-card__metric affordability-card__metric--col-delta">
          <span class="metric__label">vs National</span>
          <span class="metric__value" :class="colDeltaClass">{{ colDeltaLabel }}</span>
          <span class="metric__sub">{{ col.category }}</span>
        </div>
        <div v-if="colEquivalentIncome != null" class="metric affordability-card__metric affordability-card__metric--purchasing-power">
          <span class="metric__label">National Median Income (${{ NATIONAL_MEDIAN_INCOME.toLocaleString() }}) Buys Here</span>
          <span class="metric__value">${{ colEquivalentIncome.toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <div class="data-card__footer">
      <button class="data-card__link" :disabled="!data" @click="emit('expand')">View Details →</button>
    </div>
  </div>
</template>

<style scoped>
.metric__sub {
  font-size: 0.68rem;
  color: var(--text-muted);
  margin-top: 2px;
  line-height: 1.3;
}
</style>
