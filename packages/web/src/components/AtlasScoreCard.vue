<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { fetchDetailedCityProfile } from '../api/cityProfile';
import { fetchDetailedQualityOfLife } from '../api/qualityOfLife';
import { fetchDetailedIncome } from '../api/income';
import { fetchAffordability } from '../api/affordability';
import { fetchDetailedHousing } from '../api/housing';
import { fetchClimate } from '../api/climate';
import { fetchLifestyle } from '../api/lifestyle';
import { fetchEducation } from '../api/education';
import { fetchPoliticalLean } from '../api/politicalLean';
import { fetchCostOfLiving } from '../api/costOfLiving';
import { useAuth } from '../composables/useAuth';
import { usePreferences } from '../composables/usePreferences';
import { computeAtlasScore, scoreTier, type DimensionScores } from '../lib/atlasScore';

const props = defineProps<{ city: string; state: string }>();

const { user } = useAuth();
const { preferences, loaded: prefsLoaded, fetchPreferences } = usePreferences();

watch(() => user.value, () => fetchPreferences(), { immediate: true });

const profile        = ref<any>(null);
const qol            = ref<any>(null);
const income         = ref<any>(null);
const affordability  = ref<any>(null);
const housing        = ref<any>(null);
const climate        = ref<any>(null);
const lifestyle      = ref<any>(null);
const education      = ref<any>(null);
const politicalLean  = ref<any>(null);
const costOfLiving   = ref<any>(null);
const loading        = ref(false);

async function load() {
  if (!props.city || !props.state) return;
  loading.value       = true;
  profile.value       = null;
  qol.value           = null;
  income.value        = null;
  affordability.value = null;
  housing.value       = null;
  climate.value       = null;
  lifestyle.value     = null;
  education.value     = null;
  politicalLean.value = null;
  costOfLiving.value  = null;

  const results = await Promise.allSettled([
    fetchDetailedCityProfile(props.state, props.city),
    fetchDetailedQualityOfLife(props.state, props.city),
    fetchDetailedIncome(props.state, props.city),
    fetchAffordability(props.state, props.city),
    fetchDetailedHousing(props.state, props.city),
    fetchClimate(props.state, props.city),
    fetchLifestyle(props.state, props.city),
    fetchEducation(props.state, props.city),
    fetchPoliticalLean(props.state, props.city),
    fetchCostOfLiving(props.state, props.city),
  ]);

  const vals = results.map(r => r.status === 'fulfilled' ? r.value : null);
  [
    profile.value,
    qol.value,
    income.value,
    affordability.value,
    housing.value,
    climate.value,
    lifestyle.value,
    education.value,
    politicalLean.value,
    costOfLiving.value,
  ] = vals;

  loading.value = false;
}

watch(() => [props.city, props.state], load, { immediate: true });

const result = computed(() => {
  if (!income.value && !affordability.value && !profile.value && !qol.value) return null;
  const prefs = user.value && prefsLoaded.value ? preferences.value : null;
  return computeAtlasScore({
    income:         income.value,
    affordability:  affordability.value,
    costOfLiving:   costOfLiving.value,
    profile:        profile.value,
    qol:            qol.value,
    climate:        climate.value,
    lifestyle:      lifestyle.value,
    education:      education.value,
    politicalLean:  politicalLean.value,
    housing:        housing.value,
  }, prefs);
});

const tier = computed(() => result.value ? scoreTier(result.value.score) : null);

const DIMS: Array<{ key: keyof DimensionScores; label: string; tooltip: string }> = [
  { key: 'affordability',     label: 'Affordability',        tooltip: 'Housing costs, rent-to-income ratio, cost of living index, and rent growth trend.' },
  { key: 'jobMarket',         label: 'Job Market',           tooltip: 'Median household income, unemployment rate, 5-year employment growth, and industry diversity.' },
  { key: 'climate',           label: 'Climate',              tooltip: 'Weather desirability adjusted for your climate preference, plus natural hazard risk score.' },
  { key: 'opportunity',       label: 'Opportunity',          tooltip: "Bachelor's and graduate degree attainment rates, and poverty rate as a community health proxy." },
  { key: 'lifestyleVibrancy', label: 'Lifestyle & Vibrancy', tooltip: 'Restaurant, bar, and arts density per resident, plus commute times and remote work share.' },
  { key: 'safety',            label: 'Safety',               tooltip: 'Crime and safety metrics. Data coming soon.' },
  { key: 'connectivity',      label: 'Connectivity',         tooltip: 'Airport activity and proximity, and public transit usage share.' },
];

function dimTier(value: number | null): 'good' | 'average' | 'below' | null {
  if (value == null) return null;
  if (value >= 65) return 'good';
  if (value >= 45) return 'average';
  return 'below';
}

function dimTierLabel(value: number | null): string {
  const t = dimTier(value);
  if (t === 'good')    return 'Good';
  if (t === 'average') return 'Average';
  if (t === 'below')   return 'Weak';
  return '—';
}

const climatePrefLabel = computed(() => {
  const pref = preferences.value?.climate_preference;
  const map: Record<string, string> = {
    warm: 'warm climate',
    mild: 'mild climate',
    four_seasons: 'four seasons',
    cool: 'cool climate',
  };
  return pref && pref !== 'any' ? map[pref] : null;
});

const narrative = computed(() => {
  if (!result.value) return null;
  const { breakdown, score } = result.value;

  const scored = DIMS
    .map(d => ({ label: d.label, value: breakdown[d.key] }))
    .filter(d => d.value != null)
    .sort((a, b) => b.value! - a.value!);

  if (scored.length < 2) return null;

  const best  = scored[0];
  const worst = scored[scored.length - 1];
  const spread = best.value! - worst.value!;

  if (score >= 65) {
    if (spread > 20) return `${best.label} is a clear strength here. ${worst.label} is the main tradeoff.`;
    return `This city scores well across the board, with ${best.label.toLowerCase()} leading the way.`;
  }
  if (score >= 45) {
    if (spread > 25) return `${best.label} stands out positively, but ${worst.label.toLowerCase()} pulls the overall score down.`;
    return `A fairly balanced city — no major strengths or weaknesses stand out.`;
  }
  return `${worst.label} and ${scored[scored.length - 2].label.toLowerCase()} are significant weak spots holding this score back.`;
});
</script>

<template>
  <div class="data-card atlas-card">
    <div class="data-card__header atlas-card__header">
      <div class="data-card__title">
        <span class="mdi mdi-map-marker-star-outline data-card__icon"></span>
        <span class="data-card__name">Atlas Score</span>
      </div>
      <p v-if="result && !result.isPersonalized" class="atlas-card__prefs-nudge">
        <router-link to="/profile" class="atlas-card__prefs-link">
          <span class="mdi mdi-tune-variant"></span> Personalize
        </router-link>
      </p>
      <p v-else-if="result" class="atlas-card__prefs-personalized">
        <span class="mdi mdi-check-circle-outline"></span> Personalized
      </p>
    </div>

    <!-- Loaded state: two-column layout -->
    <div v-if="result" class="atlas-card__body">
      <div class="atlas-card__left">
        <div class="atlas-card__score-wrap" :data-tier="tier?.tier">
          <span class="atlas-card__score-number">{{ result.score }}</span>
          <span class="atlas-card__score-tier">{{ tier?.label }}</span>
        </div>
        <p v-if="narrative" class="atlas-card__narrative">{{ narrative }}</p>
        <p v-if="result.isPersonalized && climatePrefLabel" class="atlas-card__climate-hint">
          <span class="mdi mdi-weather-partly-cloudy"></span> Tuned for {{ climatePrefLabel }}
        </p>
      </div>

      <div class="atlas-card__bars">
        <div v-for="dim in DIMS" :key="dim.key" class="data-card__bar-row atlas-card__bar-row">
          <span class="atlas-card__dim-label">
            {{ dim.label }}
            <span class="atlas-card__info-wrap">
              <span class="mdi mdi-information-outline atlas-card__info-icon"></span>
              <span class="atlas-card__tooltip">{{ dim.tooltip }}</span>
            </span>
          </span>
          <div class="data-card__bar">
            <div
              class="data-card__bar-fill"
              :class="`atlas-card__fill--${dimTier(result.breakdown[dim.key])}`"
              :style="{ width: result.breakdown[dim.key] != null ? `${result.breakdown[dim.key]}%` : '0%' }"
            ></div>
          </div>
          <span class="atlas-card__dim-value" :class="`atlas-card__dim-value--${dimTier(result.breakdown[dim.key])}`">
            {{ dimTierLabel(result.breakdown[dim.key]) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-else-if="loading" class="atlas-card__body">
      <div class="atlas-card__left">
        <div class="skeleton-line" style="width:52px;height:44px;border-radius:6px;margin-bottom:10px"></div>
        <div class="skeleton-line" style="width:120px;height:12px;border-radius:4px;margin-bottom:6px"></div>
        <div class="skeleton-line" style="width:90px;height:12px;border-radius:4px"></div>
      </div>
      <div class="atlas-card__bars">
        <div v-for="i in 8" :key="i" class="data-card__bar-row atlas-card__bar-row">
          <span class="atlas-card__dim-label skeleton-line" style="width:80px;height:12px;border-radius:3px"></span>
          <div class="data-card__bar data-card__bar--placeholder">
            <div class="data-card__bar-fill data-card__bar-fill--placeholder" :style="{ width: `${30 + i * 8}%` }"></div>
          </div>
          <span class="skeleton-line" style="width:48px;height:12px;border-radius:3px"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.atlas-card {
  min-height: auto;
  overflow: visible;
}

/* Header row */
.atlas-card__header {
  padding-bottom: 0;
}

.atlas-card__prefs-nudge {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.atlas-card__prefs-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent);
  text-decoration: none;
  font-weight: 600;
}
.atlas-card__prefs-link:hover { text-decoration: underline; }

.atlas-card__prefs-personalized {
  font-size: 0.72rem;
  display: flex;
  align-items: center;
  gap: 4px;
  color: color-mix(in srgb, var(--accent) 65%, var(--text-muted));
}

/* Two-column body */
.atlas-card__body {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 28px;
  padding: 16px 20px 20px;
  align-items: center;
}

@media (max-width: 700px) {
  .atlas-card__body {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

/* Left: score + narrative */
.atlas-card__left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.atlas-card__score-wrap {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.atlas-card__score-number {
  font-size: 3.2rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
}

.atlas-card__score-tier {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

[data-tier="excellent"] .atlas-card__score-number,
[data-tier="excellent"] .atlas-card__score-tier { color: #4caf7d; }
[data-tier="good"]      .atlas-card__score-number,
[data-tier="good"]      .atlas-card__score-tier { color: #7bb54c; }
[data-tier="average"]   .atlas-card__score-number,
[data-tier="average"]   .atlas-card__score-tier { color: var(--accent); }
[data-tier="below"]     .atlas-card__score-number,
[data-tier="below"]     .atlas-card__score-tier { color: #d08c3a; }
[data-tier="poor"]      .atlas-card__score-number,
[data-tier="poor"]      .atlas-card__score-tier { color: #c0544a; }

.atlas-card__narrative {
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.5;
  max-width: 160px;
}

.atlas-card__climate-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: var(--text-muted);
  font-style: italic;
}

/* Right: bars */
.atlas-card__bars {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.atlas-card__bar-row {
  align-items: center;
  margin-left: 0;
  margin-right: 0;
}

.atlas-card__dim-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
  min-width: 130px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Bar fill colors */
.atlas-card__fill--good    { background: #4caf7d; }
.atlas-card__fill--average { background: var(--accent); }
.atlas-card__fill--below   { background: #d08c3a; }

/* Tier label */
.atlas-card__dim-value {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  min-width: 50px;
  text-align: right;
  flex-shrink: 0;
}

.atlas-card__dim-value--good    { color: #4caf7d; }
.atlas-card__dim-value--average { color: var(--accent); }
.atlas-card__dim-value--below   { color: #d08c3a; }

/* Tooltip */
.atlas-card__info-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.atlas-card__info-icon {
  color: var(--text-muted);
  font-size: 0.78rem;
  cursor: default;
  line-height: 1;
}

.atlas-card__tooltip {
  display: none;
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-card-inner);
  color: var(--text-secondary);
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.71rem;
  font-weight: 400;
  line-height: 1.5;
  white-space: normal;
  width: 220px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 100;
  pointer-events: none;
}

.atlas-card__info-wrap:hover .atlas-card__tooltip {
  display: block;
}
</style>
