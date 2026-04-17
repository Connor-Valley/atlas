<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import SiteHeader from '../components/SiteHeader.vue';
import { useAuth } from '../composables/useAuth';
import { useFriends } from '../composables/useFriends';
import { useComparisons, type SavedComparison } from '../composables/useComparisons';
import { fetchCityPhoto } from '../lib/cityPhotos';
import { fetchCity } from '../api/cities';
import { supabase } from '../lib/supabase';
import { canViewerAccessProfileContent, getProfileVisibilityNotice, type ProfileVisibility } from '../lib/profilePrivacy';

const props = defineProps<{ username?: string }>();

const router = useRouter();
const { user } = useAuth();
const { getFriendshipStatus } = useFriends();
const { savedComparisons, fetchComparisons, removeComparison } = useComparisons();

const isOwnPage = computed(() => !props.username);

// ── Viewing another user's comparisons ────────────────────────
const viewingName  = ref('');
const viewingComps = ref<SavedComparison[]>([]);
const viewingAccessDenied = ref(false);
const viewingNotice = ref<{ title: string; description: string } | null>(null);

async function fetchViewingComps() {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, username, profile_visibility')
    .eq('username', props.username!)
    .maybeSingle();
  if (!profile) {
    viewingComps.value = [];
    viewingAccessDenied.value = false;
    viewingNotice.value = null;
    return;
  }
  viewingName.value = profile.display_name || profile.username;
  let isFriend = false;
  if (user.value) {
    const status = await getFriendshipStatus(profile.id);
    isFriend = status.status === 'accepted';
  }
  const canView = canViewerAccessProfileContent(
    profile.profile_visibility as ProfileVisibility,
    user.value?.id,
    profile.id,
    isFriend,
  );
  viewingAccessDenied.value = !canView;
  viewingNotice.value = canView ? null : getProfileVisibilityNotice(profile.profile_visibility as ProfileVisibility, !!user.value);
  if (!canView) {
    viewingComps.value = [];
    return;
  }
  const { data } = await supabase
    .from('saved_comparisons')
    .select('id, city_a, state_a, city_name_a, city_b, state_b, city_name_b, user_id')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });
  viewingComps.value = (data ?? []) as SavedComparison[];
}

const displayComparisons = computed(() => isOwnPage.value ? savedComparisons.value : viewingComps.value);
const pageTitle           = computed(() => isOwnPage.value ? 'Saved Comparisons' : `${viewingName.value}'s Comparisons`);

interface CardData {
  photoA: string | null;
  photoB: string | null;
  popA: number | null;
  popB: number | null;
  loading: boolean;
}

const cardData = ref<Record<string, CardData>>({});
const openMobileMenuId = ref<string | null>(null);

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

async function init() {
  cardData.value = {};
  if (isOwnPage.value) {
    if (!user.value) return;
    await fetchComparisons();
    savedComparisons.value.forEach(loadCard);
  } else {
    await fetchViewingComps();
    viewingComps.value.forEach(loadCard);
  }
}

watch(() => user.value?.id, init, { immediate: true });
watch(() => props.username, init);

function onMouseMove(e: MouseEvent, el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  el.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
  el.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
}

function goToComparison(c: SavedComparison) {
  router.push({ name: 'compare', params: { stateA: c.state_a, cityA: c.city_a, stateB: c.state_b, cityB: c.city_b } });
}

function toggleMobileMenu(e: MouseEvent, comparisonId: string) {
  e.stopPropagation();
  openMobileMenuId.value = openMobileMenuId.value === comparisonId ? null : comparisonId;
}

async function handleRemove(e: MouseEvent, c: SavedComparison) {
  e.stopPropagation();
  openMobileMenuId.value = null;
  await removeComparison(c.city_a, c.state_a, c.city_b, c.state_b);
}

function handleDocumentClick() {
  openMobileMenuId.value = null;
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick, { capture: true });
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick, { capture: true });
});
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
        {{ pageTitle }}
      </h1>
      <button class="breadcrumb" @click="router.back()">
        <span class="breadcrumb__arr breadcrumb__arr--1 mdi mdi-arrow-left"></span>
        <span class="breadcrumb__text">Back</span>
        <span class="breadcrumb__arr breadcrumb__arr--2 mdi mdi-arrow-left"></span>
        <span class="breadcrumb__circle"></span>
      </button>
    </div>

    <div v-if="isOwnPage && !user" class="cmp-empty">
      <span class="mdi mdi-account-lock-outline cmp-empty__icon"></span>
      <p class="cmp-empty__text">Sign in to see your saved comparisons</p>
    </div>

    <div v-else-if="!isOwnPage && viewingAccessDenied" class="cmp-empty">
      <span class="mdi mdi-lock-outline cmp-empty__icon"></span>
      <p class="cmp-empty__text">{{ viewingNotice?.title }}</p>
      <p class="cmp-empty__hint">{{ viewingNotice?.description }}</p>
    </div>

    <div v-else-if="displayComparisons.length === 0" class="cmp-empty">
      <span class="mdi mdi-bookmark-off-outline cmp-empty__icon"></span>
      <p class="cmp-empty__text">No saved comparisons yet</p>
      <p v-if="isOwnPage" class="cmp-empty__hint">Open a comparison and hit Save to keep it here.</p>
    </div>

    <div v-else class="cmp-grid">
      <div
        v-for="c in displayComparisons"
        :key="cardKey(c)"
        class="cmp-card"
        @click="goToComparison(c)"
        @mousemove="onMouseMove($event, $event.currentTarget as HTMLElement)"
      >
        <button
          v-if="isOwnPage"
          class="cmp-card__menu-trigger"
          aria-label="More actions"
          @click="toggleMobileMenu($event, cardKey(c))"
        >
          <span class="cmp-card__menu-dots" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        <div
          v-if="isOwnPage && openMobileMenuId === cardKey(c)"
          class="cmp-card__menu"
          @click.stop
        >
          <button
            class="cmp-card__menu-delete"
            @click="handleRemove($event, c)"
          >
            <span class="mdi mdi-trash-can-outline"></span>
            Delete comparison
          </button>
        </div>

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

        <!-- Remove button (own page only) -->
        <button
          v-if="isOwnPage"
          class="cmp-card__remove"
          aria-label="Remove comparison"
          @click="handleRemove($event, c)"
        >
          <span class="cmp-card__trash-lid mdi mdi-minus"></span>
          <span class="mdi mdi-trash-can-outline cmp-card__trash-body"></span>
        </button>
      </div>
    </div>

    <button class="cmp-page__mobile-back" @click="router.back()">
      <span class="mdi mdi-arrow-left"></span>
    </button>
  </div>
</template>

<style scoped>
/* TODO(color-tokens): This file still contains hardcoded colors outside shared CSS variables. Keep them unchanged during the token refactor. */
:deep(.site-header) {
  margin-bottom: 0;
  padding-bottom: 8px;
}

.cmp-page {
  min-height: 100vh;
  padding: 0 0 60px;
}

.cmp-page__mobile-back {
  position: fixed;
  right: 18px;
  bottom: 18px;
  width: 54px;
  height: 54px;
  border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--border-card));
  border-radius: 18px;
  background: color-mix(in srgb, var(--bg-card) 94%, transparent);
  color: var(--accent);
  display: none;
  align-items: center;
  justify-content: center;
  box-shadow: var(--card-shadow);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 30;
}

.cmp-page__mobile-back .mdi {
  font-size: 1.2rem;
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
    color-mix(in srgb, var(--accent) 10%, transparent),
    transparent 60%
  );
  opacity: 0;
  pointer-events: none;
  z-index: 1;
  border-radius: inherit;
  transition: opacity 0.3s ease;
}

.cmp-card:hover {
  box-shadow: var(--card-shadow-hover), 0 0 0 1px color-mix(in srgb, var(--accent) 28%, transparent), 0 0 28px color-mix(in srgb, var(--accent) 13%, transparent);
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
  background-color: var(--accent);
  background-size: cover;
  background-position: center;
  overflow: hidden;
  transition: transform 0.35s ease;
}

.cmp-card:hover .cmp-card__thumb {
  transform: scale(1.03);
}

.cmp-card__thumb--b {
  background-color: var(--city-a);
}

.cmp-card__thumb--loading {
  background-image: linear-gradient(135deg, var(--accent-hover) 0%, var(--accent) 100%) !important;
  animation: cmp-shimmer 1.6s ease-in-out infinite alternate;
}

.cmp-card__thumb--loading-b,
.cmp-card__thumb--b.cmp-card__thumb--loading {
  background-image: linear-gradient(135deg, color-mix(in srgb, var(--city-a) 82%, black) 0%, var(--city-a) 100%) !important;
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
  color: var(--text-primary);
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
    min-width: 0;
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
  color: var(--danger);
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

.cmp-card__menu-trigger,
.cmp-card__menu {
  display: none;
}

.cmp-card__menu-dots {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.cmp-card__menu-dots span {
  width: 3px;
  height: 3px;
  border-radius: 999px;
  background: currentColor;
}

@media (max-width: 640px) {
  :deep(.site-header__search),
  :deep(.site-header__search-spacer),
  :deep(.site-header__search--mobile),
  :deep(.site-header__search-full),
  :deep(.site-header__search-pill) {
    display: none !important;
  }

  :deep(.site-header) {
    padding-bottom: 0;
    margin-bottom: 0;
  }

  .cmp-page__heading {
    padding: 0 16px 14px;
  }

  .cmp-page__heading .breadcrumb {
    display: none;
  }

  .cmp-grid {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 0 16px;
  }

  .cmp-card {
    width: 100%;
    box-sizing: border-box;
  }

  .cmp-card__photos {
    padding: 18px 12px 12px;
  }

  .cmp-card__thumb {
    height: 92px;
  }

  .cmp-card__vs-sep {
    padding: 0 6px;
    font-size: 0.56rem;
  }

  .cmp-card__stats {
    padding: 8px 10px 10px;
    margin-top: 0;
  }

  .cmp-card__city-name {
    font-size: 0.8rem;
    flex: 0 1 auto;
    min-width: 0;
  }

  .cmp-card__city-sub {
    font-size: 0.64rem;
    white-space: nowrap;
    flex: 0 0 auto;
  }

  .cmp-card__city-col {
    flex-direction: row;
    align-items: baseline;
    gap: 6px;
  }

  .cmp-card__city-col--b {
    justify-content: flex-end;
  }

  .cmp-card__city-col--b .cmp-card__city-name,
  .cmp-card__city-col--b .cmp-card__city-sub {
    text-align: right;
  }

  .cmp-card__remove {
    display: none;
  }

  .cmp-card__menu-trigger {
    display: inline-flex;
    position: absolute;
    top: -8px;
    right: 8px;
    z-index: 5;
    width: 32px;
    height: 32px;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 9px;
    background: transparent;
    color: rgba(233, 240, 252, 0.88);
    box-shadow: none;
  }

  .cmp-card__menu-dots {
    gap: 4px;
  }

  .cmp-card__menu {
    display: flex;
    position: absolute;
    top: -8px;
    right: 8px;
    z-index: 6;
    padding-top: 34px;
  }

  .cmp-card__menu-delete {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid rgba(248, 113, 113, 0.28);
    border-radius: 12px;
    background: rgba(60, 18, 18, 0.94);
    color: color-mix(in srgb, var(--danger) 60%, var(--text-primary));
    padding: 10px 12px;
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    white-space: nowrap;
    box-shadow: 0 14px 30px rgba(8, 10, 20, 0.34);
  }

  .cmp-card__menu-delete .mdi {
    font-size: 0.92rem;
  }

  .cmp-card:hover {
    box-shadow: none;
    transform: none;
  }

  .cmp-card:hover::before {
    opacity: 0;
  }

  .cmp-card:hover .cmp-card__thumb {
    transform: none;
  }

  .cmp-page__mobile-back {
    display: inline-flex;
  }
}
</style>
