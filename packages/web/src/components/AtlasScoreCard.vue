<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import CountUp from 'vue-countup-v3';
import { fetchDetailedCityProfile } from '../api/cityProfile';
import { fetchDetailedQualityOfLife } from '../api/qualityOfLife';
import { fetchDetailedIncome } from '../api/income';
import { fetchAffordability } from '../api/affordability';
import { fetchDetailedHousing } from '../api/housing';
import { fetchClimate } from '../api/climate';
import { fetchAirQuality } from '../api/airQuality';
import { fetchLifestyle } from '../api/lifestyle';
import { fetchPoliticalLean } from '../api/politicalLean';
import { fetchCostOfLiving } from '../api/costOfLiving';
import { useAuth } from '../composables/useAuth';
import { usePreferences } from '../composables/usePreferences';
import { computeAtlasScore, scoreTier, politicalDimTier, evaluateOpportunityMatch } from '../lib/atlasScore';
import { DIMS, PREF_LABELS } from '../lib/atlasScoreDims';

const props = defineProps<{ city: string; state: string }>();

const { user, loading: authLoading } = useAuth();
const { preferences, fetchPreferences } = usePreferences();

// Wait for auth to finish restoring the session before treating `user.value === null` as
// "not logged in" — on a fresh page load it starts null while the Supabase session is still
// being read from storage, and firing fetchPreferences() on that transient null permanently
// locks preferences to defaults before the real session (and real user) ever resolves.
watch([user, authLoading], ([, isAuthLoading]) => {
  if (!isAuthLoading) fetchPreferences();
}, { immediate: true });

const profile        = ref<any>(null);
const qol            = ref<any>(null);
const income         = ref<any>(null);
const affordability  = ref<any>(null);
const housing        = ref<any>(null);
const climate        = ref<any>(null);
const airQuality     = ref<any>(null);
const lifestyle      = ref<any>(null);
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
  airQuality.value    = null;
  lifestyle.value     = null;
  politicalLean.value = null;
  costOfLiving.value  = null;

  function timed<T>(p: Promise<T>): Promise<T> {
    return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), 12_000))]);
  }

  try {
    const results = await Promise.allSettled([
      timed(fetchDetailedCityProfile(props.state, props.city)),
      timed(fetchDetailedQualityOfLife(props.state, props.city)),
      timed(fetchDetailedIncome(props.state, props.city)),
      timed(fetchAffordability(props.state, props.city)),
      timed(fetchDetailedHousing(props.state, props.city)),
      timed(fetchClimate(props.state, props.city)),
      timed(fetchAirQuality(props.state, props.city)),
      timed(fetchLifestyle(props.state, props.city)),
      timed(fetchPoliticalLean(props.state, props.city)),
      timed(fetchCostOfLiving(props.state, props.city)),
    ]);

    const vals = results.map(r => r.status === 'fulfilled' ? r.value : null);
    [
      profile.value,
      qol.value,
      income.value,
      affordability.value,
      housing.value,
      climate.value,
      airQuality.value,
      lifestyle.value,
      politicalLean.value,
      costOfLiving.value,
    ] = vals;
  } finally {
    loading.value = false;
  }
}

watch(() => [props.city, props.state], load, { immediate: true });

const result = computed(() => {
  // Always read both so Vue tracks them as reactive deps (avoids race with auth/prefs loading)
  const currentUser = user.value;
  const prefs = preferences.value;
  if (!income.value && !affordability.value && !profile.value && !qol.value) return null;
  return computeAtlasScore({
    income:         income.value,
    affordability:  affordability.value,
    costOfLiving:   costOfLiving.value,
    profile:        profile.value,
    qol:            qol.value,
    climate:        climate.value,
    airQuality:     airQuality.value,
    lifestyle:      lifestyle.value,
    politicalLean:  politicalLean.value,
    housing:        housing.value,
  }, currentUser ? prefs : null);
});

const tier = computed(() => result.value ? scoreTier(result.value.score) : null);
const isPlaceLevelPoliticalLean = computed(() => politicalLean.value?.source?.geographyLevel === 'place');
// A county aggregate that isn't already a landslide (Swing, Lean, or plain [Party]) is the
// risky case — those margins are the ones that can plausibly flip at the city level (see
// Oxford Township). Once a county reads "Strong [Party]" (|margin| >= 20), that's unlikely to
// flip for any city inside it, so it's safe to show the real match color instead of hedging.
const isStrongCountyLean = computed(() => politicalLean.value?.lean === 'Strong Democrat' || politicalLean.value?.lean === 'Strong Republican');
const showRealPoliticalTier = computed(() => isPlaceLevelPoliticalLean.value || isStrongCountyLean.value);
const politicalTier = computed(() => politicalDimTier(politicalLean.value, preferences.value.political_lean_preference));
const opportunityMatch = computed(() => evaluateOpportunityMatch(preferences.value.opportunity_preference, income.value));

function dimTier(value: number | null | undefined): 'good' | 'average' | 'below' | null {
  if (value == null) return null;
  if (value >= 65) return 'good';
  if (value >= 45) return 'average';
  return 'below';
}

function dimTierLabel(value: number | null | undefined): string {
  const t = dimTier(value);
  if (t === 'good')    return 'Good';
  if (t === 'average') return 'Average';
  if (t === 'below')   return 'Weak';
  return '—';
}


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

    <!-- Loaded state -->
    <div v-if="result" class="atlas-card__body">
      <!-- Left: score number + tier + narrative -->
      <div class="atlas-card__left">
        <div class="atlas-card__score-wrap" :data-tier="tier?.tier">
          <CountUp class="atlas-card__score-number" :end-val="result.score" :duration="1.2" />
          <span class="atlas-card__score-tier">{{ tier?.label }}</span>
        </div>
        <p v-if="narrative" class="atlas-card__narrative">{{ narrative }}</p>
      </div>

      <!-- Right: city cubes -->
      <div class="atlas-card__cubes">
        <div
          v-for="dim in DIMS"
          :key="dim.key"
          class="atlas-card__cube"
          :class="result.isPersonalized ? `atlas-card__cube--${dim.key === 'opportunity' && opportunityMatch ? opportunityMatch.tier : dimTier(result.breakdown[dim.key])}` : ''"
        >
          <div class="atlas-card__cube-header">
            <span :class="`mdi ${dim.icon} atlas-card__cube-icon`"></span>
            <span
              v-if="result.isPersonalized"
              class="atlas-card__cube-dot"
              :class="`atlas-card__cube-dot--${dim.key === 'opportunity' && opportunityMatch ? opportunityMatch.tier : dimTier(result.breakdown[dim.key])}`"
            ></span>
          </div>
          <div class="atlas-card__cube-category">{{ dim.label }}</div>
          <!-- Opportunity's headline shows the user's OWN preference label, not the raw Census
               sector name that actually matched — several preferences (nonprofit, government
               services) alias onto a shared generic bucket like "Local Services", which reads as
               a disconnected, unrelated label next to a rank badge if shown verbatim. Showing
               what they picked instead of what the data literally calls it keeps the headline
               tied to their selection; the rank badge still reflects wherever that raw sector
               actually landed among the city's industries. -->
          <div v-if="dim.key === 'opportunity' && result.isPersonalized && opportunityMatch?.matchedLabel" class="atlas-card__cube-char atlas-card__cube-char--with-badge">
            <span class="atlas-card__cube-char-text">{{ PREF_LABELS[preferences.opportunity_preference] ?? opportunityMatch.matchedLabel }}</span>
            <span class="atlas-card__rank-badge">#{{ opportunityMatch.matchedRank }}</span>
          </div>
          <div v-else class="atlas-card__cube-char">{{ result.cityChars[dim.charKey] ?? '—' }}</div>
          <!-- Opportunity gets one second-line slot, not two: when there's a real match, the
               headline already shows the matched industry (which is just the user's own stated
               preference, restated), so "You: X" there is pure duplication — swap it for the
               city's #1 industry instead of stacking a third line and inflating every cube in
               the row (cubes share a grid row height). Falls back to the normal "You:" line
               whenever there's nothing useful to swap in (rank in the top 3, or no match at all). -->
          <div v-if="dim.key === 'opportunity' && result.isPersonalized && opportunityMatch?.cityTopLabel" class="atlas-card__cube-pref">
            City's #1: {{ opportunityMatch.cityTopLabel }}
          </div>
          <div v-else-if="result.isPersonalized && dim.prefKey" class="atlas-card__cube-pref">
            You: {{ PREF_LABELS[(preferences as any)[dim.prefKey!]] ?? '—' }}
          </div>
        </div>
        <!-- Political lean cube: a county-level result that ISN'T already a landslide is forced
             to 'below' (amber/caution) regardless of match score, since a county aggregate is a
             poor proxy for a specific city and a close county margin is exactly the kind that
             can flip city-to-city (see Oxford Township). A county already at "Strong [Party]"
             is treated the same as a real place-level override — it uses politicalTier, a
             categorical Swing/Lean/[Party]/Strong-aware tier (see politicalDimTier in
             atlasScore.ts) so a city already labeled "Strong [opposite party]" always reads
             as a clear 'poor' (red) mismatch, not a middling one. -->
        <div
          v-if="result.isPersonalized && preferences.political_lean_preference !== 'not_a_factor'"
          class="atlas-card__cube"
          :class="showRealPoliticalTier ? `atlas-card__cube--${politicalTier}` : 'atlas-card__cube--below'"
        >
          <div class="atlas-card__cube-header">
            <span class="mdi mdi-vote-outline atlas-card__cube-icon"></span>
            <span
              class="atlas-card__cube-dot"
              :class="showRealPoliticalTier ? `atlas-card__cube-dot--${politicalTier}` : 'atlas-card__cube-dot--below'"
            ></span>
          </div>
          <div class="atlas-card__cube-category">
            {{ isPlaceLevelPoliticalLean ? 'Political Lean' : 'County Political Lean' }}
          </div>
          <div class="atlas-card__cube-char">{{ result.cityChars.politicalLean ?? '—' }}</div>
          <div class="atlas-card__cube-pref">You: {{ PREF_LABELS[preferences.political_lean_preference] ?? '—' }}</div>
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
      <div class="atlas-card__cubes">
        <div v-for="i in 8" :key="i" class="atlas-card__cube">
          <div class="skeleton-line" style="width:22px;height:22px;border-radius:5px;margin-bottom:6px"></div>
          <div class="skeleton-line" style="width:55px;height:9px;border-radius:3px;margin-bottom:5px"></div>
          <div class="skeleton-line" style="width:90px;height:12px;border-radius:3px"></div>
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

/* Header */
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
  font-size: 4.5rem;
  font-weight: 800;
  letter-spacing: -0.05em;
  line-height: 1;
}

.atlas-card__score-number :deep(.countup-wrap) {
  display: inline;
}

.atlas-card__score-tier {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

[data-tier="excellent"] .atlas-card__score-number,
[data-tier="excellent"] .atlas-card__score-tier { color: var(--positive); }
[data-tier="good"]      .atlas-card__score-number,
[data-tier="good"]      .atlas-card__score-tier { color: var(--positive); }
[data-tier="average"]   .atlas-card__score-number,
[data-tier="average"]   .atlas-card__score-tier { color: var(--caution); }
[data-tier="below"]     .atlas-card__score-number,
[data-tier="below"]     .atlas-card__score-tier { color: var(--warning); }
[data-tier="poor"]      .atlas-card__score-number,
[data-tier="poor"]      .atlas-card__score-tier { color: var(--danger); }

.atlas-card__narrative {
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.5;
  max-width: 160px;
}


/* Right: city cubes */
.atlas-card__cubes {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  align-content: start;
  padding: 4px 0;
}

.atlas-card__cube {
  display: flex;
  flex-direction: column;
  padding: 11px 12px 10px;
  border-radius: 12px;
  background: var(--bg-card-inner);
  border: 1px solid var(--border-card);
  overflow: hidden;
  transition: border-color 0.15s;
}

.atlas-card__cube--good    { border-color: color-mix(in srgb, var(--positive) 35%, var(--border-card)); }
.atlas-card__cube--average { border-color: color-mix(in srgb, var(--caution) 30%, var(--border-card)); }
.atlas-card__cube--below   { border-color: color-mix(in srgb, var(--warning) 35%, var(--border-card)); }
.atlas-card__cube--poor    { border-color: color-mix(in srgb, var(--danger) 35%, var(--border-card)); }

.atlas-card__cube-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 6px;
}

.atlas-card__cube-icon {
  font-size: 1.05rem;
  color: var(--accent);
}

.atlas-card__cube-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 2px;
  background: color-mix(in srgb, var(--border-color) 60%, transparent);
}

.atlas-card__cube-dot--good    { background: var(--positive); }
.atlas-card__cube-dot--average { background: var(--caution); }
.atlas-card__cube-dot--below   { background: var(--warning); }
.atlas-card__cube-dot--poor    { background: var(--danger); }

.atlas-card__cube-category {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  margin-bottom: 3px;
}

.atlas-card__cube-char {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.25;
  /* No headline value should ever grow the cube — cubes share a grid row height, so one long
     label (any dimension, not just Opportunity) would stretch every cube in that row. Truncate
     instead of wrapping. */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.atlas-card__cube-char--with-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  /* overrides the base rule above — ellipsis has to live on the text child, not this flex
     container, and the container needs its own min-width:0 so the child is actually allowed
     to shrink below its natural content width instead of overflowing. */
  min-width: 0;
}

.atlas-card__cube-char-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.atlas-card__rank-badge {
  display: inline-block;
  flex-shrink: 0;
  padding: 1px 5px;
  border-radius: 6px;
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  vertical-align: middle;
}

.atlas-card__cube-pref {
  font-size: 0.65rem;
  color: var(--text-muted);
  margin-top: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 700px) {
  .atlas-card__cubes {
    grid-template-columns: repeat(2, 1fr);
  }
}

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
