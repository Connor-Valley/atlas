<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import CitySearch from "../components/CitySearch.vue";
import CityInfoSection from "../components/CityInfoSection.vue";
import HousingSection from "../components/HousingSection.vue";
import IncomeSection from "../components/IncomeSection.vue";
import AffordabilitySection from "../components/AffordabilitySection.vue";

const props = defineProps<{
  state?: string;
  city?: string;
}>();

const route = useRoute();
const router = useRouter();

const city = ref("");
const state = ref("");
const hasSearched = ref(false);

const cityDisplayName = computed(() =>
  city.value.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
);

onMounted(() => {
  if (props.state && props.city) {
    state.value = props.state;
    city.value = props.city;
    hasSearched.value = true;
  }
});

function onSearch(payload: { city: string; state: string }) {
  city.value = payload.city;
  state.value = payload.state;
  hasSearched.value = true;

  if (route.name === 'home') {
    router.replace(`/city/${payload.state}/${payload.city}`);
  }
}

function resetSearch() {
  hasSearched.value = false;
  city.value = '';
  state.value = '';
  router.replace('/');
}
</script>

<template>
  <!-- Before search: full hero landing -->
  <div v-if="!hasSearched" class="hero-landing">
    <div class="hero-content">
      <span class="hero-logo">Atlas</span>
      <h1 class="hero-headline">Compare cities. Make informed decisions.</h1>
      <p class="hero-tagline">
        Atlas aggregates public data to help you understand housing,
        income, and affordability across U.S. cities.
      </p>
      <CitySearch
        :initial-city="city"
        :initial-state="state"
        @search="onSearch"
      />
    </div>
  </div>

  <!-- After search: city data view -->
  <div v-else class="container">
    <header class="site-header">
      <span class="site-logo" @click="resetSearch">Atlas</span>
      <CitySearch
        :initial-city="city"
        :initial-state="state"
        @search="onSearch"
      />
    </header>

    <CityInfoSection :city="city" :state="state" />

    <div class="sections-grid">
      <HousingSection :city="city" :state="state" />
      <IncomeSection :city="city" :state="state" />
      <AffordabilitySection :city="city" :state="state" />

      <!-- Compare Cities CTA card -->
      <div class="section section--accent">
        <div class="section-header-container">
          <div class="section-header">Compare Cities</div>
        </div>
        <div class="section-content">
          <p class="compare-card__desc">
            See how {{ cityDisplayName }} stacks up against other cities across housing, income, and affordability.
          </p>
          <div class="section-footer">
            <button class="section-footer-link" disabled>Coming Soon</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
