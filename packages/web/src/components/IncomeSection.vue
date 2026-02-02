<script setup lang="ts">
  import { ref, watch } from "vue";
  import Section from "./Section.vue";
  import { fetchIncome } from "../api/income";

  const props = defineProps<{ city: string; state: string }>();

  const open = ref(false);

  const data = ref<any>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load() {
    if (!props.city || !props.state) return;

    loading.value = true;
    error.value = null;
    data.value = null;

    try {
      data.value = await fetchIncome(props.state, props.city);
    } catch {
      error.value = "Failed to load income data";
    } finally {
      loading.value = false;
    }
  }

  watch(
    () => [props.city, props.state],
    ([city, state]) => {
      if (!city || !state) return;
      load();
    },
    { immediate: true }
  );
</script>

<template>
  <Section v-model="open" :toggle="true" title="Income">
    <p v-if="loading">Loading…</p>
    <p v-else-if="error">{{ error }}</p>

    <div v-else-if="data" class="stat-grid">
      <div class="stat">
        <label>Median Household Income</label>
        <strong>${{ data.medianHouseholdIncome }}</strong>
      </div>

      <div class="stat">
        <label>Median Renter Income</label>
        <strong>${{ data.medianRenterIncome }}</strong>
      </div>

      <div class="stat">
        <label>Poverty Rate</label>
        <strong>{{ data.povertyRate.toFixed(1) }}%</strong>
      </div>
    </div>
  </Section>
</template>
