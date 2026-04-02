<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { fetchCity } from "../api/cities";
import { useAuth } from "../composables/useAuth";
import { useFavorites } from "../composables/useFavorites";

const props = defineProps<{ city: string; state: string }>();
const emit = defineEmits<{
  (e: 'score', value: number): void;
  (e: 'error'): void;
  (e: 'not-found'): void;
  (e: 'auth-required'): void;
}>();

const { user } = useAuth();
const { fetchFavorites, addFavorite, removeFavorite, isFavorited } = useFavorites();

watch(() => user.value, (u) => {
  if (u) fetchFavorites();
}, { immediate: true });

async function toggleFavorite() {
  if (!user.value) {
    emit('auth-required');
    return;
  }
  if (isFavorited(props.city, props.state)) {
    await removeFavorite(props.city, props.state);
  } else {
    await addFavorite(props.city, data.value.name, props.state);
  }
}

const data = ref<any>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const photoUrl = ref<string | null>(null);

const peopleScore = computed(() => {
  if (!data.value) return null;
  return Math.min(100, Math.round((data.value.population / 1000000) * 100));
});

async function load() {
  if (!props.city || !props.state) return;

  loading.value = true;
  error.value = null;
  data.value = null;

  try {
    data.value = await fetchCity(props.state, props.city);
    if (peopleScore.value !== null) {
      emit('score', peopleScore.value);
    }
  } catch (err) {
    const status = typeof err === "object" && err !== null && "status" in err
      ? (err as { status?: number }).status
      : undefined;

    if (status === 404) {
      emit('not-found');
      return;
    }

    error.value = "Failed to load city info";
    emit('error');
  } finally {
    loading.value = false;
  }
}

const PHOTO_BLOCKLIST = ['house', 'houses', 'home', 'homes', 'residential', 'suburb', 'bungalow', 'cottage', 'villa', 'neighborhood', 'flag', 'seal', 'coat_of_arms', '.svg', '_map', 'map_', 'openstreetmap', 'osm_', 'street_map', 'locator', 'location_map', 'location.', '_location', 'topograph'];

const STATE_NAMES: Record<string, string> = {
  al: 'Alabama', ak: 'Alaska', az: 'Arizona', ar: 'Arkansas',
  ca: 'California', co: 'Colorado', ct: 'Connecticut', de: 'Delaware',
  fl: 'Florida', ga: 'Georgia', hi: 'Hawaii', id: 'Idaho',
  il: 'Illinois', in: 'Indiana', ia: 'Iowa', ks: 'Kansas',
  ky: 'Kentucky', la: 'Louisiana', me: 'Maine', md: 'Maryland',
  ma: 'Massachusetts', mi: 'Michigan', mn: 'Minnesota', ms: 'Mississippi',
  mo: 'Missouri', mt: 'Montana', ne: 'Nebraska', nv: 'Nevada',
  nh: 'New_Hampshire', nj: 'New_Jersey', nm: 'New_Mexico', ny: 'New_York',
  nc: 'North_Carolina', nd: 'North_Dakota', oh: 'Ohio', ok: 'Oklahoma',
  or: 'Oregon', pa: 'Pennsylvania', ri: 'Rhode_Island', sc: 'South_Carolina',
  sd: 'South_Dakota', tn: 'Tennessee', tx: 'Texas', ut: 'Utah',
  vt: 'Vermont', va: 'Virginia', wa: 'Washington', wv: 'West_Virginia',
  wi: 'Wisconsin', wy: 'Wyoming',
};

async function tryWikipediaPhoto(title: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    const img = json.originalimage ?? json.thumbnail;
    if (!img) return null;
    // Skip portrait/square images — flags, seals, logos are usually not landscape
    if (img.width <= img.height) return null;
    // Skip residential/house imagery by checking the filename
    const filename = img.source.toLowerCase();
    if (PHOTO_BLOCKLIST.some(kw => filename.includes(kw))) return null;
    return img.source;
  } catch {
    return null;
  }
}

async function searchCommonsPhoto(query: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: query,
      gsrnamespace: '6',
      gsrlimit: '15',
      prop: 'imageinfo',
      iiprop: 'url|dimensions',
      format: 'json',
      origin: '*',
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
  } catch {
    return null;
  }
}

async function loadPhoto() {
  photoUrl.value = null;
  const title = props.city
    .split('-')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('_');

  const stateName = STATE_NAMES[props.state.toLowerCase()];
  const cityState = stateName ? `${title},_${stateName.replace(/ /g, '_')}` : null;
  const cityLabel = title.replace(/_/g, ' ');
  const stateLabel = stateName ?? '';

  photoUrl.value =
    await tryWikipediaPhoto(`${title}_skyline`) ??
    await tryWikipediaPhoto(`Downtown_${title}`) ??
    (cityState ? await tryWikipediaPhoto(cityState) : null) ??
    await searchCommonsPhoto(`${cityLabel} ${stateLabel} skyline aerial`) ??
    await searchCommonsPhoto(`${stateLabel} nature aerial landscape`);
}

watch(
  () => [props.city, props.state],
  ([city, state]) => {
    if (!city || !state) return;
    load();
    loadPhoto();
  },
  { immediate: true }
);
</script>

<template>
  <div class="hero-section">
    <div v-if="loading" class="city-hero-card city-hero-card--loading" aria-hidden="true">
      <div class="city-hero-card__content">
        <span class="city-hero-card__name city-hero-card__name--skeleton skeleton-line"></span>
        <span class="city-hero-card__sub city-hero-card__sub--skeleton skeleton-line"></span>
      </div>
      <div class="city-hero-card__stats">
        <div class="city-hero-card__stat">
          <span class="city-hero-card__stat-label skeleton-line skeleton-line--label"></span>
          <span class="city-hero-card__stat-value city-hero-card__stat-value--skeleton skeleton-line"></span>
        </div>
        <div class="city-hero-card__stat">
          <span class="city-hero-card__stat-label skeleton-line skeleton-line--label"></span>
          <span class="city-hero-card__stat-value city-hero-card__stat-value--skeleton skeleton-line"></span>
        </div>
        <div class="city-hero-card__stat">
          <span class="city-hero-card__stat-label skeleton-line skeleton-line--label"></span>
          <span class="city-hero-card__stat-value city-hero-card__stat-value--skeleton skeleton-line"></span>
        </div>
      </div>
    </div>
    <p v-else-if="error" class="muted">{{ error }}</p>

    <div
      v-else-if="data"
      class="city-hero-card"
      :style="photoUrl ? { backgroundImage: `url(${photoUrl})` } : {}"
    >
      <button
        class="city-hero-card__fav"
        :class="{ 'city-hero-card__fav--active': isFavorited(city, state) }"
        :aria-label="isFavorited(city, state) ? 'Remove from favorites' : 'Add to favorites'"
        @click="toggleFavorite"
      >
        <span class="mdi" :class="isFavorited(city, state) ? 'mdi-star' : 'mdi-star-outline'"></span>
      </button>
      <div class="city-hero-card__content">
        <div class="city-hero-card__name">{{ data.name }}</div>
        <div class="city-hero-card__sub">{{ data.county }}, {{ state.toUpperCase() }}</div>
      </div>
      <div class="city-hero-card__stats">
        <div class="city-hero-card__stat">
          <span class="city-hero-card__stat-label">Population</span>
          <span class="city-hero-card__stat-value">{{ data.population.toLocaleString() }}</span>
        </div>
        <div class="city-hero-card__stat">
          <span class="city-hero-card__stat-label">County</span>
          <span class="city-hero-card__stat-value">{{ data.county }}</span>
        </div>
        <div class="city-hero-card__stat">
          <span class="city-hero-card__stat-label">State</span>
          <span class="city-hero-card__stat-value">{{ state.toUpperCase() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
