<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import DashboardHeader from '../components/DashboardHeader.vue';
import CitySearch from '../components/CitySearch.vue';
import { useAuth } from '../composables/useAuth';
import { useRecentSearches } from '../composables/useRecentSearches';
import { useFavorites } from '../composables/useFavorites';
import { useComparisons } from '../composables/useComparisons';
import { getStates, type StateOption } from '../api/states';
import { fetchHousing } from '../api/housing';

const router = useRouter();
const { user } = useAuth();
const { recentSearches, loaded, fetchRecentSearches, recordRecentSearch, removeRecentSearch, clearRecentSearches } = useRecentSearches();
const { favorites, loaded: favLoaded, fetchFavorites } = useFavorites();
const { savedComparisons, loaded: comparisonsLoaded, fetchComparisons } = useComparisons();

watch(() => user.value?.id, () => {
  fetchRecentSearches();
  fetchFavorites();
  fetchComparisons();
}, { immediate: true });

function goToCity(city: string, state: string) {
  router.push({ name: 'city', params: { state, city } });
}

function onSearch(payload: { city: string; state: string }) {
  void recordRecentSearch(payload.city, payload.state);
  goToCity(payload.city, payload.state.toUpperCase());
}

function selectRecent(entry: { city: string; state: string }) {
  void recordRecentSearch(entry.city, entry.state);
  goToCity(entry.city, entry.state);
}

// ── Median rent per recent search, loaded lazily ─────────────────────────
const rentByCity = ref<Record<string, number | null>>({});

watch(recentSearches, (entries) => {
  for (const entry of entries) {
    const key = `${entry.state}:${entry.city}`;
    if (key in rentByCity.value) continue;
    rentByCity.value[key] = null;
    fetchHousing(entry.state, entry.city)
      .then(data => { rentByCity.value[key] = data?.housing?.medianRent ?? null; })
      .catch(() => { rentByCity.value[key] = null; });
  }
}, { immediate: true });

function rentFor(entry: { state: string; city: string }) {
  return rentByCity.value[`${entry.state}:${entry.city}`];
}

// ── Browse by state ───────────────────────────────────────────────────────
const states = ref<StateOption[]>([]);
const showAllStates = ref(false);
const INITIAL_STATE_COUNT = 14;
const visibleStates = computed(() => showAllStates.value ? states.value : states.value.slice(0, INITIAL_STATE_COUNT));

onMounted(async () => {
  try {
    states.value = await getStates();
  } catch {
    states.value = [];
  }
});

const heroRef = ref<HTMLElement | null>(null);
const browseStateCode = ref<string | undefined>(undefined);

function browseByState(code: string) {
  browseStateCode.value = code;
  heroRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<template>
  <div class="search-page">
    <div class="container container--header-only">
      <DashboardHeader page-label="Search" @logo-click="router.push({ name: 'search' })" @search="onSearch" />
    </div>

    <div class="container search-page__body">
      <div ref="heroRef" class="search-page__heading">
        <span class="search-page__heading-icon"><span class="mdi mdi-magnify"></span></span>
        <div class="search-page__search">
          <CitySearch :initial-state="browseStateCode" @search="onSearch" />
        </div>
        <button class="breadcrumb" @click="router.back()">
          <span class="breadcrumb__arr breadcrumb__arr--1 mdi mdi-arrow-left"></span>
          <span class="breadcrumb__text">Back</span>
          <span class="breadcrumb__arr breadcrumb__arr--2 mdi mdi-arrow-left"></span>
          <span class="breadcrumb__circle"></span>
        </button>
      </div>

      <section class="search-page__panel data-card">
        <div class="search-page__panel-header">
          <span class="search-page__panel-label">
            <span class="mdi mdi-history"></span>
            Recent Searches
          </span>
          <button
            v-if="recentSearches.length > 0"
            class="search-page__panel-action"
            @click="clearRecentSearches"
          >
            Clear all
          </button>
        </div>

        <div v-if="!user" class="search-page__empty">
          <span class="mdi mdi-account-lock-outline search-page__empty-icon"></span>
          <p class="search-page__empty-text">Sign in to keep track of cities you've looked up</p>
        </div>

        <div v-else-if="loaded && recentSearches.length === 0" class="search-page__empty">
          <span class="mdi mdi-map-search-outline search-page__empty-icon"></span>
          <p class="search-page__empty-text">Cities you search for will show up here</p>
        </div>

        <div v-else class="search-page__chip-row">
          <div
            v-for="entry in recentSearches"
            :key="entry.id"
            class="search-page__chip"
            @click="selectRecent(entry)"
          >
            <span class="mdi mdi-clock-outline search-page__chip-icon"></span>
            <span class="search-page__chip-name">{{ entry.city_name }}, {{ entry.state }}</span>
            <span v-if="rentFor(entry)" class="search-page__chip-meta">· ${{ rentFor(entry)!.toLocaleString() }}/mo</span>
            <button
              class="search-page__chip-remove"
              aria-label="Remove"
              @click.stop="removeRecentSearch(entry.id)"
            >
              <span class="mdi mdi-close"></span>
            </button>
          </div>
        </div>
      </section>

      <div class="search-page__split">
        <section class="search-page__panel data-card">
          <div class="search-page__panel-header">
            <span class="search-page__panel-label">
              <span class="mdi mdi-star search-page__panel-icon"></span>
              Saved Favorites
            </span>
          </div>

          <div v-if="!user" class="search-page__empty search-page__empty--compact">
            <p class="search-page__empty-text">Sign in to save favorite cities</p>
          </div>
          <div v-else-if="favLoaded && favorites.length === 0" class="search-page__empty search-page__empty--compact">
            <p class="search-page__empty-text">No favorites yet — star a city to save it here</p>
          </div>
          <template v-else>
            <button
              v-for="fav in favorites.slice(0, 3)"
              :key="fav.id"
              class="search-page__row"
              @click="goToCity(fav.city, fav.state)"
            >
              <span class="search-page__row-name">{{ fav.city_name }}, {{ fav.state }}</span>
            </button>
            <button class="search-page__panel-link" @click="router.push({ name: 'favorites' })">
              View all favorites <span class="mdi mdi-arrow-right"></span>
            </button>
          </template>
        </section>

        <section class="search-page__panel data-card">
          <div class="search-page__panel-header">
            <span class="search-page__panel-label">
              <span class="mdi mdi-swap-horizontal search-page__panel-icon"></span>
              Recent Comparisons
            </span>
          </div>

          <div v-if="!user" class="search-page__empty search-page__empty--compact">
            <p class="search-page__empty-text">Sign in to save comparisons</p>
          </div>
          <div v-else-if="comparisonsLoaded && savedComparisons.length === 0" class="search-page__empty search-page__empty--compact">
            <p class="search-page__empty-text">No saved comparisons yet</p>
          </div>
          <template v-else>
            <button
              v-for="cmp in savedComparisons.slice(0, 3)"
              :key="cmp.id"
              class="search-page__row"
              @click="router.push({ name: 'compare', params: { stateA: cmp.state_a, cityA: cmp.city_a, stateB: cmp.state_b, cityB: cmp.city_b } })"
            >
              <span class="search-page__row-name">{{ cmp.city_name_a }}, {{ cmp.state_a }}</span>
              <span class="search-page__row-vs">vs</span>
              <span class="search-page__row-name">{{ cmp.city_name_b }}, {{ cmp.state_b }}</span>
            </button>
          </template>
          <button class="search-page__panel-link" @click="router.push({ name: 'compare-empty' })">
            <span class="mdi mdi-plus"></span> New Comparison
          </button>
        </section>
      </div>

      <section class="search-page__panel data-card">
        <div class="search-page__panel-header">
          <span class="search-page__panel-label">Browse by State</span>
        </div>
        <div class="search-page__chip-row">
          <button
            v-for="s in visibleStates"
            :key="s.code"
            class="search-page__chip search-page__chip--plain"
            @click="browseByState(s.code)"
          >
            {{ s.name }}
          </button>
          <button
            v-if="!showAllStates && states.length > INITIAL_STATE_COUNT"
            class="search-page__chip search-page__chip--plain search-page__chip--muted"
            @click="showAllStates = true"
          >
            +{{ states.length - INITIAL_STATE_COUNT }} more states
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.search-page {
  min-height: 100vh;
  background: var(--bg-page);
  padding: 0 0 60px;
}

:deep(.site-header),
:deep(.dashboard-hdr) {
  margin-bottom: 0;
}

.search-page__body {
  max-width: 1320px;
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Page heading + search row ─────────────────────────── */
.search-page__heading {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 4px;
}

.search-page__heading-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  color: var(--accent);
  font-size: 1.1rem;
}

.search-page__heading .breadcrumb {
  height: 38px;
  padding-top: 0;
  padding-bottom: 0;
}

.search-page__search {
  flex: 1;
  min-width: 0;
  display: flex;
}

.search-page__search :deep(.search-bar) {
  flex: 1;
  height: 46px;
  margin-bottom: 0;
  padding: 4px 8px;
}

.search-page__search :deep(input) {
  height: 36px;
  padding: 0 12px;
  font-size: 0.88rem;
}

.search-page__search :deep(.search-bar__submit) {
  height: 36px;
  padding: 0 20px;
  font-size: 0.85rem;
}

/* ── Shared panel chrome ───────────────────────────────── */
.search-page__panel {
  position: relative;
  min-height: 0;
  padding: 22px 24px;
}

.search-page__panel-header {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.search-page__panel-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.search-page__panel-label .mdi {
  color: var(--accent);
  font-size: 0.95rem;
}

.search-page__panel-action {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.search-page__panel-action:hover {
  color: var(--accent);
}

.search-page__panel-link {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--accent);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  padding: 10px 0 0;
}

.search-page__panel-link:hover {
  opacity: 0.8;
}

/* ── Empty states ──────────────────────────────────────── */
.search-page__empty {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 140px;
  background: var(--bg-card-subtle);
  border-radius: 14px;
}

.search-page__empty--compact {
  min-height: 80px;
  align-items: flex-start;
  padding: 16px;
  text-align: left;
}

.search-page__empty-icon {
  font-size: 2rem;
  color: var(--accent);
  opacity: 0.35;
}

.search-page__empty-text {
  font-size: 0.88rem;
  color: var(--text-secondary);
  margin: 0;
}

/* ── Chip rows (recent searches, browse by state) ─────────── */
.search-page__chip-row {
  position: relative;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.search-page__chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 10px 9px 14px;
  background: var(--bg-card-inner);
  border: 1px solid transparent;
  border-radius: 100px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.search-page__chip:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  background: var(--bg-input);
}

.search-page__chip--plain {
  border: none;
  font: inherit;
  padding: 9px 16px;
}

.search-page__chip--muted {
  color: var(--text-muted);
}

.search-page__chip-icon {
  color: var(--accent);
  font-size: 0.9rem;
}

.search-page__chip-meta {
  color: var(--text-muted);
  font-weight: 500;
}

.search-page__chip-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-left: 2px;
  border: none;
  border-radius: 50%;
  background: color-mix(in srgb, var(--text-primary) 10%, transparent);
  color: var(--text-muted);
  font-size: 0.7rem;
  cursor: pointer;
}

.search-page__chip-remove:hover {
  background: color-mix(in srgb, var(--danger) 20%, transparent);
  color: var(--danger);
}

/* ── Favorites / comparisons split ────────────────────────── */
.search-page__split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.search-page__row {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 14px;
  margin-bottom: 8px;
  background: var(--bg-card-inner);
  border: none;
  border-radius: 10px;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.search-page__row:hover {
  background: var(--bg-input);
}

.search-page__row-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-primary);
}

.search-page__row-vs {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
}

@media (max-width: 720px) {
  .search-page__split {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .search-page__panel {
    padding: 18px;
  }

  .search-page__heading {
    flex-wrap: wrap;
  }

  .search-page__search {
    flex-basis: 100%;
    order: 1;
  }
}
</style>
