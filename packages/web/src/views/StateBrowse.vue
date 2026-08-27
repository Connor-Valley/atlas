<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import DashboardHeader from '../components/DashboardHeader.vue';
import { useRecentSearches } from '../composables/useRecentSearches';
import { getStates, getCitiesForState, type StateOption } from '../api/states';
import { useAuth } from '../composables/useAuth';
import { usePreferences, hasRealPreferences } from '../composables/usePreferences';
import { useFavorites } from '../composables/useFavorites';
import { computeTopCitiesForState, type TopCityResult } from '../lib/topCities';

const props = defineProps<{ code: string }>();

const router = useRouter();
const { recordRecentSearch } = useRecentSearches();

function onHeaderSearch(payload: { city: string; state: string }) {
  void recordRecentSearch(payload.city, payload.state);
  goToCity(payload.city, payload.state);
}

function goToCity(city: string, state: string) {
  void recordRecentSearch(city, state);
  router.push({ name: 'city', params: { state, city } });
}

const stateCode = computed(() => props.code.toUpperCase());
const states = ref<StateOption[]>([]);
const stateName = computed(() => states.value.find(s => s.code.toUpperCase() === stateCode.value)?.name ?? stateCode.value);

interface CityRow { name: string; slug: string; population: number; }
const cities = ref<CityRow[]>([]);
const loading = ref(true);
const loadError = ref(false);
const query = ref('');

const POPULAR_COUNT = 10;
const SKELETON_CHIP_WIDTHS = [110, 150, 95, 135, 105, 120, 90, 130, 100, 115];
const SKELETON_ROW_COUNT = 24;

// Module-level so cities already fetched this session render instantly on revisit.
const cityCache = new Map<string, CityRow[]>();

const popularCities = computed(() => cities.value.slice(0, POPULAR_COUNT));

const filteredCities = computed(() => {
  if (!query.value.trim()) return cities.value;
  const q = query.value.trim().toLowerCase();
  return cities.value.filter(c => c.name.toLowerCase().includes(q));
});

async function load() {
  const cached = cityCache.get(stateCode.value);
  if (cached) {
    cities.value = cached;
    loading.value = false;
    loadError.value = false;
    return;
  }

  loading.value = true;
  loadError.value = false;
  try {
    const result = await getCitiesForState(stateCode.value);
    cities.value = result;
    cityCache.set(stateCode.value, result);
  } catch {
    cities.value = [];
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  try {
    states.value = await getStates();
  } catch {
    states.value = [];
  }
});

watch(stateCode, load, { immediate: true });

// ── Your Top Cities (in this state) ─────────────────────────────────────────
const { user, loading: authLoading } = useAuth();
const { preferences, fetchPreferences } = usePreferences();
const { isFavorited, fetchFavorites } = useFavorites();

watch([user, authLoading], ([, isAuthLoading]) => {
  if (!isAuthLoading) {
    fetchPreferences();
    fetchFavorites();
  }
}, { immediate: true });

const topCities = ref<TopCityResult[] | null>(null);
const topCitiesLoading = ref(false);
const topCitiesProgress = ref({ done: 0, total: 0 });
const topCitiesError = ref<string | null>(null);

// Persisted per user+state so revisiting a state you've already scored shows the ranking
// immediately — no need to hit "Find my top cities" again. "Refresh" recomputes and overwrites it.
// The version tag lets a scoring-logic change (e.g. the population-floor / data-reliability
// fixes) invalidate anything cached under the old logic — bump it whenever computeAtlasScore's
// scoring or eligibility rules change, so stale results don't silently linger forever.
const TOP_CITIES_CACHE_VERSION = 'v2';
function topCitiesStorageKey(): string | null {
  if (!user.value) return null;
  return `atlas-top-cities:${TOP_CITIES_CACHE_VERSION}:${user.value.id}:${stateCode.value}`;
}

function loadCachedTopCities() {
  const key = topCitiesStorageKey();
  if (!key) { topCities.value = null; return; }
  try {
    const raw = localStorage.getItem(key);
    topCities.value = raw ? JSON.parse(raw) : null;
  } catch {
    topCities.value = null;
  }
}

watch(stateCode, () => {
  topCitiesError.value = null;
  loadCachedTopCities();
});

watch(user, loadCachedTopCities, { immediate: true });

async function loadTopCities() {
  if (!hasRealPreferences(preferences.value) || topCitiesLoading.value) return;
  topCitiesLoading.value = true;
  topCitiesError.value = null;
  topCitiesProgress.value = { done: 0, total: 0 };
  try {
    const result = await computeTopCitiesForState(stateCode.value, preferences.value, (done, total) => {
      topCitiesProgress.value = { done, total };
    });
    topCities.value = result;
    const key = topCitiesStorageKey();
    if (key) {
      try {
        localStorage.setItem(key, JSON.stringify(result));
      } catch {
        // Storage full or unavailable (private browsing) — the ranking still shows for this
        // visit, it just won't be there automatically next time.
      }
    }
  } catch {
    topCitiesError.value = 'Unable to score cities right now. Try again later.';
  } finally {
    topCitiesLoading.value = false;
  }
}
</script>

<template>
  <div class="state-page">
    <div class="container container--header-only">
      <DashboardHeader :page-label="stateName" @logo-click="router.push({ name: 'search' })" @search="onHeaderSearch" />
    </div>

    <div class="container state-page__body">
      <div class="state-page__heading">
        <h1 class="state-page__title">{{ stateName }}</h1>
        <button class="breadcrumb" @click="router.push({ name: 'search' })">
          <span class="breadcrumb__arr breadcrumb__arr--1 mdi mdi-arrow-left"></span>
          <span class="breadcrumb__text">Back to Search</span>
          <span class="breadcrumb__arr breadcrumb__arr--2 mdi mdi-arrow-left"></span>
          <span class="breadcrumb__circle"></span>
        </button>
      </div>

      <div v-if="loadError" class="state-page__status">Couldn't load cities for {{ stateName }}.</div>

      <template v-else>
        <section v-if="user" class="state-page__panel data-card">
          <div class="state-page__panel-header">
            <span class="state-page__panel-label">
              <span class="mdi mdi-map-marker-star-outline state-page__panel-icon"></span>
              Your Top Cities in {{ stateName }}
            </span>
            <span v-if="topCities && topCities.length" class="state-page__panel-label">Your Score</span>
          </div>

          <p v-if="!hasRealPreferences(preferences)" class="state-page__empty">
            Set your preferences on your profile to see your top-matching cities here.
          </p>

          <div v-else-if="topCitiesLoading" class="state-page__top-cities-loading">
            <span class="mdi mdi-loading state-page__spinner"></span>
            <span>Scoring cities… {{ topCitiesProgress.done }}/{{ topCitiesProgress.total || '…' }}</span>
          </div>

          <p v-else-if="topCitiesError" class="state-page__empty">{{ topCitiesError }}</p>

          <div v-else-if="topCities && topCities.length" class="state-page__list state-page__list--ranked">
            <button
              v-for="(city, i) in topCities"
              :key="`${city.state}-${city.city}`"
              class="state-page__row state-page__row--ranked"
              @click="goToCity(city.city, city.state)"
            >
              <span class="state-page__row-rank">#{{ i + 1 }}</span>
              <span class="state-page__row-name">{{ city.cityName }}</span>
              <span v-if="isFavorited(city.city, city.state)" class="mdi mdi-star state-page__row-star"></span>
              <span class="state-page__row-score">{{ Math.round(city.score) }}</span>
            </button>
          </div>

          <p v-else class="state-page__empty">No ranking yet — find your top-matching cities in {{ stateName }}.</p>

          <div v-if="hasRealPreferences(preferences) && !topCitiesLoading" class="state-page__top-cities-btn-row">
            <button class="state-page__top-cities-btn" @click="loadTopCities">
              <span class="mdi mdi-map-marker-star-outline"></span>
              {{ topCities ? 'Refresh my top cities' : 'Find my top cities' }}
            </button>
          </div>
        </section>

        <section class="state-page__panel data-card">
          <div class="state-page__panel-header">
            <span class="state-page__panel-label">
              <span class="mdi mdi-fire state-page__panel-icon"></span>
              Popular Cities
            </span>
          </div>
          <div v-if="loading" class="state-page__chip-row" aria-hidden="true">
            <span
              v-for="(w, i) in SKELETON_CHIP_WIDTHS"
              :key="i"
              class="state-page__chip-skeleton skeleton-line"
              :style="{ width: `${w}px` }"
            ></span>
          </div>
          <div v-else class="state-page__chip-row">
            <button
              v-for="c in popularCities"
              :key="c.slug"
              class="state-page__chip"
              @click="goToCity(c.slug, stateCode)"
            >
              <span class="state-page__chip-name">{{ c.name }}</span>
              <span class="state-page__chip-meta">{{ c.population.toLocaleString() }}</span>
            </button>
          </div>
        </section>

        <section class="state-page__panel data-card">
          <div class="state-page__panel-header">
            <span class="state-page__panel-label">
              <span class="mdi mdi-format-list-bulleted state-page__panel-icon"></span>
              All Cities
              <span v-if="!loading" class="state-page__panel-count">({{ cities.length }})</span>
            </span>
            <input
              v-model="query"
              class="state-page__filter"
              type="text"
              placeholder="Filter cities…"
              :disabled="loading"
            />
          </div>

          <div v-if="loading" class="state-page__list" aria-hidden="true">
            <span
              v-for="i in SKELETON_ROW_COUNT"
              :key="i"
              class="state-page__row-skeleton skeleton-line"
            ></span>
          </div>
          <div v-else-if="filteredCities.length === 0" class="state-page__empty">
            No cities match "{{ query }}"
          </div>
          <div v-else class="state-page__list">
            <button
              v-for="c in filteredCities"
              :key="c.slug"
              class="state-page__row"
              @click="goToCity(c.slug, stateCode)"
            >
              <span class="state-page__row-name">{{ c.name }}</span>
              <span class="state-page__row-pop">{{ c.population.toLocaleString() }}</span>
            </button>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.state-page {
  min-height: 100vh;
  background: var(--bg-page);
  padding: 0 0 60px;
}

:deep(.dashboard-hdr) {
  margin-bottom: 0;
}

.state-page__body {
  max-width: 1320px;
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.state-page__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.state-page__title {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  margin: 0;
}

.state-page__status {
  padding: 40px 0;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.state-page__panel {
  position: relative;
  min-height: 0;
  padding: 22px 24px;
}

.state-page__panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.state-page__panel-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.state-page__panel-icon {
  color: var(--accent);
  font-size: 0.95rem;
}

.state-page__panel-count {
  color: var(--text-muted);
  font-weight: 500;
  text-transform: none;
  letter-spacing: normal;
}

.state-page__filter {
  width: 220px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-card);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.state-page__filter:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
}

.state-page__chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.state-page__chip-skeleton {
  height: 37px;
  border-radius: 100px;
  background-color: var(--bg-card-inner);
}

.state-page__row-skeleton {
  height: 39px;
  border-radius: 8px;
  background-color: var(--bg-card);
  border: 1px solid var(--border-card);
}

.state-page__chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  background: var(--bg-card-inner);
  border: 1px solid transparent;
  border-radius: 100px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.state-page__chip:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  background: var(--bg-input);
}

.state-page__chip-meta {
  color: var(--text-muted);
  font-weight: 500;
  font-size: 0.78rem;
}

.state-page__empty {
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.state-page__list {
  max-height: 480px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px 10px;
  padding-right: 4px;
  scrollbar-width: thin;
}

.state-page__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--border-card);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 0.84rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}

.state-page__row:hover {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
  color: var(--text-primary);
}

.state-page__row-pop {
  color: var(--text-muted);
  font-weight: 500;
  font-size: 0.76rem;
  white-space: nowrap;
}

/* ── Your Top Cities ── */
.state-page__list--ranked {
  grid-template-columns: repeat(2, 1fr);
  /* Column-major fill (1–5 down the first column, 6–10 down the second) instead of the grid's
     default row-major order (1,2 / 3,4 / ...) — matches how the ranking actually reads. */
  grid-auto-flow: column;
  grid-template-rows: repeat(5, auto);
  max-height: none;
}

@media (max-width: 720px) {
  .state-page__list--ranked {
    grid-template-columns: 1fr;
    grid-auto-flow: row;
    grid-template-rows: none;
  }
}

.state-page__row--ranked {
  justify-content: flex-start;
}

.state-page__row-rank {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  flex-shrink: 0;
}

.state-page__row-star {
  color: var(--accent);
  font-size: 0.85rem;
  flex-shrink: 0;
}

.state-page__row-score {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  flex-shrink: 0;
}

.state-page__top-cities-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--text-muted);
  padding: 10px 0;
}

.state-page__spinner {
  animation: state-page-spin 1s linear infinite;
}

@keyframes state-page-spin {
  to { transform: rotate(360deg); }
}

.state-page__top-cities-btn-row {
  margin-top: 14px;
  display: flex;
  justify-content: center;
}

.state-page__top-cities-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.state-page__top-cities-btn:hover {
  background: color-mix(in srgb, var(--accent) 20%, transparent);
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
}

@media (max-width: 720px) {
  .state-page__list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .state-page__panel {
    padding: 18px;
  }

  .state-page__panel-header {
    flex-wrap: wrap;
  }

  .state-page__filter {
    width: 100%;
  }
}
</style>
