<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useFavorites } from '../composables/useFavorites';
import { useAuth } from '../composables/useAuth';
import { useFriends } from '../composables/useFriends';
import { fetchCity } from '../api/cities';
import SiteHeader from '../components/SiteHeader.vue';
import { supabase } from '../lib/supabase';
import { canViewerAccessProfileContent, getProfileVisibilityNotice, type ProfileVisibility } from '../lib/profilePrivacy';

const props = defineProps<{ username?: string }>();

const router = useRouter();
const { user } = useAuth();
const { getFriendshipStatus } = useFriends();
const { favorites, fetchFavorites, removeFavorite } = useFavorites();

const isOwnPage = computed(() => !props.username);

// ── Viewing another user's favorites ──────────────────────────
interface FavItem { id: string; city: string; state: string; city_name: string; }
const viewingName     = ref('');
const viewingFavs     = ref<FavItem[]>([]);
const viewingAccessDenied = ref(false);
const viewingNotice = ref<{ title: string; description: string } | null>(null);

async function fetchViewingFavs() {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, username, profile_visibility')
    .eq('username', props.username!)
    .maybeSingle();
  if (!profile) {
    viewingFavs.value = [];
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
    viewingFavs.value = [];
    return;
  }
  const { data } = await supabase
    .from('favorites')
    .select('id, city, state, city_name')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });
  viewingFavs.value = data ?? [];
}

const displayFavorites = computed(() => isOwnPage.value ? favorites.value : viewingFavs.value);
const pageTitle        = computed(() => isOwnPage.value ? 'Favorites' : `${viewingName.value}'s Favorites`);

interface CardData {
  population: number | null;
  county: string | null;
  photo: string | null;
  loading: boolean;
}

const cardData = ref<Record<string, CardData>>({});

const PHOTO_BLOCKLIST = ['house','houses','home','homes','residential','suburb','bungalow','cottage','villa','neighborhood','flag','seal','coat_of_arms','.svg','_map','map_','openstreetmap','osm_','street_map','locator','location_map','location.','_location','topograph'];

const STATE_NAMES: Record<string, string> = {
  al:'Alabama',ak:'Alaska',az:'Arizona',ar:'Arkansas',ca:'California',co:'Colorado',
  ct:'Connecticut',de:'Delaware',fl:'Florida',ga:'Georgia',hi:'Hawaii',id:'Idaho',
  il:'Illinois',in:'Indiana',ia:'Iowa',ks:'Kansas',ky:'Kentucky',la:'Louisiana',
  me:'Maine',md:'Maryland',ma:'Massachusetts',mi:'Michigan',mn:'Minnesota',ms:'Mississippi',
  mo:'Missouri',mt:'Montana',ne:'Nebraska',nv:'Nevada',nh:'New_Hampshire',nj:'New_Jersey',
  nm:'New_Mexico',ny:'New_York',nc:'North_Carolina',nd:'North_Dakota',oh:'Ohio',ok:'Oklahoma',
  or:'Oregon',pa:'Pennsylvania',ri:'Rhode_Island',sc:'South_Carolina',sd:'South_Dakota',
  tn:'Tennessee',tx:'Texas',ut:'Utah',vt:'Vermont',va:'Virginia',wa:'Washington',
  wv:'West_Virginia',wi:'Wisconsin',wy:'Wyoming',
};

async function tryWikipediaPhoto(title: string): Promise<string | null> {
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    if (!res.ok) return null;
    const json = await res.json();
    const img = json.originalimage ?? json.thumbnail;
    if (!img || img.width <= img.height) return null;
    const filename = img.source.toLowerCase();
    if (PHOTO_BLOCKLIST.some(kw => filename.includes(kw))) return null;
    return img.source;
  } catch { return null; }
}

async function searchCommonsPhoto(query: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      action: 'query', generator: 'search', gsrsearch: query,
      gsrnamespace: '6', gsrlimit: '15', prop: 'imageinfo',
      iiprop: 'url|dimensions', format: 'json', origin: '*',
    });
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
    if (!res.ok) return null;
    const json = await res.json();
    const pages = Object.values(json.query?.pages ?? {}) as any[];
    for (const page of pages) {
      const info = page.imageinfo?.[0];
      if (!info?.url) continue;
      if (info.width <= info.height) continue;
      const lower = info.url.toLowerCase();
      if (PHOTO_BLOCKLIST.some(kw => lower.includes(kw))) continue;
      if (!lower.match(/\.(jpg|jpeg|png|webp)$/)) continue;
      return info.url;
    }
    return null;
  } catch { return null; }
}

async function loadCard(city: string, state: string) {
  const key = `${state}:${city}`;
  cardData.value[key] = { population: null, county: null, photo: null, loading: true };

  const title = city.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('_');
  const stateName = STATE_NAMES[state.toLowerCase()];

  const cityState = stateName ? `${title},_${stateName.replace(/ /g, '_')}` : null;
  const cityLabel = title.replace(/_/g, ' ');
  const stateLabel = stateName ?? '';

  const [cityData, photo] = await Promise.all([
    fetchCity(state, city).catch(() => null),
    (async () => {
      return (
        await tryWikipediaPhoto(`${title}_skyline`) ??
        await tryWikipediaPhoto(`Downtown_${title}`) ??
        (cityState ? await tryWikipediaPhoto(cityState) : null) ??
        await searchCommonsPhoto(`${cityLabel} ${stateLabel} skyline aerial`) ??
        await searchCommonsPhoto(`${stateLabel} nature aerial landscape`)
      );
    })(),
  ]);

  cardData.value[key] = {
    population: cityData?.population ?? null,
    county: cityData?.county ?? null,
    photo,
    loading: false,
  };
}

async function init() {
  cardData.value = {};
  if (isOwnPage.value) {
    if (!user.value) return;
    await fetchFavorites();
    favorites.value.forEach((f) => loadCard(f.city, f.state));
  } else {
    await fetchViewingFavs();
    viewingFavs.value.forEach((f) => loadCard(f.city, f.state));
  }
}

watch(() => user.value?.id, init, { immediate: true });
watch(() => props.username, init);

function cardKey(city: string, state: string) {
  return `${state}:${city}`;
}

function goToCity(city: string, state: string) {
  router.push({ name: 'city', params: { state, city } });
}

async function handleRemove(event: MouseEvent, city: string, state: string) {
  event.stopPropagation();
  await removeFavorite(city, state);
}

// ── Holographic tilt effect ────────────────────────────────────────────────────

function onMouseMove(e: MouseEvent, el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const rx = ((y - cy) / cy) * -12;
  const ry = ((x - cx) / cx) * 12;
  const bgX = (x / rect.width) * 100;
  const bgY = (y / rect.height) * 100;
  el.style.setProperty('--rx', `${rx}deg`);
  el.style.setProperty('--ry', `${ry}deg`);
  el.style.setProperty('--shine-x', `${bgX}%`);
  el.style.setProperty('--shine-y', `${bgY}%`);
  el.style.setProperty('--card-scale', '1.04');
}

function onMouseLeave(el: HTMLElement) {
  el.style.setProperty('--rx', '0deg');
  el.style.setProperty('--ry', '0deg');
  el.style.setProperty('--shine-x', '50%');
  el.style.setProperty('--shine-y', '50%');
  el.style.setProperty('--card-scale', '1');
}
</script>

<template>
  <div class="fav-page">

    <div class="container">
      <SiteHeader
        show-search
        show-theme-toggle
        @search="({ city, state }) => router.push({ name: 'city', params: { city, state } })"
        @logo-click="router.push({ name: 'home' })"
      />
    </div>

    <div class="fav-page__heading">
      <h1 class="fav-page__title">
        <span class="mdi mdi-star fav-page__title-icon"></span>
        {{ pageTitle }}
      </h1>
      <button class="breadcrumb" @click="router.back()">
        <span class="breadcrumb__arr breadcrumb__arr--1 mdi mdi-arrow-left"></span>
        <span class="breadcrumb__text">Back</span>
        <span class="breadcrumb__arr breadcrumb__arr--2 mdi mdi-arrow-left"></span>
        <span class="breadcrumb__circle"></span>
      </button>
    </div>

    <!-- Not signed in (own page only) -->
    <div v-if="isOwnPage && !user" class="fav-empty">
      <span class="mdi mdi-account-lock-outline fav-empty__icon"></span>
      <p class="fav-empty__text">Sign in to see your saved cities</p>
    </div>

    <!-- Empty -->
    <div v-else-if="!isOwnPage && viewingAccessDenied" class="fav-empty">
      <span class="mdi mdi-lock-outline fav-empty__icon"></span>
      <p class="fav-empty__text">{{ viewingNotice?.title }}</p>
      <p class="fav-empty__hint">{{ viewingNotice?.description }}</p>
    </div>

    <div v-else-if="displayFavorites.length === 0" class="fav-empty">
      <span class="mdi mdi-star-outline fav-empty__icon"></span>
      <p class="fav-empty__text">{{ isOwnPage ? 'No favorites yet — star a city to save it here' : 'No favorites yet' }}</p>
    </div>

    <!-- Cards grid -->
    <div v-else class="fav-grid">
      <div
        v-for="fav in displayFavorites"
        :key="cardKey(fav.city, fav.state)"
        class="trading-card"
        @click="goToCity(fav.city, fav.state)"
        @mousemove="onMouseMove($event, $event.currentTarget as HTMLElement)"
        @mouseleave="onMouseLeave($event.currentTarget as HTMLElement)"
      >
        <!-- Photo background -->
        <div
          class="trading-card__bg"
          :style="cardData[cardKey(fav.city, fav.state)]?.photo
            ? { backgroundImage: `url(${cardData[cardKey(fav.city, fav.state)].photo})` }
            : {}"
          :class="{ 'trading-card__bg--loading': cardData[cardKey(fav.city, fav.state)]?.loading }"
        ></div>

        <!-- Holographic shine layer -->
        <div class="trading-card__shine"></div>

        <!-- Remove button (own page only) -->
        <button
          v-if="isOwnPage"
          class="trading-card__remove"
          @click="handleRemove($event, fav.city, fav.state)"
          aria-label="Remove from favorites"
        >
          <span class="trading-card__trash-lid mdi mdi-minus"></span>
          <span class="mdi mdi-trash-can-outline trading-card__trash-body"></span>
        </button>

        <!-- State badge -->
        <div class="trading-card__badge">{{ fav.state.toUpperCase() }}</div>

        <!-- Bottom content -->
        <div class="trading-card__body">
          <div class="trading-card__name">{{ fav.city_name }}</div>
          <div v-if="cardData[cardKey(fav.city, fav.state)]?.county" class="trading-card__county">
            {{ cardData[cardKey(fav.city, fav.state)].county }}
          </div>
          <div class="trading-card__stats">
            <div v-if="cardData[cardKey(fav.city, fav.state)]?.population" class="trading-card__stat">
              <span class="trading-card__stat-label">Population</span>
              <span class="trading-card__stat-value">{{ cardData[cardKey(fav.city, fav.state)].population!.toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <button class="fav-page__mobile-back" @click="router.back()">
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

.fav-page {
  min-height: 100vh;
  background: var(--bg-page);
  padding: 0 0 60px;
}

/* ── Page heading ─────────────────────────────────────── */
.fav-page__heading {
  padding: 4px 40px 12px;
  max-width: 1300px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fav-page__title {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  display: flex;
  align-items: center;
  gap: 10px;
}

.fav-page__title-icon {
  color: var(--accent);
  font-size: 1.5rem;
}

/* ── Empty state ──────────────────────────────────────── */
.fav-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 60vh;
}

.fav-empty__icon {
  font-size: 3rem;
  color: var(--accent);
  opacity: 0.35;
}

.fav-empty__text {
  font-size: 1rem;
  color: var(--text-secondary);
}

/* ── Grid ─────────────────────────────────────────────── */
.fav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 28px;
  padding: 0 40px;
  max-width: 1300px;
  margin: 0 auto;
}

/* ── Trading card ─────────────────────────────────────── */
.trading-card {
  position: relative;
  aspect-ratio: 2 / 3;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  transform:
    perspective(800px)
    rotateX(var(--rx, 0deg))
    rotateY(var(--ry, 0deg))
    scale(var(--card-scale, 1));
  transition: transform 0.12s ease-out, box-shadow 0.2s ease;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.2);
  will-change: transform;
}

.trading-card:hover {
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.08);
}

/* Photo background */
.trading-card__bg {
  position: absolute;
  inset: 0;
  background-color: var(--accent);
  background-size: cover;
  background-position: center;
  transition: transform 0.3s ease;
}

.trading-card:hover .trading-card__bg {
  transform: scale(1.04);
}

.trading-card__bg--loading {
  background-image: linear-gradient(140deg, var(--accent-hover) 0%, var(--accent) 100%);
}

/* Gradient overlays */
.trading-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(0,0,0,0.35) 0%,
    rgba(0,0,0,0.15) 35%,
    rgba(0,0,0,0.7) 70%,
    rgba(0,0,0,0.92) 100%
  );
  z-index: 1;
}

/* Holographic shine */
.trading-card__shine {
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: 20px;
  background:
    radial-gradient(
      circle at var(--shine-x, 50%) var(--shine-y, 50%),
      rgba(255, 255, 255, 0.28) 0%,
      color-mix(in srgb, var(--accent-hover) 18%, transparent) 20%,
      color-mix(in srgb, var(--accent) 14%, transparent) 40%,
      color-mix(in srgb, var(--text-primary) 8%, transparent) 60%,
      transparent 75%
    ),
    linear-gradient(
      115deg,
      transparent 30%,
      color-mix(in srgb, var(--accent-hover) 7%, transparent) 45%,
      color-mix(in srgb, var(--accent) 7%, transparent) 55%,
      transparent 70%
    );
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
  mix-blend-mode: screen;
}

.trading-card:hover .trading-card__shine {
  opacity: 1;
}

/* Remove button */
.trading-card__remove {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 4;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.8);
  transition: opacity 0.18s, transform 0.18s, color 0.18s;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.9));
}

.trading-card:hover .trading-card__remove {
  opacity: 1;
  transform: scale(1);
}

.trading-card__remove:hover {
  color: var(--danger);
}

.trading-card__trash-lid {
  position: absolute;
  font-size: 0.75rem;
  top: 4px;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: center bottom;
}

.trading-card__trash-body {
  font-size: 1.3rem;
  margin-top: 2px;
}

.trading-card__remove:hover .trading-card__trash-lid {
  transform: rotate(-35deg) translateX(-2px) translateY(-2px);
}

/* State badge */
.trading-card__badge {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 4;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.9);
}

/* Bottom content */
.trading-card__body {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 3;
  padding: 20px 18px 20px;
}

.trading-card__name {
  font-size: 1.4rem;
  font-weight: 800;
  color: white;
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin-bottom: 4px;
}

.trading-card__county {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 12px;
}

.trading-card__stats {
  display: flex;
  gap: 14px;
}

.trading-card__stat {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.trading-card__stat-label {
  font-size: 0.55rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.5);
}

.trading-card__stat-value {
  font-size: 0.88rem;
  font-weight: 700;
  color: white;
}

/* ── Floating back button ─────────────────────────────── */
.fav-page__mobile-back {
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
  cursor: pointer;
}

.fav-page__mobile-back .mdi {
  font-size: 1.2rem;
}

/* ── Mobile: list layout ──────────────────────────────── */
@media (max-width: 640px) {
  :deep(.site-header__search),
  :deep(.site-header__search-spacer) {
    display: none;
  }

  .fav-page__heading {
    padding: 4px 16px 12px;
  }

  .fav-page__heading .breadcrumb {
    display: none;
  }

  .fav-page__mobile-back {
    display: inline-flex;
  }

  .fav-grid {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 0 16px;
  }

  /* Flat list row with thumbnail */
  .trading-card {
    aspect-ratio: unset;
    min-height: 90px;
    border-radius: 16px;
    transform: none !important;
    will-change: auto;
    transition: border-color 0.18s ease;
    background: color-mix(in srgb, var(--bg-card-subtle) 84%, transparent);
    border: 1px solid var(--border-subtle);
    box-shadow: none;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    overflow: hidden;
  }

  .trading-card:active {
    border-color: color-mix(in srgb, var(--accent) 34%, var(--border-card));
  }

  /* Thumbnail on the left */
  .trading-card__bg {
    position: relative;
    inset: auto;
    width: 90px;
    flex-shrink: 0;
    background-color: color-mix(in srgb, var(--accent) 30%, transparent);
    background-size: cover;
    background-position: center;
    transition: none;
  }

  .trading-card__bg--loading {
    background-image: linear-gradient(140deg, color-mix(in srgb, var(--accent-hover) 70%, transparent) 0%, color-mix(in srgb, var(--accent) 50%, transparent) 100%);
  }

  .trading-card__shine {
    display: none;
  }

  .trading-card::before {
    display: none;
  }

  .trading-card__body {
    position: static;
    flex: 1;
    min-width: 0;
    padding: 14px 80px 14px 14px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .trading-card__name {
    font-size: 0.96rem;
    color: var(--text-primary);
    margin-bottom: 2px;
  }

  .trading-card__county {
    font-size: 0.84rem;
    color: var(--text-secondary);
    margin-bottom: 0;
  }

  .trading-card__stats {
    display: none;
  }

  /* Badge repositioned to right, vertically centered */
  .trading-card__badge {
    left: auto;
    right: 46px;
    top: 50%;
    transform: translateY(-50%);
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    border-color: color-mix(in srgb, var(--accent) 25%, transparent);
    color: var(--accent);
  }

  /* Remove button always visible, vertically centered */
  .trading-card__remove {
    top: 50%;
    right: 12px;
    opacity: 1;
    transform: translateY(-50%) scale(1);
    color: var(--text-muted);
  }

  .trading-card__remove .trading-card__trash-lid {
    display: none;
  }

  .trading-card__trash-body {
    font-size: 1.1rem;
  }
}
</style>
