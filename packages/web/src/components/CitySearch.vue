<script setup lang="ts">
import {onMounted, ref} from "vue";
import { getStates, type StateOption } from "../api/states";

const emit = defineEmits<{
  (e: "search", payload: { city: string; state: string }): void;
}>();

const localCity = ref("");
const localState = ref("");
const states = ref<StateOption[]>([]);

onMounted(async () => {
  try {
    states.value = await getStates();
  } catch (error) {
    console.error('Failed to load states:', error);
  }
});

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
</script>

<template>
  <div class="search-bar">
    <select v-model="localState">
      <option value="" disabled selected>Select State</option>
      <option v-for="state in states" :key="state.code" :value="state.code">
        {{ state.name }} ({{ state.code }})
      </option>
    </select>
    <input v-model="localCity" placeholder="City (Los Angeles)" />
    <button @click="submit">Search</button>
  </div>
</template>
