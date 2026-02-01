<script setup lang="ts">
import { ref } from "vue";
import CitySearch from "../components/CitySearch.vue";
import CityInfoSection from "../components/CityInfoSection.vue";
import HousingSection from "../components/HousingSection.vue";
import IncomeSection from "../components/IncomeSection.vue";
import AffordabilitySection from "../components/AffordabilitySection.vue";

const city = ref("");
const state = ref("");
const hasSearched = ref(false);

function onSearch(payload: { city: string; state: string }) {
  city.value = payload.city;
  state.value = payload.state;
  hasSearched.value = true;
}

</script>

<template>
  <div class="container">
    <h1>Atlas</h1>

    <CitySearch @search="onSearch" />

    <div v-if="hasSearched">
      <CityInfoSection :city="city" :state="state" />
      <HousingSection :city="city" :state="state" />
      <IncomeSection :city="city" :state="state" />
      <AffordabilitySection :city="city" :state="state" />
    </div>

    <div v-if="!hasSearched" class="hero">
      <h2>Understand the cost of living, clearly</h2>
      <p>
        Atlas aggregates public data to help you understand housing,
        income, and affordability across U.S. cities.
      </p>
    </div>

  </div>
</template>
