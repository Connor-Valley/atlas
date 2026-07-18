<script setup lang="ts">
import { computed, ref, watch, type CSSProperties } from "vue";
import { fetchLifestyle } from "../api/lifestyle";
import { fetchAirQuality } from "../api/airQuality";
import { fetchDetailedCityProfile } from "../api/cityProfile";
import { fetchDetailedQualityOfLife } from "../api/qualityOfLife";

const props = defineProps<{ city: string; state: string }>();
const emit = defineEmits<{ (e: "close"): void }>();

const lifestyle  = ref<any>(null);
const airQuality = ref<any>(null);
const profile    = ref<any>(null);
const qol        = ref<any>(null);
const loading    = ref(false);
const error      = ref<string | null>(null);

async function load() {
  if (!props.city || !props.state) return;
  loading.value = true;
  error.value   = null;
  lifestyle.value  = null;
  airQuality.value = null;
  profile.value    = null;
  qol.value        = null;

  const results = await Promise.allSettled([
    fetchLifestyle(props.state, props.city),
    fetchAirQuality(props.state, props.city),
    fetchDetailedCityProfile(props.state, props.city),
    fetchDetailedQualityOfLife(props.state, props.city),
  ]);
  lifestyle.value  = results[0].status === "fulfilled" ? results[0].value : null;
  airQuality.value = results[1].status === "fulfilled" ? results[1].value : null;
  profile.value    = results[2].status === "fulfilled" ? results[2].value : null;
  qol.value        = results[3].status === "fulfilled" ? results[3].value : null;

  if (!lifestyle.value && !airQuality.value && !profile.value && !qol.value) {
    error.value = "Failed to load lifestyle details";
  }
  loading.value = false;
}

watch(() => [props.city, props.state], load, { immediate: true });

// ── Insight callouts ──────────────────────────────────────────────────────────

const airQualityInsight = computed(() => {
  const aqi = airQuality.value;
  if (!aqi?.aqiCategory) return null;
  if (aqi.aqiCategory === "Good") {
    return {
      type: "positive",
      icon: "mdi-weather-windy",
      headline: `Good air quality — ${Math.round(aqi.goodDaysPercent ?? 0)}% of days rated good`,
      detail: `Median AQI of ${aqi.medianAqi ?? "—"}, well within healthy range.`,
    };
  }
  if (aqi.aqiCategory === "Unhealthy" || aqi.aqiCategory === "Very Unhealthy") {
    return {
      type: "warning",
      icon: "mdi-weather-hazy",
      headline: `${aqi.aqiCategory} air quality on average`,
      detail: `${Math.round(aqi.unhealthyDaysPercent ?? 0)}% of days rated unhealthy or worse.`,
    };
  }
  return {
    type: "neutral",
    icon: "mdi-weather-hazy",
    headline: `${aqi.aqiCategory} air quality on average`,
    detail: `Median AQI of ${aqi.medianAqi ?? "—"}.`,
  };
});

const vibrancyInsight = computed(() => {
  const l = lifestyle.value;
  const restaurants = l?.restaurants?.perTenThousandResidents;
  const bars = l?.bars?.perTenThousandResidents;
  const arts = l?.artsAndCulture?.perTenThousandResidents;
  if (restaurants == null && bars == null && arts == null) return null;
  const total = (restaurants ?? 0) + (bars ?? 0) + (arts ?? 0);
  if (total >= 40) {
    return {
      type: "positive",
      icon: "mdi-silverware-fork-knife",
      headline: "Dense dining and culture scene",
      detail: `${restaurants?.toFixed(1) ?? "—"} restaurants, ${bars?.toFixed(1) ?? "—"} bars, and ${arts?.toFixed(1) ?? "—"} arts venues per 10k residents.`,
    };
  }
  if (total >= 15) {
    return {
      type: "neutral",
      icon: "mdi-silverware-fork-knife",
      headline: "Moderate dining and culture scene",
      detail: `${restaurants?.toFixed(1) ?? "—"} restaurants, ${bars?.toFixed(1) ?? "—"} bars, and ${arts?.toFixed(1) ?? "—"} arts venues per 10k residents.`,
    };
  }
  return {
    type: "neutral",
    icon: "mdi-silverware-fork-knife",
    headline: "Limited dining and culture density",
    detail: `${restaurants?.toFixed(1) ?? "—"} restaurants, ${bars?.toFixed(1) ?? "—"} bars, and ${arts?.toFixed(1) ?? "—"} arts venues per 10k residents.`,
  };
});

const insights = computed(() => [airQualityInsight.value, vibrancyInsight.value].filter(Boolean));

const loadingInsightCards = [1, 2];

// ── Air travel (airport) ────────────────────────────────────────────────────────

const airport = computed(() => qol.value?.nearestMajorAirport?.value ?? null);
const airportBusyness = computed(() => qol.value?.airportBusyness?.value ?? null);
const airportDistance = computed(() => qol.value?.airportDistanceMiles?.value ?? null);

// TODO(color-tokens): hardcoded airline brand colors, kept out of shared CSS variables.
const AIRLINE_COLORS: Record<string, { bg: string; text: string }> = {
  "Delta":     { bg: "#2B5EAD66", text: "#ffffff" },
  "United":    { bg: "#2B5EE066", text: "#ffffff" },
  "American":  { bg: "#C8102E66", text: "#ffffff" },
  "Southwest": { bg: "#D4970A66", text: "#ffffff" },
  "Alaska":    { bg: "#0D6E9E66", text: "#ffffff" },
  "JetBlue":   { bg: "#1A6FD466", text: "#ffffff" },
  "Hawaiian":  { bg: "#7B3FAE66", text: "#ffffff" },
  "Frontier":  { bg: "#3D9E3866", text: "#ffffff" },
  "Spirit":    { bg: "#B8960066", text: "#ffffff" },
};

function airlineStyle(airline: string) {
  const colors = AIRLINE_COLORS[airline];
  if (!colors) return {};
  return { backgroundColor: colors.bg, color: colors.text };
}

const tooltipState = ref<{ text: string; x: number; y: number; color: string } | null>(null);

const tooltipFixedStyle = computed((): CSSProperties => {
  if (!tooltipState.value) return {};
  const { x, y, color } = tooltipState.value;
  return { left: `${x}px`, top: `${y}px`, transform: "translateX(-50%)", "--airline-color": color } as CSSProperties;
});

function showTooltip(e: MouseEvent, airline: string) {
  const code = airport.value?.code ?? "";
  const solidColor = (AIRLINE_COLORS[airline]?.bg ?? "#66666666").slice(0, 7);
  tooltipState.value = {
    text: `${code} is a ${airline} hub`,
    x: e.clientX,
    y: e.clientY + 14,
    color: solidColor,
  };
}

function hideTooltip() {
  tooltipState.value = null;
}

// ── Commuting / remote work ─────────────────────────────────────────────────────

const transitSharePct = computed(() => profile.value?.transitShare != null ? Math.round(profile.value.transitShare * 100) : null);
const remoteSharePct  = computed(() => profile.value?.remoteWorkShare != null ? Math.round(profile.value.remoteWorkShare * 100) : null);
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
        <span class="mdi mdi-silverware-fork-knife housing-exp__snapshot-icon"></span>
        <span class="housing-exp__snapshot-title">Lifestyle Snapshot</span>
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

      <template v-else>
        <div class="housing-exp__snapshot-grid">
          <div class="snap-metric snap-metric--primary">
            <span class="snap-metric__label"><span class="mdi mdi-weather-hazy snap-metric__icon"></span>Air Quality</span>
            <span class="snap-metric__value">{{ airQuality?.aqiCategory ?? '—' }}</span>
          </div>
          <div class="snap-metric snap-metric--primary">
            <span class="snap-metric__label"><span class="mdi mdi-silverware-fork-knife snap-metric__icon"></span>Restaurants /10k</span>
            <span class="snap-metric__value">{{ lifestyle?.restaurants?.perTenThousandResidents != null ? lifestyle.restaurants.perTenThousandResidents.toFixed(1) : '—' }}</span>
          </div>
          <div class="snap-metric snap-metric--primary">
            <span class="snap-metric__label"><span class="mdi mdi-palette-outline snap-metric__icon"></span>Arts &amp; Culture /10k</span>
            <span class="snap-metric__value">{{ lifestyle?.artsAndCulture?.perTenThousandResidents != null ? lifestyle.artsAndCulture.perTenThousandResidents.toFixed(1) : '—' }}</span>
          </div>
          <div class="snap-metric snap-metric--secondary">
            <span class="snap-metric__label"><span class="mdi mdi-bus snap-metric__icon"></span>Transit Commuters</span>
            <span class="snap-metric__value">{{ transitSharePct != null ? transitSharePct + '%' : '—' }}</span>
          </div>
          <div class="snap-metric snap-metric--secondary">
            <span class="snap-metric__label"><span class="mdi mdi-home-outline snap-metric__icon"></span>Remote Work</span>
            <span class="snap-metric__value">{{ remoteSharePct != null ? remoteSharePct + '%' : '—' }}</span>
          </div>
          <div class="snap-metric snap-metric--secondary">
            <span class="snap-metric__label"><span class="mdi mdi-airplane snap-metric__icon"></span>Nearest Airport</span>
            <span class="snap-metric__value">{{ airport?.code ?? '—' }}</span>
          </div>
        </div>
      </template>
    </div>

    <!-- Loading skeleton for grid -->
    <div v-if="loading" class="housing-exp__grid" aria-hidden="true">
      <section class="data-card housing-exp__panel housing-exp__panel--compact">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-weather-hazy"></span>
          <span class="housing-exp__panel-title">Air Quality</span>
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
          <span class="data-card__icon mdi mdi-silverware-fork-knife"></span>
          <span class="housing-exp__panel-title">Dining &amp; Culture</span>
        </div>
        <div class="housing-exp__panel-metrics">
          <div v-for="i in 3" :key="i" class="metric skeleton-block">
            <span class="metric__label skeleton-line skeleton-line--label"></span>
            <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
          </div>
        </div>
      </section>
      <section class="data-card housing-exp__panel housing-exp__panel--wide">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-airplane"></span>
          <span class="housing-exp__panel-title">Getting Around</span>
        </div>
        <div class="housing-exp__panel-metrics">
          <div v-for="i in 3" :key="i" class="metric skeleton-block">
            <span class="metric__label skeleton-line skeleton-line--label"></span>
            <span class="metric__value skeleton-line skeleton-line--value-sm"></span>
          </div>
        </div>
      </section>
    </div>

    <!-- Data grid -->
    <div v-else class="housing-exp__grid">

      <!-- Air Quality -->
      <section class="data-card housing-exp__panel housing-exp__panel--compact">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-weather-hazy"></span>
          <span class="housing-exp__panel-title">Air Quality</span>
        </div>
        <div v-if="airQuality" class="housing-exp__panel-metrics">
          <div class="metric">
            <span class="metric__label">Median AQI</span>
            <span class="metric__value">{{ airQuality.medianAqi ?? '—' }}</span>
          </div>
          <div class="metric">
            <span class="metric__label">Good Days</span>
            <span class="metric__value">{{ airQuality.goodDaysPercent != null ? Math.round(airQuality.goodDaysPercent) + '%' : '—' }}</span>
          </div>
          <div class="metric">
            <span class="metric__label">Unhealthy Days</span>
            <span class="metric__value" :class="airQuality.unhealthyDaysPercent > 5 ? 'status-warning' : ''">
              {{ airQuality.unhealthyDaysPercent != null ? Math.round(airQuality.unhealthyDaysPercent) + '%' : '—' }}
            </span>
          </div>
        </div>
        <p v-else class="muted">No EPA monitoring station data available for this county.</p>
        <p v-if="airQuality" class="muted housing-exp__note">Source: EPA Air Quality System, {{ airQuality.year ?? '—' }}.</p>
      </section>

      <!-- Dining & Culture -->
      <section class="data-card housing-exp__panel housing-exp__panel--compact">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-silverware-fork-knife"></span>
          <span class="housing-exp__panel-title">Dining &amp; Culture</span>
        </div>
        <div class="housing-exp__panel-metrics">
          <div class="metric">
            <span class="metric__label">Restaurants /10k</span>
            <span class="metric__value">{{ lifestyle?.restaurants?.perTenThousandResidents != null ? lifestyle.restaurants.perTenThousandResidents.toFixed(1) : '—' }}</span>
          </div>
          <div class="metric">
            <span class="metric__label">Bars /10k</span>
            <span class="metric__value">{{ lifestyle?.bars?.perTenThousandResidents != null ? lifestyle.bars.perTenThousandResidents.toFixed(1) : '—' }}</span>
          </div>
          <div class="metric">
            <span class="metric__label">Arts &amp; Culture /10k</span>
            <span class="metric__value">{{ lifestyle?.artsAndCulture?.perTenThousandResidents != null ? lifestyle.artsAndCulture.perTenThousandResidents.toFixed(1) : '—' }}</span>
          </div>
        </div>
        <p class="muted housing-exp__note">County-level. Source: Census County Business Patterns.</p>
      </section>

      <!-- Getting Around -->
      <section class="data-card housing-exp__panel housing-exp__panel--wide">
        <div class="housing-exp__panel-head">
          <span class="data-card__icon mdi mdi-airplane"></span>
          <span class="housing-exp__panel-title">Getting Around</span>
        </div>

        <div class="housing-exp__panel-metrics">
          <div class="metric">
            <span class="metric__label">Public Transit Commuters</span>
            <span class="metric__value">{{ transitSharePct != null ? transitSharePct + '%' : '—' }}</span>
          </div>
          <div class="metric">
            <span class="metric__label">Remote Work</span>
            <span class="metric__value">{{ remoteSharePct != null ? remoteSharePct + '%' : '—' }}</span>
          </div>
          <div class="metric" v-if="airportDistance != null">
            <span class="metric__label">Nearest Airport Distance</span>
            <span class="metric__value">{{ Math.round(airportDistance) }} mi</span>
          </div>
        </div>

        <div v-if="airport" class="city-exp__airport" style="margin-top: 14px;">
          <div class="city-exp__airport-row">
            <span class="mdi mdi-airplane city-exp__airport-icon"></span>
            <div class="city-exp__airport-info">
              <span class="city-exp__airport-code">{{ airport.code }}</span>
              <span class="city-exp__airport-name">{{ airport.name }}</span>
            </div>
          </div>
          <div v-if="airportBusyness?.hubAirlines?.length" class="city-exp__airline-tags">
            <span
              v-for="airline in airportBusyness.hubAirlines"
              :key="airline"
              class="city-exp__airline-tag"
              :style="airlineStyle(airline)"
              @mouseenter="e => showTooltip(e, airline)"
              @mouseleave="hideTooltip"
            >{{ airline.trim() }}</span>
          </div>
          <Teleport to="body">
            <div v-if="tooltipState" class="city-exp__airline-tooltip" :style="tooltipFixedStyle">
              {{ tooltipState.text }}
            </div>
          </Teleport>
          <div v-if="airportBusyness" class="city-exp__busy">
            <div class="city-exp__busy-header">
              <span class="city-exp__busy-label">Traffic</span>
              <span class="city-exp__busy-tag">{{ airportBusyness.hubLabel }}</span>
            </div>
            <div class="city-exp__busy-track">
              <div
                v-for="i in 5" :key="i"
                class="city-exp__busy-pip"
                :class="{ 'city-exp__busy-pip--active': i <= airportBusyness.busyScale }"
              ></div>
            </div>
            <span class="city-exp__busy-sub">{{ (airportBusyness.annualEnplanements / 1_000_000).toFixed(1) }}M passengers/yr · busier than {{ airportBusyness.nationalPercentile }}% of tracked airports</span>
          </div>
        </div>
        <p v-else class="muted housing-exp__note">No major commercial airport tracked for this area.</p>
      </section>

    </div>
  </div>
</template>
