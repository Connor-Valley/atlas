<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { fetchCity } from "../api/cities";
import { useAuth } from "../composables/useAuth";
import { useFavorites } from "../composables/useFavorites";
import { fetchCityPhoto } from "../lib/cityPhotos";

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

async function loadPhoto() {
  photoUrl.value = await fetchCityPhoto(props.state, props.city);
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
