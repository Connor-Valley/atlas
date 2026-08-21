<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { getCitiesForState, getStates, type StateOption } from "../api/states";
import { slugToDisplay } from "../lib/compare";

const props = defineProps<{
  label: string;
  caption?: string;
  tone?: "a" | "b";
  initialCity?: string;
  initialState?: string;
  buttonLabel?: string;
  variant?: "card" | "sheet";
}>();

const emit = defineEmits<{
  (e: "search", payload: { city: string; state: string }): void;
}>();

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
const cityInput = ref<HTMLInputElement | null>(null);
const stateClearedOnFocus = ref(false);
const cityClearedOnFocus = ref(false);

watch(() => props.initialCity, (newCity) => {
  const display = newCity ? slugToDisplay(newCity) : "";
  localCity.value = display;
  searchQuery.value = display;
  cityClearedOnFocus.value = false;
});

watch(() => props.initialState, (newState) => {
  if (newState) {
    localState.value = newState;
    const match = states.value.find((state) => state.code === newState);
    if (match) stateQuery.value = match.name;
    void fetchCities();
  } else {
    localState.value = "";
    stateQuery.value = "";
    cities.value = [];
  }
  stateClearedOnFocus.value = false;
});

const filteredStates = computed(() => {
  const query = stateQuery.value.trim().toLowerCase();
  if (!query) return states.value;

  return states.value
    .filter((state) =>
      state.name.toLowerCase().includes(query) ||
      state.code.toLowerCase().startsWith(query),
    )
    .sort((a, b) => {
      const aExact = a.code.toLowerCase() === query;
      const bExact = b.code.toLowerCase() === query;
      if (aExact && !bExact) return -1;
      if (bExact && !aExact) return 1;
      return a.name.localeCompare(b.name);
    });
});

const filteredCities = computed(() => {
  if (!searchQuery.value || searchQuery.value.length < 2) return cities.value.slice(0, 9);

  return cities.value
    .filter((city) => city.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
    .slice(0, 10);
});

onMounted(async () => {
  try {
    states.value = await getStates();
    if (props.initialState) {
      const match = states.value.find((state) => state.code === props.initialState);
      if (match) stateQuery.value = match.name;
    }
  } catch (error) {
    console.error("Failed to load states:", error);
  }

  document.addEventListener("keydown", onDocumentKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", onDocumentKeydown);
});

async function fetchCities() {
  if (!localState.value) {
    cities.value = [];
    return;
  }

  try {
    cities.value = await getCitiesForState(localState.value);
  } catch (error) {
    console.error("Failed to load cities:", error);
    cities.value = [];
  }
}

function onStateInput() {
  localState.value = "";
  showStateSuggestions.value = true;
  highlightedStateIndex.value = -1;
}

function onStateFocus() {
  if (props.variant === "sheet" && !stateClearedOnFocus.value && stateQuery.value) {
    stateQuery.value = "";
    localState.value = "";
    cities.value = [];
    localCity.value = "";
    searchQuery.value = "";
    stateClearedOnFocus.value = true;
    cityClearedOnFocus.value = false;
  }
  showStateSuggestions.value = true;
}

function onStateKeydown(event: KeyboardEvent) {
  const list = filteredStates.value;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (!showStateSuggestions.value) showStateSuggestions.value = true;
    highlightedStateIndex.value = Math.min(highlightedStateIndex.value + 1, list.length - 1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    highlightedStateIndex.value = Math.max(highlightedStateIndex.value - 1, -1);
  } else if (event.key === "Enter") {
    event.preventDefault();
    if (highlightedStateIndex.value >= 0 && list[highlightedStateIndex.value]) {
      selectState(list[highlightedStateIndex.value]);
    } else if (list.length > 0) {
      selectState(list[0]);
    } else if (localState.value) {
      showStateSuggestions.value = false;
    }
    cityInput.value?.focus();
  }
}

function onStateBlur() {
  window.setTimeout(() => {
    showStateSuggestions.value = false;
    highlightedStateIndex.value = -1;

    if (!localState.value && stateQuery.value) {
      const query = stateQuery.value.trim().toLowerCase();
      const match = states.value.find(
        (state) => state.name.toLowerCase() === query || state.code.toLowerCase() === query,
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
}

function selectState(state: StateOption) {
  localState.value = state.code;
  stateQuery.value = state.name;
  showStateSuggestions.value = false;
  highlightedStateIndex.value = -1;
  localCity.value = "";
  searchQuery.value = "";
  void fetchCities();
}

let recentBlurTimer: number | null = null;
const recentlyBlurred = ref(false);

function onInput() {
  searchQuery.value = localCity.value;
  showSuggestions.value = true;
  highlightedCityIndex.value = -1;
}

function onFocus() {
  if (props.variant === "sheet" && !cityClearedOnFocus.value && localCity.value) {
    localCity.value = "";
    searchQuery.value = "";
    cityClearedOnFocus.value = true;
  }
  showSuggestions.value = true;
}

function onBlur() {
  window.setTimeout(() => {
    if (showSuggestions.value && filteredCities.value.length > 0) {
      selectCity(filteredCities.value[0]);
    }
    showSuggestions.value = false;
    highlightedCityIndex.value = -1;
    recentlyBlurred.value = true;
    if (recentBlurTimer !== null) clearTimeout(recentBlurTimer);
    recentBlurTimer = window.setTimeout(() => {
      recentlyBlurred.value = false;
    }, 4000);
  }, 150);
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && recentlyBlurred.value) {
    recentlyBlurred.value = false;
    submit();
  }
}

function onCityKeydown(event: KeyboardEvent) {
  const list = filteredCities.value;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    highlightedCityIndex.value = Math.min(highlightedCityIndex.value + 1, list.length - 1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    highlightedCityIndex.value = Math.max(highlightedCityIndex.value - 1, -1);
  } else if (event.key === "Enter") {
    event.preventDefault();

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
}

function selectCity(city: { name: string; slug: string }) {
  localCity.value = city.name;
  searchQuery.value = city.name;
  showSuggestions.value = false;
  highlightedCityIndex.value = -1;
}

function cityToSlug(city: string) {
  return city.trim().toLowerCase().replace(/\s+/g, "-");
}

function submit() {
  if (!localCity.value || !localState.value) return;

  emit("search", {
    city: cityToSlug(localCity.value),
    state: localState.value.trim().toUpperCase(),
  });
}

watch(() => localState.value, () => {
  void fetchCities();
}, { immediate: true });
</script>

<template>
  <section
    class="compare-search-card"
    :class="[
      `compare-search-card--${tone ?? 'a'}`,
      `compare-search-card--${props.variant ?? 'card'}`,
    ]"
  >
    <div class="compare-search-card__header">
      <span class="compare-search-card__label">{{ label }}</span>
      <span v-if="caption" class="compare-search-card__caption">{{ caption }}</span>
    </div>

    <div class="search-bar compare-search-card__bar">
      <div class="state-search-container">
        <input
          v-model="stateQuery"
          @input="onStateInput"
          @focus="onStateFocus"
          @blur="onStateBlur"
          @keydown="onStateKeydown"
          placeholder="State"
          autocomplete="off"
        />
        <ul v-if="showStateSuggestions && filteredStates.length > 0" class="state-suggestions">
          <li
            v-for="(state, index) in filteredStates"
            :key="state.code"
            :class="{ 'state-suggestions__item--highlighted': index === highlightedStateIndex }"
            @mousedown.prevent="selectState(state)"
          >
            <span class="state-suggestions__name">{{ state.name }}</span>
            <span class="state-suggestions__code">{{ state.code }}</span>
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
            v-for="(city, index) in filteredCities"
            :key="city.slug"
            :class="{ 'city-suggestions__item--highlighted': index === highlightedCityIndex }"
            @mousedown.prevent="selectCity(city)"
          >
            {{ city.name }}
          </li>
        </ul>
      </div>

      <button @click="submit"><span class="mdi mdi-plus compare-search-card__btn-icon"></span>{{ buttonLabel ?? "Set City" }}</button>
    </div>
  </section>
</template>

<style scoped>
.compare-search-card {
  padding: 18px;
  border: 1px solid var(--border-card);
  border-radius: 16px;
  background: var(--bg-card);
  box-shadow: var(--card-shadow);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.compare-search-card:hover {
  transform: translateY(-2px);
}

.compare-search-card--a {
  border-color: color-mix(in srgb, var(--compare-city-a) 28%, var(--border-card));
  background: linear-gradient(160deg, color-mix(in srgb, var(--compare-city-a) 8%, var(--bg-card)) 0%, var(--bg-card) 60%);
  box-shadow: var(--card-shadow), 0 0 20px color-mix(in srgb, var(--compare-city-a) 8%, transparent);
}

.compare-search-card--a:hover {
  box-shadow: var(--card-shadow-hover), 0 0 28px color-mix(in srgb, var(--compare-city-a) 14%, transparent);
}

.compare-search-card--b {
  border-color: color-mix(in srgb, var(--compare-city-b) 28%, var(--border-card));
  background: linear-gradient(160deg, color-mix(in srgb, var(--compare-city-b) 8%, var(--bg-card)) 0%, var(--bg-card) 60%);
  box-shadow: var(--card-shadow), 0 0 20px color-mix(in srgb, var(--compare-city-b) 8%, transparent);
}

.compare-search-card--b:hover {
  box-shadow: var(--card-shadow-hover), 0 0 28px color-mix(in srgb, var(--compare-city-b) 14%, transparent);
}

.compare-search-card__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
}

.compare-search-card__label {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.compare-search-card--a .compare-search-card__label {
  color: var(--compare-city-a);
}

.compare-search-card--b .compare-search-card__label {
  color: var(--compare-city-b);
}

.compare-search-card__caption {
  font-size: 0.84rem;
  color: var(--text-muted);
}

.compare-search-card__bar {
  margin-bottom: 0;
  padding: 0;
  border: none;
  box-shadow: none;
  background: transparent;
}

.compare-search-card--a :deep(input) {
  border-color: color-mix(in srgb, var(--compare-city-a) 35%, var(--border-card));
  background-color: color-mix(in srgb, var(--compare-city-a) 7%, var(--bg-input));
}

.compare-search-card--b :deep(input) {
  border-color: color-mix(in srgb, var(--compare-city-b) 35%, var(--border-card));
  background-color: color-mix(in srgb, var(--compare-city-b) 7%, var(--bg-input));
}

.compare-search-card--a :deep(input:focus) {
  border-color: var(--compare-city-a);
}

.compare-search-card--b :deep(input:focus) {
  border-color: var(--compare-city-b);
}

.compare-search-card--a button {
  background: var(--compare-city-a);
}

.compare-search-card--a button:hover {
  background: color-mix(in srgb, var(--compare-city-a) 82%, black);
}

.compare-search-card--b button {
  background: var(--compare-city-b);
  color: #fff;
}

.compare-search-card--b button:hover {
  background: color-mix(in srgb, var(--compare-city-b) 82%, black);
  color: #fff;
}

.compare-search-card__btn-icon {
  font-size: 0.85rem;
  opacity: 0.85;
  margin-right: 5px;
}

.compare-search-card--sheet {
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.compare-search-card--sheet .compare-search-card__header {
  margin-bottom: 10px;
}

.compare-search-card--sheet .compare-search-card__label {
  font-size: 0.88rem;
  letter-spacing: 0.06em;
}

.compare-search-card--sheet :deep(.search-bar) {
  gap: 8px;
  padding: 0;
  margin-bottom: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.compare-search-card--sheet :deep(.search-bar > button) {
  width: 100%;
  min-height: 50px;
  border-radius: 12px;
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  border: 1px solid color-mix(in srgb, white 36%, var(--border-card));
  box-shadow:
    0 12px 24px rgba(15, 23, 42, 0.16),
    0 0 0 1px rgba(255, 255, 255, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.compare-search-card--a.compare-search-card--sheet :deep(.search-bar > button) {
  background: color-mix(in srgb, var(--compare-city-a) 18%, var(--bg-card));
  border-color: color-mix(in srgb, var(--compare-city-a) 60%, var(--border-card));
  color: var(--text-primary);
}

.compare-search-card--b.compare-search-card--sheet :deep(.search-bar > button) {
  background: color-mix(in srgb, var(--compare-city-b) 16%, var(--bg-card));
  border-color: color-mix(in srgb, var(--compare-city-b) 55%, var(--border-card));
  color: var(--text-primary);
}

.compare-search-card--sheet :deep(.search-bar > button:hover) {
  filter: brightness(1.06);
}

@media (max-width: 640px) {
  .compare-search-card {
    padding: 16px;
    border-radius: 18px;
  }

  .compare-search-card__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .compare-search-card--sheet {
    padding: 0;
  }
}
</style>
