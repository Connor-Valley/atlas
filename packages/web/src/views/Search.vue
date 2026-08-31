<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import DashboardHeader from '../components/DashboardHeader.vue';
import CitySearch from '../components/CitySearch.vue';
import UsStateMap from '../components/UsStateMap.vue';
import AuthModal from '../components/AuthModal.vue';
import { useAuth } from '../composables/useAuth';
import { useRecentSearches } from '../composables/useRecentSearches';
import { useFavorites } from '../composables/useFavorites';
import { useComparisons } from '../composables/useComparisons';
import { buildCompareUrl } from '../lib/compare';
import { getStates, type StateOption } from '../api/states';
import { fetchHousing } from '../api/housing';

const router = useRouter();
const { user, displayName } = useAuth();
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
const hoveredStateCode = ref<string | null>(null);
const stateListRef = ref<HTMLElement | null>(null);

watch(hoveredStateCode, (code) => {
  if (!code || !stateListRef.value) return;
  const el = stateListRef.value.querySelector<HTMLElement>(`[data-code="${code}"]`);
  el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
});

onMounted(async () => {
  try {
    states.value = await getStates();
  } catch {
    states.value = [];
  }
});

const heroRef = ref<HTMLElement | null>(null);

function browseByState(code: string) {
  router.push({ name: 'state-browse', params: { code: code.toUpperCase() } });
}

const showAuthModal = ref(false);
const authModalMode = ref<'login' | 'register'>('login');

function openAuth(mode: 'login' | 'register') {
  authModalMode.value = mode;
  showAuthModal.value = true;
}

const iconRef = ref<HTMLElement | null>(null);
const pulsing = ref(false);
const panelOpen = ref(false);
const hits: number[] = [];
const THRESHOLD = 15;
const WINDOW_MS = 30_000;
const originPt = ref({ x: 0, y: 0 });

function onIconClick() {
  pulse();
  registerHit();
}

function pulse() {
  pulsing.value = false;
  requestAnimationFrame(() => { pulsing.value = true; });
}

function registerHit() {
  const now = Date.now();
  hits.push(now);
  while (hits.length && now - hits[0] > WINDOW_MS) {
    hits.shift();
  }
  if (hits.length >= THRESHOLD) {
    hits.length = 0;
    openPanel();
  }
}

function openPanel() {
  const rect = iconRef.value?.getBoundingClientRect();
  originPt.value = rect
    ? { x: rect.left + rect.width / 2 - window.innerWidth / 2, y: rect.top + rect.height / 2 - window.innerHeight / 2 }
    : { x: 0, y: 0 };
  panelOpen.value = true;
}

function closePanel() {
  panelOpen.value = false;
}

function onPanelBeforeEnter(el: Element) {
  const tile = (el as HTMLElement).querySelector<HTMLElement>(".sp-tile");
  if (!tile) return;
  tile.style.transform = `translate(${originPt.value.x}px, ${originPt.value.y}px) scale(0.05) rotate(-25deg)`;
  tile.style.opacity = "0";
}

function onPanelEnter(el: Element, done: () => void) {
  const tile = (el as HTMLElement).querySelector<HTMLElement>(".sp-tile");
  if (!tile) { done(); return; }
  void tile.offsetWidth;
  tile.style.transition = "transform 0.75s cubic-bezier(0.2, 1.4, 0.4, 1), opacity 0.35s ease";
  tile.style.transform = "translate(0, 0) scale(1) rotate(720deg)";
  tile.style.opacity = "1";
  tile.addEventListener("transitionend", () => done(), { once: true });
}

function onPanelAfterEnter(el: Element) {
  const tile = (el as HTMLElement).querySelector<HTMLElement>(".sp-tile");
  if (!tile) return;
  tile.style.transition = "";
  tile.style.transform = "";
}

function onTileMove(e: MouseEvent, el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  el.style.setProperty("--rx", `${((y - cy) / cy) * -10}deg`);
  el.style.setProperty("--ry", `${((x - cx) / cx) * 10}deg`);
  el.style.setProperty("--shine-x", `${(x / rect.width) * 100}%`);
  el.style.setProperty("--shine-y", `${(y / rect.height) * 100}%`);
}

function onTileLeave(el: HTMLElement) {
  el.style.setProperty("--rx", "0deg");
  el.style.setProperty("--ry", "0deg");
  el.style.setProperty("--shine-x", "50%");
  el.style.setProperty("--shine-y", "50%");
}
</script>

<template>
  <div class="search-page">
    <div class="container container--header-only">
      <DashboardHeader page-label="Search" @logo-click="router.push({ name: 'search' })" @search="onSearch">
        <template v-if="user" #subtitle>
          <span class="search-page__welcome"><strong>Welcome back, {{ displayName() ?? 'friend' }}</strong></span>
        </template>
      </DashboardHeader>
    </div>

    <div class="container search-page__body">
      <div ref="heroRef" class="search-page__heading">
        <button
          ref="iconRef"
          type="button"
          class="search-page__heading-icon"
          :class="{ 'search-page__heading-icon--active': pulsing }"
          aria-label="Search"
          @click="onIconClick"
          @animationend="pulsing = false"
        ><span class="mdi mdi-magnify"></span></button>
        <div class="search-page__search">
          <CitySearch @search="onSearch" />
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

        <div v-if="!user" class="search-page__empty search-page__empty--clickable" @click="openAuth('login')">
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

          <div v-if="!user" class="search-page__empty search-page__empty--compact search-page__empty--lock-only search-page__empty--clickable" @click="openAuth('login')">
            <span class="mdi mdi-lock-outline search-page__empty-icon"></span>
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

          <div v-if="!user" class="search-page__empty search-page__empty--compact search-page__empty--lock-only search-page__empty--clickable" @click="openAuth('login')">
            <span class="mdi mdi-lock-outline search-page__empty-icon"></span>
          </div>
          <div v-else-if="comparisonsLoaded && savedComparisons.length === 0" class="search-page__empty search-page__empty--compact">
            <p class="search-page__empty-text">No saved comparisons yet</p>
          </div>
          <template v-else>
            <button
              v-for="cmp in savedComparisons.slice(0, 3)"
              :key="cmp.id"
              class="search-page__row"
              @click="router.push(buildCompareUrl(cmp.cities.map((c) => ({ state: c.state, city: c.city }))))"
            >
              <template v-for="(c, i) in cmp.cities" :key="`${c.state}-${c.city}`">
                <span v-if="i > 0" class="search-page__row-vs">vs</span>
                <span class="search-page__row-name">{{ c.city_name }}, {{ c.state }}</span>
              </template>
            </button>
          </template>
          <button v-if="user" class="search-page__panel-link" @click="router.push({ name: 'compare-empty' })">
            <span class="mdi mdi-plus"></span> New Comparison
          </button>
        </section>
      </div>

      <section class="search-page__panel data-card">
        <div class="search-page__panel-header">
          <span class="search-page__panel-label">Browse by State</span>
        </div>
        <div class="search-page__map-layout">
          <UsStateMap
            :states="states"
            :hovered-code="hoveredStateCode"
            class="search-page__map"
            @select="browseByState"
            @hover="code => hoveredStateCode = code"
          />
          <div class="search-page__state-list-wrap">
            <h3 class="search-page__state-list-title">
              <span class="mdi mdi-format-list-bulleted"></span>
              All States
            </h3>
            <div ref="stateListRef" class="search-page__state-list">
              <button
                v-for="s in states"
                :key="s.code"
                class="search-page__state-list-item"
                :class="{ 'search-page__state-list-item--active': hoveredStateCode === s.code.toUpperCase() }"
                :data-code="s.code.toUpperCase()"
                @click="browseByState(s.code)"
                @mouseenter="hoveredStateCode = s.code.toUpperCase()"
                @mouseleave="hoveredStateCode = null"
              >
                {{ s.name }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <AuthModal v-if="showAuthModal" :mode="authModalMode" @close="showAuthModal = false" />
  </div>

  <Teleport to="body">
    <Transition
      name="sp-tile"
      @before-enter="onPanelBeforeEnter"
      @enter="onPanelEnter"
      @after-enter="onPanelAfterEnter"
    >
      <div v-if="panelOpen" class="sp-tile-overlay" @click="closePanel">
        <div
          class="sp-tile"
          @mousemove="onTileMove($event, $event.currentTarget as HTMLElement)"
          @mouseleave="onTileLeave($event.currentTarget as HTMLElement)"
        >
          <img src="/spark.webp" alt="" class="sp-tile__img" />
          <div class="sp-tile__shine"></div>
        </div>
      </div>
    </Transition>
  </Teleport>
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

/* ── Welcome back greeting (inline in header bar) ───────── */
.search-page__welcome {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1;
  color: var(--text-muted);
  white-space: nowrap;
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
  border: none;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  color: var(--accent);
  font-size: 1.1rem;
  cursor: default;
}

@keyframes sp-heading-icon-pulse {
  0%   { transform: scale(1); }
  30%  { transform: scale(0.82); }
  55%  { transform: scale(1.16); }
  75%  { transform: scale(0.94); }
  100% { transform: scale(1); }
}

.search-page__heading-icon--active {
  animation: sp-heading-icon-pulse 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
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

.search-page__empty--lock-only {
  align-items: center;
  justify-content: center;
}

.search-page__empty--clickable {
  cursor: pointer;
  transition: background 0.15s ease;
}

.search-page__empty--clickable:hover {
  background: var(--bg-card-inner);
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

/* ── Browse-by-state map ───────────────────────────────── */
.search-page__map-layout {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 36px;
}

.search-page__map {
  flex: 1 1 560px;
  min-width: 0;
  max-width: 560px;
  margin: 4px 0 0;
}

.search-page__state-list-wrap {
  flex: 0 0 400px;
  background: var(--bg-card-inner);
  border: 1px solid var(--border-card);
  border-radius: 14px;
  padding: 14px;
}

.search-page__state-list-title {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 10px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.search-page__state-list-title .mdi {
  color: var(--accent);
  font-size: 0.85rem;
}

.search-page__state-list {
  max-height: 380px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-content: start;
  gap: 6px 8px;
  padding-right: 4px;
  scrollbar-width: thin;
}

.search-page__state-list-item {
  display: block;
  width: 100%;
  padding: 7px 9px;
  border: 1px solid var(--border-card);
  border-radius: 7px;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}

.search-page__state-list-item:hover,
.search-page__state-list-item--active {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
  color: var(--text-primary);
}

@media (max-width: 720px) {
  .search-page__split {
    grid-template-columns: 1fr;
  }

  .search-page__map-layout {
    flex-direction: column;
  }

  .search-page__state-list-wrap {
    flex-basis: auto;
    width: 100%;
  }

  .search-page__state-list {
    max-height: 220px;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
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

.sp-tile-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  cursor: pointer;
}

.sp-tile-enter-active,
.sp-tile-leave-active {
  transition: opacity 0.3s ease;
}

.sp-tile-enter-from,
.sp-tile-leave-to {
  opacity: 0;
}

.sp-tile-leave-active .sp-tile {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.sp-tile-leave-to .sp-tile {
  transform: scale(0.7);
  opacity: 0;
}

.sp-tile {
  position: relative;
  width: 260px;
  aspect-ratio: 2 / 3;
  border-radius: 20px;
  overflow: hidden;
  cursor: default;
  transform:
    perspective(800px)
    rotateX(var(--rx, 0deg))
    rotateY(var(--ry, 0deg));
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  background: var(--bg-card);
}

.sp-tile__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.15);
}

.sp-tile__shine {
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: 20px;
  background:
    radial-gradient(
      circle at var(--shine-x, 50%) var(--shine-y, 50%),
      rgba(255, 255, 255, 0.35) 0%,
      color-mix(in srgb, var(--accent-hover) 20%, transparent) 20%,
      color-mix(in srgb, var(--accent) 16%, transparent) 40%,
      transparent 75%
    ),
    linear-gradient(
      115deg,
      transparent 30%,
      color-mix(in srgb, var(--accent-hover) 10%, transparent) 45%,
      color-mix(in srgb, var(--accent) 10%, transparent) 55%,
      transparent 70%
    );
  pointer-events: none;
  mix-blend-mode: screen;
}

html.dark .sp-tile::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 3;
  background: rgba(0, 0, 0, 0.15);
  mix-blend-mode: multiply;
  pointer-events: none;
}

html.dark .sp-tile__shine {
  background:
    radial-gradient(
      circle at var(--shine-x, 50%) var(--shine-y, 50%),
      rgba(255, 255, 255, 0.18) 0%,
      color-mix(in srgb, var(--accent-hover) 14%, transparent) 20%,
      color-mix(in srgb, var(--accent) 10%, transparent) 40%,
      transparent 75%
    ),
    linear-gradient(
      115deg,
      transparent 30%,
      color-mix(in srgb, var(--accent-hover) 6%, transparent) 45%,
      color-mix(in srgb, var(--accent) 6%, transparent) 55%,
      transparent 70%
    );
}
</style>
