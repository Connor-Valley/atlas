<script setup lang="ts">
import { ref } from "vue";

const emit = defineEmits<{
  (e: "search", payload: { city: string; state: string }): void;
}>();

const localCity = ref("");
const localState = ref("");

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
    <input v-model="localState" placeholder="State (CA)" maxlength="2" />
    <input v-model="localCity" placeholder="City (Los Angeles)" />
    <button @click="submit">Search</button>
  </div>
</template>
