<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { fetchIncome } from "../api/income";

const props = defineProps<{ city: string; state: string }>();
const emit = defineEmits<{
  (e: 'score', value: number): void;
  (e: 'expand'): void;
}>();

const data = ref<any>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const score = computed(() => {
  if (!data.value) return null;
  return Math.min(100, Math.round((data.value.medianHouseholdIncome / 150000) * 100));
});

async function load() {
  if (!props.city || !props.state) return;

  loading.value = true;
  error.value = null;
  data.value = null;

  try {
    data.value = await fetchIncome(props.state, props.city);
    if (score.value !== null) {
      emit('score', score.value);
    }
  } catch {
    error.value = "Failed to load income data";
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.city, props.state],
  ([city, state]) => {
    if (!city || !state) return;
    load();
  },
  { immediate: true }
);
</script>

<template>
  <div class="data-card">
    <div class="data-card__header">
      <div class="data-card__title">
        <span class="data-card__icon mdi mdi-trending-up"></span>
        <span class="data-card__name">Economic</span>
      </div>
      <span v-if="score !== null" class="data-card__score">{{ score }}</span>
    </div>

    <div v-if="score !== null" class="data-card__bar-row">
      <div class="data-card__bar">
        <div class="data-card__bar-fill" :style="{ width: score + '%' }"></div>
      </div>
      <span class="data-card__bar-label">{{ score }}/100</span>
    </div>

    <div class="data-card__body">
      <p v-if="loading" class="muted">Loading…</p>
      <p v-else-if="error" class="muted">{{ error }}</p>

      <div v-else-if="data" class="data-card__metrics">
        <div class="metric">
          <span class="metric__label">Median Household Income</span>
          <span class="metric__value">${{ data.medianHouseholdIncome.toLocaleString() }}</span>
        </div>
        <div class="metric">
          <span class="metric__label">Median Renter Income</span>
          <span class="metric__value">${{ data.medianRenterIncome.toLocaleString() }}</span>
        </div>
        <div class="metric">
          <span class="metric__label">Poverty Rate</span>
          <span class="metric__value">{{ data.povertyRate.toFixed(1) }}%</span>
        </div>
      </div>
    </div>

    <div v-if="data" class="data-card__footer">
      <button class="data-card__link" @click="emit('expand')">View Details →</button>
    </div>
  </div>
</template>
