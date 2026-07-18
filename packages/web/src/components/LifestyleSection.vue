<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { fetchLifestyle } from "../api/lifestyle";
import { fetchAirQuality } from "../api/airQuality";

const props = defineProps<{ city: string; state: string }>();
const emit = defineEmits<{
  (e: 'score', value: number): void;
  (e: 'expand'): void;
}>();

const lifestyle = ref<any>(null);
const airQuality = ref<any>(null);
const loading = ref(false);
const error   = ref<string | null>(null);

function densityScore(perTenThousand: number | null | undefined, min: number, max: number) {
  if (perTenThousand == null) return null;
  return Math.max(0, Math.min(100, ((perTenThousand - min) / (max - min)) * 100));
}

const vibrancyScore = computed(() => {
  const l = lifestyle.value;
  const aqi = airQuality.value;
  if (!l) return null;
  const scores = [
    densityScore(l.restaurants?.perTenThousandResidents, 5, 80),
    densityScore(l.bars?.perTenThousandResidents, 2, 40),
    densityScore(l.artsAndCulture?.perTenThousandResidents, 1, 20),
    aqi?.goodDaysPercent != null ? Math.max(0, Math.min(100, aqi.goodDaysPercent)) : null,
  ].filter((s): s is number => s != null);
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
});

const aqiRatingClass = computed(() => {
  const category = airQuality.value?.aqiCategory;
  if (category === "Good") return "positive";
  if (category === "Moderate") return "status-caution";
  if (category === "Unhealthy for Sensitive Groups") return "status-caution";
  if (category === "Unhealthy" || category === "Very Unhealthy") return "status-danger";
  return "";
});

async function load() {
  if (!props.city || !props.state) return;
  loading.value = true;
  error.value   = null;
  lifestyle.value  = null;
  airQuality.value = null;

  const results = await Promise.allSettled([
    fetchLifestyle(props.state, props.city),
    fetchAirQuality(props.state, props.city),
  ]);
  lifestyle.value  = results[0].status === "fulfilled" ? results[0].value : null;
  airQuality.value = results[1].status === "fulfilled" ? results[1].value : null;

  if (!lifestyle.value && !airQuality.value) {
    error.value = "Failed to load lifestyle data";
  } else if (vibrancyScore.value !== null) {
    emit("score", vibrancyScore.value);
  }
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
        <span class="data-card__icon mdi mdi-silverware-fork-knife"></span>
        <span class="data-card__name">Lifestyle &amp; Connectivity</span>
      </div>
      <span v-if="vibrancyScore !== null" class="data-card__score">{{ vibrancyScore }}</span>
    </div>

    <div v-if="vibrancyScore !== null" class="data-card__bar-row">
      <div class="data-card__bar">
        <div class="data-card__bar-fill" :style="{ width: Math.max(0, vibrancyScore) + '%' }"></div>
      </div>
      <span class="data-card__bar-label">{{ Math.max(0, vibrancyScore) }}/100</span>
    </div>
    <div v-else class="data-card__bar-row">
      <div class="data-card__bar data-card__bar--placeholder">
        <div class="data-card__bar-fill data-card__bar-fill--placeholder" style="width: 54%"></div>
      </div>
      <span class="data-card__bar-label skeleton-line skeleton-line--label"></span>
    </div>

    <div class="data-card__body">
      <div v-if="loading" class="data-card__metrics">
        <div v-for="i in 3" :key="i" class="metric skeleton-block">
          <span class="metric__label skeleton-line skeleton-line--label"></span>
          <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
        </div>
      </div>
      <p v-else-if="error" class="muted">{{ error }}</p>

      <div v-else class="data-card__metrics">
        <div class="metric">
          <span class="metric__label">Restaurants /10k</span>
          <span class="metric__value">{{ lifestyle?.restaurants?.perTenThousandResidents != null ? lifestyle.restaurants.perTenThousandResidents.toFixed(1) : '—' }}</span>
        </div>
        <div class="metric">
          <span class="metric__label">Bars /10k</span>
          <span class="metric__value">{{ lifestyle?.bars?.perTenThousandResidents != null ? lifestyle.bars.perTenThousandResidents.toFixed(1) : '—' }}</span>
        </div>
        <div class="metric">
          <span class="metric__label">Air Quality</span>
          <span class="metric__value" :class="aqiRatingClass">{{ airQuality?.aqiCategory ?? '—' }}</span>
        </div>
      </div>
    </div>

    <div class="data-card__footer">
      <button class="data-card__link" :disabled="!lifestyle && !airQuality" @click="emit('expand')">View Details →</button>
    </div>
  </div>
</template>
