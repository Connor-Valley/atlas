<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { fetchClimate } from "../api/climate";

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
    data.value = await fetchClimate(props.state, props.city);
  } catch {
    error.value = "Failed to load climate details";
  } finally {
    loading.value = false;
  }
}

watch(() => [props.city, props.state], load, { immediate: true });

const HAZARD_FIELDS: { key: string; label: string; icon: string }[] = [
  { key: "tornado",          label: "Tornado",          icon: "mdi-weather-tornado" },
  { key: "hurricane",        label: "Hurricane",        icon: "mdi-weather-hurricane" },
  { key: "riverineFlooding", label: "Riverine Flooding", icon: "mdi-waves" },
  { key: "coastalFlooding",  label: "Coastal Flooding", icon: "mdi-beach" },
  { key: "wildfire",         label: "Wildfire",         icon: "mdi-fire" },
  { key: "earthquake",       label: "Earthquake",       icon: "mdi-pulse" },
  { key: "winterWeather",    label: "Winter Weather",   icon: "mdi-snowflake" },
  { key: "heatWave",         label: "Heat Wave",        icon: "mdi-thermometer-high" },
  { key: "drought",          label: "Drought",          icon: "mdi-water-off" },
];

function hazardClass(rating: string | null | undefined) {
  if (rating === "Very Low" || rating === "Relatively Low") return "positive";
  if (rating === "Relatively Moderate") return "status-caution";
  if (rating === "Relatively High") return "status-warning";
  if (rating === "Very High") return "status-danger";
  return "";
}

const hazardTiles = computed(() => {
  const risks = data.value?.hazardRisks;
  if (!risks) return [];
  return HAZARD_FIELDS.map(f => ({
    ...f,
    rating: risks[f.key]?.rating ?? "Not Applicable",
    class: hazardClass(risks[f.key]?.rating),
  }));
});

// ── Insight callouts ──────────────────────────────────────────────────────────

const comfortInsight = computed(() => {
  const d = data.value;
  if (!d || d.avgTempF == null) return null;
  const sunny = d.sunnyDaysPerYear;
  if (d.avgTempF >= 55 && d.avgTempF <= 72 && sunny != null && sunny >= 200) {
    return {
      type: "positive",
      icon: "mdi-weather-sunny",
      headline: "Mild, sunny climate year-round",
      detail: `Average temp of ${Math.round(d.avgTempF)}°F with ${Math.round(sunny)} sunny days a year.`,
    };
  }
  if (d.hotDaysPerYear != null && d.hotDaysPerYear >= 60) {
    return {
      type: "warning",
      icon: "mdi-thermometer-alert",
      headline: `${Math.round(d.hotDaysPerYear)} days a year above 95°F`,
      detail: "Expect a long, hot summer season — factor in cooling costs.",
    };
  }
  if (d.freezingDaysPerYear != null && d.freezingDaysPerYear >= 90) {
    return {
      type: "warning",
      icon: "mdi-snowflake-alert",
      headline: `${Math.round(d.freezingDaysPerYear)} freezing days a year`,
      detail: "A long, cold winter season — factor in heating costs and snow removal.",
    };
  }
  return {
    type: "neutral",
    icon: "mdi-thermometer",
    headline: `Average temperature of ${Math.round(d.avgTempF)}°F`,
    detail: `Summers average ${d.summerAvgHighF != null ? Math.round(d.summerAvgHighF) + '°F' : '—'}, winters average ${d.winterAvgLowF != null ? Math.round(d.winterAvgLowF) + '°F' : '—'}.`,
  };
});

const hazardInsight = computed(() => {
  const rating = data.value?.hazardRisks?.compositeRating;
  if (!rating || rating === "Not Applicable") return null;
  if (rating === "Very High" || rating === "Relatively High") {
    return {
      type: "warning",
      icon: "mdi-alert-outline",
      headline: `${rating} overall natural hazard risk`,
      detail: "This area faces elevated exposure to natural disasters compared to the national average.",
    };
  }
  if (rating === "Very Low" || rating === "Relatively Low") {
    return {
      type: "positive",
      icon: "mdi-shield-check-outline",
      headline: `${rating} overall natural hazard risk`,
      detail: "This area faces below-average exposure to natural disasters compared to the national average.",
    };
  }
  return {
    type: "neutral",
    icon: "mdi-shield-alert-outline",
    headline: `${rating} overall natural hazard risk`,
    detail: "This area's natural disaster exposure is near the national average.",
  };
});

const insights = computed(() => [comfortInsight.value, hazardInsight.value].filter(Boolean));

const loadingInsightCards = [1, 2];
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
        <span class="mdi mdi-weather-partly-cloudy housing-exp__snapshot-icon"></span>
        <span class="housing-exp__snapshot-title">Climate Snapshot</span>
      </div>

      <div v-if="loading" class="housing-exp__snapshot-skeleton" aria-hidden="true">
        <div class="housing-exp__snapshot-grid">
          <div v-for="i in 6" :key="i" class="snap-metric snap-metric--primary snap-metric--skeleton">
            <span class="snap-metric__label snap-metric__label--skeleton skeleton-line"></span>
            <span class="snap-metric__value snap-metric__value--skeleton snap-metric__value--skeleton-lg skeleton-line"></span>
          </div>
        </div>
      </div>
      <div v-else-if="error" class="housing-exp__state">
        <p class="muted">{{ error }}</p>
      </div>

      <template v-else-if="data">
        <div class="housing-exp__snapshot-grid">
          <div class="snap-metric snap-metric--primary">
            <span class="snap-metric__label"><span class="mdi mdi-thermometer snap-metric__icon"></span>Average Temp</span>
            <span class="snap-metric__value">{{ data.avgTempF != null ? Math.round(data.avgTempF) + '°F' : '—' }}</span>
          </div>
          <div class="snap-metric snap-metric--primary">
            <span class="snap-metric__label"><span class="mdi mdi-white-balance-sunny snap-metric__icon"></span>Summer High</span>
            <span class="snap-metric__value">{{ data.summerAvgHighF != null ? Math.round(data.summerAvgHighF) + '°F' : '—' }}</span>
          </div>
          <div class="snap-metric snap-metric--primary">
            <span class="snap-metric__label"><span class="mdi mdi-snowflake snap-metric__icon"></span>Winter Low</span>
            <span class="snap-metric__value">{{ data.winterAvgLowF != null ? Math.round(data.winterAvgLowF) + '°F' : '—' }}</span>
          </div>
          <div class="snap-metric snap-metric--secondary">
            <span class="snap-metric__label"><span class="mdi mdi-weather-sunny snap-metric__icon"></span>Sunny Days/Yr</span>
            <span class="snap-metric__value">{{ data.sunnyDaysPerYear != null ? Math.round(data.sunnyDaysPerYear) : '—' }}</span>
          </div>
          <div class="snap-metric snap-metric--secondary">
            <span class="snap-metric__label"><span class="mdi mdi-weather-pouring snap-metric__icon"></span>Annual Precip.</span>
            <span class="snap-metric__value">{{ data.annualPrecipitationInches != null ? data.annualPrecipitationInches.toFixed(1) + '"' : '—' }}</span>
          </div>
          <div class="snap-metric snap-metric--secondary">
            <span class="snap-metric__label"><span class="mdi mdi-weather-snowy-heavy snap-metric__icon"></span>Annual Snowfall</span>
            <span class="snap-metric__value">{{ data.annualSnowfallInches != null ? data.annualSnowfallInches.toFixed(1) + '"' : '—' }}</span>
          </div>
        </div>
      </template>
    </div>

    <!-- Loading skeleton for grid -->
    <div v-if="loading" class="housing-exp__grid" aria-hidden="true">
      <section class="data-card housing-exp__panel housing-exp__panel--compact">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-thermometer-lines"></span>
          <span class="housing-exp__panel-title">Heat &amp; Cold</span>
        </div>
        <div class="housing-exp__panel-metrics">
          <div v-for="i in 2" :key="i" class="metric skeleton-block">
            <span class="metric__label skeleton-line skeleton-line--label"></span>
            <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
          </div>
        </div>
      </section>
      <section class="data-card housing-exp__panel housing-exp__panel--compact">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-weather-pouring"></span>
          <span class="housing-exp__panel-title">Precipitation &amp; Snow</span>
        </div>
        <div class="housing-exp__panel-metrics">
          <div v-for="i in 2" :key="i" class="metric skeleton-block">
            <span class="metric__label skeleton-line skeleton-line--label"></span>
            <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
          </div>
        </div>
      </section>
      <section class="data-card housing-exp__panel housing-exp__panel--wide">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-shield-alert-outline"></span>
          <span class="housing-exp__panel-title">Natural Hazard Risk</span>
        </div>
        <div class="housing-exp__panel-metrics">
          <div v-for="i in 9" :key="i" class="metric skeleton-block">
            <span class="metric__label skeleton-line skeleton-line--label"></span>
            <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
          </div>
        </div>
      </section>
    </div>

    <!-- Data grid -->
    <div v-else-if="data" class="housing-exp__grid">

      <!-- Heat & Cold -->
      <section class="data-card housing-exp__panel housing-exp__panel--compact">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-thermometer-lines"></span>
          <span class="housing-exp__panel-title">Heat &amp; Cold</span>
        </div>
        <div class="housing-exp__panel-metrics">
          <div v-if="data.hotDaysPerYear != null" class="metric">
            <span class="metric__label">Days Above 95°F</span>
            <span class="metric__value" :class="data.hotDaysPerYear >= 60 ? 'status-warning' : ''">{{ Math.round(data.hotDaysPerYear) }}</span>
          </div>
          <div v-if="data.freezingDaysPerYear != null" class="metric">
            <span class="metric__label">Days Below 32°F</span>
            <span class="metric__value" :class="data.freezingDaysPerYear >= 90 ? 'status-warning' : ''">{{ Math.round(data.freezingDaysPerYear) }}</span>
          </div>
        </div>
        <p class="muted housing-exp__note">
          {{ data.dataYearRange ? `Historical average, ${data.dataYearRange}.` : '' }} Source: Open-Meteo Historical Weather Archive.
        </p>
      </section>

      <!-- Precipitation & Snow -->
      <section class="data-card housing-exp__panel housing-exp__panel--compact">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-weather-pouring"></span>
          <span class="housing-exp__panel-title">Precipitation &amp; Snow</span>
        </div>
        <div class="housing-exp__panel-metrics">
          <div v-if="data.annualPrecipitationInches != null" class="metric">
            <span class="metric__label">Annual Precipitation</span>
            <span class="metric__value">{{ data.annualPrecipitationInches.toFixed(1) }}"</span>
          </div>
          <div v-if="data.annualSnowfallInches != null" class="metric">
            <span class="metric__label">Annual Snowfall</span>
            <span class="metric__value">{{ data.annualSnowfallInches.toFixed(1) }}"</span>
          </div>
        </div>
        <p class="muted housing-exp__note">
          {{ data.dataYearRange ? `Historical average, ${data.dataYearRange}.` : '' }} Source: Open-Meteo Historical Weather Archive.
        </p>
      </section>

      <!-- Natural Hazard Risk -->
      <section v-if="data.hazardRisks" class="data-card housing-exp__panel housing-exp__panel--wide">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-shield-alert-outline"></span>
          <span class="housing-exp__panel-title">Natural Hazard Risk</span>
        </div>

        <div class="hazard-tier">
          <span class="hazard-tier__label" :class="hazardClass(data.hazardRisks.compositeRating)">
            {{ data.hazardRisks.compositeRating ?? 'Not Available' }}
          </span>
          <span v-if="data.hazardRisks.compositeScore != null" class="muted hazard-tier__ratio">
            {{ Math.round(data.hazardRisks.compositeScore) }}th percentile nationally for overall risk
          </span>
        </div>

        <div class="housing-exp__panel-metrics hazard-grid">
          <div v-for="hazard in hazardTiles" :key="hazard.key" class="metric">
            <span class="metric__label">
              <span class="mdi hazard-grid__icon" :class="hazard.icon"></span>
              {{ hazard.label }}
            </span>
            <span class="metric__value" :class="hazard.class">{{ hazard.rating }}</span>
          </div>
        </div>

        <p class="muted housing-exp__note">Source: FEMA National Risk Index, 2023. Ratings are national percentiles — "Not Applicable" means this hazard type does not affect the area.</p>
      </section>

    </div>
  </div>
</template>

<style scoped>
.hazard-tier {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.hazard-tier__label {
  font-size: 1.1rem;
  font-weight: 700;
}

.hazard-tier__ratio {
  font-size: 0.84rem;
}

.hazard-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 4px;
}

.hazard-grid__icon {
  font-size: 0.8rem;
  margin-right: 4px;
  vertical-align: middle;
  opacity: 0.75;
}
</style>
