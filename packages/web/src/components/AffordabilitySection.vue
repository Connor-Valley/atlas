<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { fetchAffordability } from "../api/affordability";

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
  return Math.min(100, Math.round(((0.5 - data.value.rentToIncomeRatio) / 0.5) * 100));
});

async function load() {
  if (!props.city || !props.state) return;

  loading.value = true;
  error.value = null;
  data.value = null;

  try {
    data.value = await fetchAffordability(props.state, props.city);
    if (score.value !== null) {
      emit('score', score.value);
    }
  } catch {
    error.value = "Failed to load affordability data";
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
  <div class="data-card data-card--wide">
    <div class="data-card__header">
      <div class="data-card__title">
        <span class="data-card__icon mdi mdi-scale-balance"></span>
        <span class="data-card__name">Affordability</span>
      </div>
      <span v-if="score !== null" class="data-card__score">{{ score }}</span>
    </div>

    <div v-if="score !== null" class="data-card__bar-row">
      <div class="data-card__bar">
        <div class="data-card__bar-fill" :style="{ width: Math.max(0, score) + '%' }"></div>
      </div>
      <span class="data-card__bar-label">{{ Math.max(0, score) }}/100</span>
    </div>

    <div class="data-card__body">
      <p v-if="loading" class="muted">Loading…</p>
      <p v-else-if="error" class="muted">{{ error }}</p>

      <div v-else-if="data" class="data-card__metrics">
        <div class="metric">
          <span class="metric__label">Median Rent</span>
          <span class="metric__value">${{ data.medianRent.toLocaleString() }}</span>
        </div>
        <div class="metric">
          <span class="metric__label">Rent / Income</span>
          <span class="metric__value">{{ (data.rentToIncomeRatio * 100).toFixed(1) }}%</span>
        </div>
        <div class="metric">
          <span class="metric__label">Status</span>
          <span class="metric__value" :class="data.affordability === 'Affordable' ? 'positive' : 'status-warning'">
            {{ data.affordability }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="data" class="data-card__footer">
      <button class="data-card__link" @click="emit('expand')">View Details →</button>
    </div>
  </div>
</template>
