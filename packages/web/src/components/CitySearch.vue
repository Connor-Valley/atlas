<script setup lang="ts">
import {onMounted, ref, computed, watch} from "vue";
import { getStates, type StateOption, getCitiesForState } from "../api/states";

const emit = defineEmits<{
  (e: "search", payload: { city: string; state: string }): void;
}>();

const localCity = ref("");
const localState = ref("");
const states = ref<StateOption[]>([]);
const cities = ref<{ name: string; slug: string }[]>([]);
const searchQuery = ref("");
const showSuggestions = ref(false);

const filteredCities = computed(() => {
  if (!searchQuery.value || searchQuery.value.length < 2) return [];
  return cities.value
      .filter(city =>
          city.name.toLowerCase().includes(searchQuery.value.toLowerCase())
      )
      .slice(0, 10);
});

onMounted(async () => {
  try {
    states.value = await getStates();
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

let debounceTimer: number;

const onInput = () => {
  searchQuery.value = localCity.value;
  showSuggestions.value = true;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {

  }, 300);
};

const onFocus = () => {
  if (localCity.value.length >= 2) {
    showSuggestions.value = true;
  }
};

const onBlur = () => {
  // Delay hiding suggestions to allow click events to register
  setTimeout(() => {
    showSuggestions.value = false;
  }, 150);
};

const selectCity = (city: { name: string; slug: string }) => {
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

watch(() => localState.value, fetchCities);
</script>

<template>
  <div class="search-bar">
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
    <button @click="submit">Search</button>
  </div>
</template>
