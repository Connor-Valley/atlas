<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { fetchClimate } from "../api/climate";

const props = defineProps<{ city: string; state: string }>();
const emit = defineEmits<{
  (e: 'score', value: number): void;
  (e: 'expand'): void;
}>();

const data    = ref<any>(null);
const loading = ref(false);
const error   = ref<string | null>(null);

const comfortScore = computed(() => {
  const d = data.value;
  if (!d || d.avgTempF == null) return null;
  let score = 100 - Math.abs(d.avgTempF - 65) * 1.8;
  if (d.hotDaysPerYear != null) score -= d.hotDaysPerYear * 0.15;
  if (d.freezingDaysPerYear != null) score -= d.freezingDaysPerYear * 0.12;
  if (d.sunnyDaysPerYear != null) score += (d.sunnyDaysPerYear - 180) * 0.08;
  return Math.max(0, Math.min(100, Math.round(score)));
});

const hazardRatingClass = computed(() => {
  const rating = data.value?.hazardRisks?.compositeRating;
  if (rating === "Very Low" || rating === "Relatively Low") return "positive";
  if (rating === "Relatively Moderate") return "status-caution";
  if (rating === "Relatively High") return "status-warning";
  if (rating === "Very High") return "status-danger";
  return "";
});

async function load() {
  if (!props.city || !props.state) return;
  loading.value = true;
  error.value   = null;
  data.value    = null;

  try {
    data.value = await fetchClimate(props.state, props.city);
    if (comfortScore.value !== null) emit("score", comfortScore.value);
  } catch {
    error.value = "Failed to load climate data";
  } finally {
    loading.value = false;
  }
}

watch(() => [props.city, props.state], ([city, state]) => {
  if (!city || !state) return;
  load();
}, { immediate: true });
</script>

<template>
  <div class="data-card data-card--wide">
    <div class="data-card__header">
      <div class="data-card__title">
        <span class="data-card__icon mdi mdi-weather-partly-cloudy"></span>
        <span class="data-card__name">Climate</span>
      </div>
      <span v-if="comfortScore !== null" class="data-card__score">{{ comfortScore }}</span>
    </div>

    <div v-if="comfortScore !== null" class="data-card__bar-row">
      <div class="data-card__bar">
        <div class="data-card__bar-fill" :style="{ width: Math.max(0, comfortScore) + '%' }"></div>
      </div>
      <span class="data-card__bar-label">{{ Math.max(0, comfortScore) }}/100</span>
    </div>
    <div v-else class="data-card__bar-row">
      <div class="data-card__bar data-card__bar--placeholder">
        <div class="data-card__bar-fill data-card__bar-fill--placeholder" style="width: 54%"></div>
      </div>
      <span class="data-card__bar-label skeleton-line skeleton-line--label"></span>
    </div>

    <div class="data-card__body">
      <div v-if="loading" class="data-card__metrics">
        <div v-for="i in 6" :key="i" class="metric skeleton-block">
          <span class="metric__label skeleton-line skeleton-line--label"></span>
          <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
        </div>
      </div>
      <p v-else-if="error" class="muted">{{ error }}</p>

      <div v-else-if="data" class="data-card__metrics">
        <div class="metric">
          <span class="metric__label">Summer High</span>
          <span class="metric__value">{{ data.summerAvgHighF != null ? Math.round(data.summerAvgHighF) + '°F' : '—' }}</span>
        </div>
        <div class="metric">
          <span class="metric__label">Winter Low</span>
          <span class="metric__value">{{ data.winterAvgLowF != null ? Math.round(data.winterAvgLowF) + '°F' : '—' }}</span>
        </div>
        <div class="metric">
          <span class="metric__label">Sunny Days/Yr</span>
          <span class="metric__value">{{ data.sunnyDaysPerYear != null ? Math.round(data.sunnyDaysPerYear) : '—' }}</span>
        </div>
        <div class="metric">
          <span class="metric__label">Annual Precip.</span>
          <span class="metric__value">{{ data.annualPrecipitationInches != null ? data.annualPrecipitationInches.toFixed(1) + '"' : '—' }}</span>
        </div>
        <div class="metric">
          <span class="metric__label">Annual Snowfall</span>
          <span class="metric__value">{{ data.annualSnowfallInches != null ? data.annualSnowfallInches.toFixed(1) + '"' : '—' }}</span>
        </div>
        <div class="metric">
          <span class="metric__label">Hazard Risk</span>
          <span class="metric__value" :class="hazardRatingClass">{{ data.hazardRisks?.compositeRating ?? '—' }}</span>
        </div>
      </div>
    </div>

    <div class="data-card__footer">
      <button class="data-card__link" :disabled="!data" @click="emit('expand')">View Details →</button>
    </div>
  </div>
</template>
