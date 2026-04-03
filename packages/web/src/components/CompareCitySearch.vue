<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { getCitiesForState, getStates, type StateOption } from "../api/states";
import { slugToDisplay } from "../lib/compare";

const props = defineProps<{
  label: string;
  caption: string;
  tone?: "a" | "b";
  initialCity?: string;
  initialState?: string;
  buttonLabel?: string;
}>();

const emit = defineEmits<{
  (e: "search", payload: { city: string; state: string }): void;
}>();

const localCity = ref(slugToDisplay(props.initialCity || ""));
const localState = ref(props.initialState || "");
const states = ref<StateOption[]>([]);
const cities = ref<{ name: string; slug: string }[]>([]);
const searchQuery = ref(slugToDisplay(props.initialCity || ""));
const showSuggestions = ref(false);

watch(() => props.initialCity, (newCity) => {
  const display = newCity ? slugToDisplay(newCity) : "";
  localCity.value = display;
  searchQuery.value = display;
});

watch(() => props.initialState, (newState) => {
  localState.value = newState || "";
  if (newState) {
    void fetchCities();
  } else {
    cities.value = [];
  }
});

const filteredCities = computed(() => {
  if (!searchQuery.value || searchQuery.value.length < 2) return [];
  return cities.value
    .filter((city) => city.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
    .slice(0, 10);
});

onMounted(async () => {
  states.value = await getStates();
});

async function fetchCities() {
  if (!localState.value) {
    cities.value = [];
    return;
  }

  try {
    cities.value = await getCitiesForState(localState.value);
  } catch {
    cities.value = [];
  }
}

function onInput() {
  searchQuery.value = localCity.value;
  showSuggestions.value = true;
}

function onFocus() {
  if (localCity.value.length >= 2) {
    showSuggestions.value = true;
  }
}

function onBlur() {
  setTimeout(() => {
    showSuggestions.value = false;
  }, 150);
}

function selectCity(city: { name: string; slug: string }) {
  localCity.value = city.name;
  searchQuery.value = city.name;
  showSuggestions.value = false;
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
  <section class="compare-search-card" :class="`compare-search-card--${tone ?? 'a'}`">
    <div class="compare-search-card__header">
      <span class="compare-search-card__label">{{ label }}</span>
      <span class="compare-search-card__caption">{{ caption }}</span>
    </div>

    <div class="search-bar compare-search-card__bar">
      <select v-model="localState">
        <option value="" disabled selected>Select State</option>
        <option v-for="state in states" :key="state.code" :value="state.code">
          {{ state.name }} ({{ state.code }})
        </option>
      </select>

      <div class="city-search-container">
        <input
          v-model="localCity"
          @input="onInput"
          @focus="onFocus"
          @blur="onBlur"
          placeholder="Search cities..."
        />
        <ul v-if="showSuggestions && filteredCities.length > 0" class="city-suggestions">
          <li v-for="city in filteredCities" :key="city.slug" @click="selectCity(city)">
            {{ city.name }}
          </li>
        </ul>
      </div>

      <button @click="submit">{{ buttonLabel ?? "Set City" }}</button>
    </div>
  </section>
</template>

<style scoped>
.compare-search-card {
  padding: 18px;
  border: 1px solid var(--border-card);
  border-radius: 20px;
  background: var(--bg-card);
  box-shadow: var(--card-shadow);
}

.compare-search-card--a {
  border-color: color-mix(in srgb, var(--compare-city-a) 34%, var(--border-card));
  background: linear-gradient(180deg, color-mix(in srgb, var(--compare-city-a) 10%, var(--bg-card)) 0%, var(--bg-card) 100%);
}

.compare-search-card--b {
  border-color: color-mix(in srgb, var(--compare-city-b) 34%, var(--border-card));
  background: linear-gradient(180deg, color-mix(in srgb, var(--compare-city-b) 10%, var(--bg-card)) 0%, var(--bg-card) 100%);
}

.compare-search-card__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
}

.compare-search-card__label {
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.03em;
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

.compare-search-card--a :deep(select),
.compare-search-card--a :deep(input) {
  border-color: color-mix(in srgb, var(--compare-city-a) 35%, var(--border-card));
  background-color: color-mix(in srgb, var(--compare-city-a) 7%, var(--bg-input));
}

.compare-search-card--b :deep(select),
.compare-search-card--b :deep(input) {
  border-color: color-mix(in srgb, var(--compare-city-b) 35%, var(--border-card));
  background-color: color-mix(in srgb, var(--compare-city-b) 7%, var(--bg-input));
}

.compare-search-card--a :deep(input:focus),
.compare-search-card--a :deep(select:focus) {
  border-color: var(--compare-city-a);
}

.compare-search-card--b :deep(input:focus),
.compare-search-card--b :deep(select:focus) {
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
  color: #062824;
}

.compare-search-card--b button:hover {
  background: color-mix(in srgb, var(--compare-city-b) 82%, black);
  color: #041c19;
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
}
</style>
