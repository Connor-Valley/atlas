<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { fetchAffordability } from "../api/affordability";

const props = defineProps<{ city: string; state: string }>();
const emit = defineEmits<{ (e: "close"): void }>();

const data = ref<any>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const score = computed(() => {
  if (!data.value) return null;
  return Math.min(100, Math.round(((0.5 - data.value.rentToIncomeRatio) / 0.5) * 100));
});

async function load() {
  if (!props.city || !props.state) return;
  loading.value = true;
  error.value = null;
  data.value = null;
  try {
    data.value = await fetchAffordability(props.state, props.city);
  } catch {
    error.value = "Failed to load affordability data";
  } finally {
    loading.value = false;
  }
}

watch(() => [props.city, props.state], load, { immediate: true });
</script>

<template>
  <div class="housing-exp">
    <div class="housing-exp__nav">
      <button class="breadcrumb" @click="emit('close')">
        <span class="mdi mdi-arrow-left" style="font-size: 1rem;"></span>
        Overview
      </button>
      <span class="housing-exp__subtitle">Affordability Details</span>
    </div>

    <div class="data-card housing-exp__stage-card">
      <div class="data-card__header housing-exp__hero-header">
        <div class="data-card__title">
          <span class="data-card__icon mdi mdi-scale-balance"></span>
          <span class="data-card__name">Affordability</span>
        </div>
      </div>

      <div v-if="score !== null" class="data-card__bar-row housing-exp__bar-row">
        <div class="data-card__bar">
          <div class="data-card__bar-fill" :style="{ width: Math.max(0, score) + '%' }"></div>
        </div>
        <span class="data-card__bar-label">{{ Math.max(0, score) }}/100</span>
      </div>

      <div class="housing-exp__content">
        <div class="housing-exp__hero-meta">
          <div class="housing-exp__hero-side">
            <div class="data-card__title">
              <span class="data-card__icon mdi mdi-home-percent-outline"></span>
              <span class="data-card__name">Affordability Snapshot</span>
            </div>
          </div>

          <div v-if="data?.medianRent" class="housing-exp__hero-value">
            ${{ data.medianRent.toLocaleString() }}
            <span class="housing-exp__hero-caption">Median Rent</span>
          </div>
        </div>

        <div v-if="loading" class="housing-exp__state">
          <p class="muted">Loading affordability details…</p>
        </div>

        <div v-else-if="error" class="housing-exp__state">
          <p class="muted">{{ error }}</p>
        </div>

        <div v-else-if="data" class="housing-exp__summary">
          <div class="metric housing-exp__summary-metric">
            <span class="metric__label">Median Rent</span>
            <span class="metric__value">${{ data.medianRent.toLocaleString() }}</span>
          </div>
          <div class="metric housing-exp__summary-metric">
            <span class="metric__label">Rent / Income</span>
            <span class="metric__value">{{ (data.rentToIncomeRatio * 100).toFixed(1) }}%</span>
          </div>
          <div class="metric housing-exp__summary-metric">
            <span class="metric__label">Status</span>
            <span class="metric__value" :class="data.affordability === 'Affordable' ? 'positive' : 'status-warning'">
              {{ data.affordability }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
