<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import SiteHeader from '../components/SiteHeader.vue';
import { useAuth } from '../composables/useAuth';
import { useComparisons, type SavedComparison } from '../composables/useComparisons';
import { fetchCityPhoto } from '../lib/cityPhotos';
import { fetchCity } from '../api/cities';

const router = useRouter();
const { user } = useAuth();
const { savedComparisons, fetchComparisons, removeComparison } = useComparisons();

interface CardData {
  photoA: string | null;
  photoB: string | null;
  popA: number | null;
  popB: number | null;
  loading: boolean;
}

const cardData = ref<Record<string, CardData>>({});

function cardKey(c: SavedComparison) {
  return c.id;
}

function formatPop(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString();
}

async function loadCard(c: SavedComparison) {
  const key = cardKey(c);
  cardData.value[key] = { photoA: null, photoB: null, popA: null, popB: null, loading: true };
  const [photoA, photoB, cityA, cityB] = await Promise.all([
    fetchCityPhoto(c.state_a, c.city_a),
    fetchCityPhoto(c.state_b, c.city_b),
    fetchCity(c.state_a, c.city_a).catch(() => null),
    fetchCity(c.state_b, c.city_b).catch(() => null),
  ]);
  cardData.value[key] = {
    photoA,
    photoB,
    popA: cityA?.population ?? null,
    popB: cityB?.population ?? null,
    loading: false,
  };
}

watch(
  () => user.value?.id,
  async (userId) => {
    if (!userId) {
      cardData.value = {};
      return;
    }

    await fetchComparisons();
    cardData.value = {};
    savedComparisons.value.forEach(loadCard);
  },
  { immediate: true },
);

function onMouseMove(e: MouseEvent, el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  el.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
  el.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
}

function goToComparison(c: SavedComparison) {
  router.push({ name: 'compare', params: { stateA: c.state_a, cityA: c.city_a, stateB: c.state_b, cityB: c.city_b } });
}

async function handleRemove(e: MouseEvent, c: SavedComparison) {
  e.stopPropagation();
  await removeComparison(c.city_a, c.state_a, c.city_b, c.state_b);
}
</script>

<template>
  <div class="cmp-page">
    <div class="container">
      <SiteHeader
        show-search
        show-theme-toggle
        @search="({ city, state }) => router.push({ name: 'city', params: { city, state } })"
        @logo-click="router.push({ name: 'home' })"
      />
    </div>

    <div class="cmp-page__heading">
      <h1 class="cmp-page__title">
        <span class="mdi mdi-bookmark-multiple cmp-page__title-icon"></span>
        Saved Comparisons
      </h1>
      <button class="breadcrumb" @click="router.back()">
        <span class="breadcrumb__arr breadcrumb__arr--1 mdi mdi-arrow-left"></span>
        <span class="breadcrumb__text">Back</span>
        <span class="breadcrumb__arr breadcrumb__arr--2 mdi mdi-arrow-left"></span>
        <span class="breadcrumb__circle"></span>
      </button>
    </div>

    <div v-if="!user" class="cmp-empty">
      <span class="mdi mdi-account-lock-outline cmp-empty__icon"></span>
      <p class="cmp-empty__text">Sign in to see your saved comparisons</p>
    </div>

    <div v-else-if="savedComparisons.length === 0" class="cmp-empty">
      <span class="mdi mdi-bookmark-off-outline cmp-empty__icon"></span>
      <p class="cmp-empty__text">No saved comparisons yet</p>
      <p class="cmp-empty__hint">Open a comparison and hit Save to keep it here.</p>
    </div>

    <div v-else class="cmp-grid">
      <div
        v-for="c in savedComparisons"
        :key="cardKey(c)"
        class="cmp-card"
        @click="goToComparison(c)"
        @mousemove="onMouseMove($event, $event.currentTarget as HTMLElement)"
      >
        <!-- Photo thumbnails -->
        <div class="cmp-card__photos">
          <div
            class="cmp-card__thumb"
            :class="{ 'cmp-card__thumb--loading': !cardData[cardKey(c)] || cardData[cardKey(c)].loading }"
            :style="cardData[cardKey(c)]?.photoA ? { backgroundImage: `url(${cardData[cardKey(c)].photoA})` } : {}"
          >
            <span class="cmp-card__thumb-badge cmp-card__thumb-badge--a">A</span>
          </div>

          <div class="cmp-card__vs-sep">VS</div>

          <div
            class="cmp-card__thumb cmp-card__thumb--b"
            :class="{ 'cmp-card__thumb--loading': !cardData[cardKey(c)] || cardData[cardKey(c)].loading }"
            :style="cardData[cardKey(c)]?.photoB ? { backgroundImage: `url(${cardData[cardKey(c)].photoB})` } : {}"
          >
            <span class="cmp-card__thumb-badge cmp-card__thumb-badge--b">B</span>
          </div>
        </div>

        <!-- Stats -->
        <div class="cmp-card__stats">
          <div class="cmp-card__city-col">
            <div class="cmp-card__city-name">{{ c.city_name_a }}</div>
            <div class="cmp-card__city-sub">{{ c.state_a.toUpperCase() }}<template v-if="cardData[cardKey(c)]?.popA"> · {{ formatPop(cardData[cardKey(c)].popA!) }}</template></div>
          </div>
          <div class="cmp-card__city-col cmp-card__city-col--b">
            <div class="cmp-card__city-name">{{ c.city_name_b }}</div>
            <div class="cmp-card__city-sub">{{ c.state_b.toUpperCase() }}<template v-if="cardData[cardKey(c)]?.popB"> · {{ formatPop(cardData[cardKey(c)].popB!) }}</template></div>
          </div>
        </div>

        <!-- Remove button -->
        <button
          class="cmp-card__remove"
          aria-label="Remove comparison"
          @click="handleRemove($event, c)"
        >
          <span class="cmp-card__trash-lid mdi mdi-minus"></span>
          <span class="mdi mdi-trash-can-outline cmp-card__trash-body"></span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.site-header) {
  margin-bottom: 0;
  padding-bottom: 8px;
}

.cmp-page {
  min-height: 100vh;
  padding: 0 0 60px;
}

/* ── Heading ─────────────────────────────────────────── */
.cmp-page__heading {
  padding: 4px 40px 16px;
  max-width: 1300px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cmp-page__title {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.cmp-page__title-icon {
  color: var(--accent);
  font-size: 1.5rem;
}

/* ── Empty states ────────────────────────────────────── */
.cmp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 60vh;
  text-align: center;
}

.cmp-empty__icon {
  font-size: 3rem;
  color: var(--accent);
  opacity: 0.35;
}

.cmp-empty__text {
  margin: 0;
  font-size: 1rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.cmp-empty__hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* ── Grid ────────────────────────────────────────────── */
.cmp-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  padding: 0 80px;
  max-width: 1300px;
  margin: 0 auto;
}

/* ── Card ────────────────────────────────────────────── */
.cmp-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.cmp-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    rgba(20, 184, 166, 0.1),
    transparent 60%
  );
  opacity: 0;
  pointer-events: none;
  z-index: 1;
  border-radius: inherit;
  transition: opacity 0.3s ease;
}

.cmp-card:hover {
  box-shadow: var(--card-shadow-hover), 0 0 0 1px rgba(20, 184, 166, 0.28), 0 0 28px rgba(20, 184, 166, 0.13);
  transform: translateY(-2px);
}

.cmp-card:hover::before {
  opacity: 1;
}

/* ── Photo strip ─────────────────────────────────────── */
.cmp-card__photos {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 12px 12px 0;
}

.cmp-card__thumb {
  position: relative;
  flex: 1;
  height: 160px;
  border-radius: 10px;
  background-color: #0a7d72;
  background-size: cover;
  background-position: center;
  overflow: hidden;
  transition: transform 0.35s ease;
}

.cmp-card:hover .cmp-card__thumb {
  transform: scale(1.03);
}

.cmp-card__thumb--b {
  background-color: #1e3a5f;
}

.cmp-card__thumb--loading {
  background-image: linear-gradient(135deg, #0a7d72 0%, #14b8a6 100%) !important;
  animation: cmp-shimmer 1.6s ease-in-out infinite alternate;
}

.cmp-card__thumb--loading-b,
.cmp-card__thumb--b.cmp-card__thumb--loading {
  background-image: linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%) !important;
}

@keyframes cmp-shimmer {
  from { filter: brightness(0.85); }
  to   { filter: brightness(1.1); }
}

.cmp-card__thumb-badge {
  position: absolute;
  bottom: 7px;
  left: 8px;
  font-size: 0.6rem;
  font-weight: 800;
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  border-radius: 4px;
  padding: 2px 6px;
  letter-spacing: 0.06em;
}

.cmp-card__thumb-badge--b {
  left: auto;
  right: 8px;
}

.cmp-card__vs-sep {
  flex-shrink: 0;
  padding: 0 10px;
  font-size: 0.62rem;
  font-weight: 800;
  color: var(--text-muted);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  user-select: none;
}

/* ── Stats section ───────────────────────────────────── */
.cmp-card__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 12px 14px 14px;
  gap: 6px;
  border-top: 1px solid var(--border-subtle);
  margin-top: 12px;
}

.cmp-card__city-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cmp-card__city-col--b {
  text-align: right;
  align-items: flex-end;
}

.cmp-card__city-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.cmp-card__city-sub {
  font-size: 0.72rem;
  color: var(--text-secondary);
  font-weight: 500;
}

/* ── Remove button ───────────────────────────────────── */
.cmp-card__remove {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 4;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.8);
  transition: opacity 0.18s, transform 0.18s, color 0.18s;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.9));
}

.cmp-card:hover .cmp-card__remove {
  opacity: 1;
  transform: scale(1);
}

.cmp-card__remove:hover {
  color: #f87171;
}

.cmp-card__trash-lid {
  position: absolute;
  font-size: 0.75rem;
  top: 4px;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: center bottom;
}

.cmp-card__trash-body {
  font-size: 1.3rem;
  margin-top: 2px;
}

.cmp-card__remove:hover .cmp-card__trash-lid {
  transform: rotate(-35deg) translateX(-2px) translateY(-2px);
}
</style>
