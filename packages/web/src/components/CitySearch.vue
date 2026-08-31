<script setup lang="ts">
import {onMounted, onUnmounted, ref, computed, watch} from "vue";
import { getStates, type StateOption, getCitiesForState } from "../api/states";

const props = defineProps<{
  initialCity?: string;
  initialState?: string;
  compact?: boolean;
}>();

const emit = defineEmits<{
  (e: "search", payload: { city: string; state: string }): void;
}>();

function slugToDisplay(slug: string) {
  return slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const localCity = ref(slugToDisplay(props.initialCity || ""));
const localState = ref(props.initialState || "");
const stateQuery = ref("");
const showStateSuggestions = ref(false);
const highlightedStateIndex = ref(-1);
const states = ref<StateOption[]>([]);
const cities = ref<{ name: string; slug: string }[]>([]);
const searchQuery = ref(slugToDisplay(props.initialCity || ""));
const showSuggestions = ref(false);
const highlightedCityIndex = ref(-1);

// Watch for changes in initial props
watch(() => props.initialCity, (newCity) => {
  if (newCity) {
    const display = slugToDisplay(newCity);
    localCity.value = display;
    searchQuery.value = display;
  } else {
    localCity.value = "";
    searchQuery.value = "";
  }
});

watch(() => props.initialState, (newState) => {
  if (newState) {
    localState.value = newState;
    const match = states.value.find(s => s.code === newState);
    if (match) stateQuery.value = match.name;
    fetchCities();
  } else {
    localState.value = "";
    stateQuery.value = "";
    cities.value = [];
  }
});

const filteredStates = computed(() => {
  const q = stateQuery.value.trim().toLowerCase();
  if (!q) return states.value;
  return states.value
    .filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().startsWith(q)
    )
    .sort((a, b) => {
      const aExact = a.code.toLowerCase() === q;
      const bExact = b.code.toLowerCase() === q;
      if (aExact && !bExact) return -1;
      if (bExact && !aExact) return 1;
      return a.name.localeCompare(b.name);
    });
});

const filteredCities = computed(() => {
  if (!searchQuery.value || searchQuery.value.length < 2) return cities.value.slice(0, 9);
  return cities.value
      .filter(city =>
          city.name.toLowerCase().includes(searchQuery.value.toLowerCase())
      );
});

onMounted(async () => {
  try {
    states.value = await getStates();
    if (props.initialState) {
      const match = states.value.find(s => s.code === props.initialState);
      if (match) stateQuery.value = match.name;
    }
  } catch (error) {
    console.error('Failed to load states:', error);
  }
});

const fetchCities = async () => {
  if (!localState.value) return;
  try {
    cities.value = await getCitiesForState(localState.value);
  } catch (error) {
    console.error('Failed to load states:', error);
    cities.value = [];
  }
};

// ── State autocomplete ─────────────────────────────────────────────────────

const onStateInput = () => {
  localState.value = "";
  showStateSuggestions.value = true;
  highlightedStateIndex.value = -1;
};

const onStateFocus = () => {
  showStateSuggestions.value = true;
};

const cityInput = ref<HTMLInputElement | null>(null);

const onStateKeydown = (e: KeyboardEvent) => {
  const list = filteredStates.value;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (!showStateSuggestions.value) showStateSuggestions.value = true;
    highlightedStateIndex.value = Math.min(highlightedStateIndex.value + 1, list.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    highlightedStateIndex.value = Math.max(highlightedStateIndex.value - 1, -1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (highlightedStateIndex.value >= 0 && list[highlightedStateIndex.value]) {
      selectState(list[highlightedStateIndex.value]);
    } else if (list.length > 0) {
      selectState(list[0]);
    } else if (localState.value) {
      showStateSuggestions.value = false;
    }
    cityInput.value?.focus();
  }
};

const onStateBlur = () => {
  setTimeout(() => {
    showStateSuggestions.value = false;
    highlightedStateIndex.value = -1;
    if (!localState.value && stateQuery.value) {
      const q = stateQuery.value.trim().toLowerCase();
      const match = states.value.find(
        s => s.name.toLowerCase() === q || s.code.toLowerCase() === q
      );
      if (match) {
        selectState(match);
      } else if (filteredStates.value.length > 0) {
        selectState(filteredStates.value[0]);
      } else {
        stateQuery.value = "";
      }
    }
  }, 150);
};

const selectState = (s: StateOption) => {
  localState.value = s.code;
  stateQuery.value = s.name;
  showStateSuggestions.value = false;
  highlightedStateIndex.value = -1;
  localCity.value = "";
  searchQuery.value = "";
  fetchCities();
};

// ── City autocomplete ──────────────────────────────────────────────────────

let debounceTimer: number;

const onInput = () => {
  searchQuery.value = localCity.value;
  showSuggestions.value = true;
  highlightedCityIndex.value = -1;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {}, 300);
};

const onFocus = () => {
  showSuggestions.value = true;
};

let recentBlurTimer: number | null = null;
const recentlyBlurred = ref(false);

const onBlur = () => {
  setTimeout(() => {
    if (showSuggestions.value && filteredCities.value.length > 0) {
      selectCity(filteredCities.value[0]);
    }
    showSuggestions.value = false;
    highlightedCityIndex.value = -1;
    recentlyBlurred.value = true;
    if (recentBlurTimer !== null) clearTimeout(recentBlurTimer);
    recentBlurTimer = setTimeout(() => { recentlyBlurred.value = false; }, 4000);
  }, 150);
};

const onDocumentKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && recentlyBlurred.value) {
    recentlyBlurred.value = false;
    submit();
  }
};

onMounted(() => { document.addEventListener('keydown', onDocumentKeydown); });
onUnmounted(() => { document.removeEventListener('keydown', onDocumentKeydown); });

const onCityKeydown = (e: KeyboardEvent) => {
  const list = filteredCities.value;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    highlightedCityIndex.value = Math.min(highlightedCityIndex.value + 1, list.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    highlightedCityIndex.value = Math.max(highlightedCityIndex.value - 1, -1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (!showSuggestions.value) {
      submit();
      return;
    }
    if (highlightedCityIndex.value >= 0 && list[highlightedCityIndex.value]) {
      selectCity(list[highlightedCityIndex.value]);
    } else if (list.length > 0) {
      selectCity(list[0]);
    } else {
      submit();
    }
  }
};

const selectCity = (city: { name: string; slug: string }) => {
  localCity.value = city.name;
  searchQuery.value = city.name;
  showSuggestions.value = false;
  highlightedCityIndex.value = -1;
};

function cityToSlug(city: string) {
  return city.trim().toLowerCase().replace(/\s+/g, "-");
}

function submit() {
  if (!localCity.value || !localState.value) return;

  const typed = localCity.value.trim().toLowerCase();
  const matched = cities.value.find((c) => c.name.trim().toLowerCase() === typed);

  emit("search", {
    city: matched?.slug ?? cityToSlug(localCity.value),
    state: localState.value.trim().toUpperCase(),
  });
}

watch(() => localState.value, fetchCities, { immediate: true });
</script>

<template>
  <div class="search-bar" :class="{ 'search-bar--compact': compact }">
    <div class="state-search-container">
      <input
        v-model="stateQuery"
        @input="onStateInput"
        @focus="onStateFocus"
        @blur="onStateBlur"
        @keydown="onStateKeydown"
        placeholder="Select State"
        autocomplete="off"
      />
      <ul v-if="showStateSuggestions && filteredStates.length > 0" class="state-suggestions">
        <li
          v-for="(s, i) in filteredStates"
          :key="s.code"
          :class="{ 'state-suggestions__item--highlighted': i === highlightedStateIndex }"
          @mousedown.prevent="selectState(s)"
        >
          <span class="state-suggestions__name">{{ s.name }}</span><span class="state-suggestions__code">{{ s.code }}</span>
        </li>
      </ul>
    </div>
    <div class="city-search-container">
      <input
          ref="cityInput"
          v-model="localCity"
          @input="onInput"
          @focus="onFocus"
          @blur="onBlur"
          @keydown="onCityKeydown"
          placeholder="Search cities..."
          :disabled="!localState"
      />
      <ul v-if="showSuggestions && filteredCities.length > 0" class="city-suggestions">
        <li
          v-for="(city, i) in filteredCities"
          :key="city.slug"
          :class="{ 'city-suggestions__item--highlighted': i === highlightedCityIndex }"
          @mousedown.prevent="selectCity(city)"
        >
          {{ city.name }}
        </li>
      </ul>
    </div>
    <button class="search-bar__submit" :class="{ 'search-bar__submit--icon': compact }" @click="submit" :aria-label="compact ? 'Search' : undefined">
      <span v-if="compact" class="mdi mdi-magnify"></span>
      <span v-else>Search</span>
    </button>
  </div>
</template>
