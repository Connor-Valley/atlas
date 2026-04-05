<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import CompareCitySearch from "../components/CompareCitySearch.vue";
import CompareSection from "../components/CompareSection.vue";
import SiteHeader from "../components/SiteHeader.vue";
import { fetchAffordability } from "../api/affordability";
import { fetchCity } from "../api/cities";
import { fetchHousing } from "../api/housing";
import { fetchIncome } from "../api/income";
import { fetchCityPhoto } from "../lib/cityPhotos";
import {
  buildSections,
  buildSummaryCards,
  calculateScores,
  cityLabel,
  slugToDisplay,
  type ComparedCity,
} from "../lib/compare";

const props = defineProps<{
  stateA: string;
  cityA: string;
  stateB?: string;
  cityB?: string;
}>();

const router = useRouter();
const loading = ref(false);
const error = ref<string | null>(null);
const comparison = ref<{ a: ComparedCity; b: ComparedCity } | null>(null);
let requestToken = 0;

const hasCityB = computed(() => Boolean(props.stateB && props.cityB));
const compareReady = computed(() => Boolean(props.stateA && props.cityA && props.stateB && props.cityB));
const summaryCards = computed(() => {
  if (!comparison.value) return [];
  return buildSummaryCards(comparison.value.a, comparison.value.b);
});
const sections = computed(() => {
  if (!comparison.value) return [];
  return buildSections(comparison.value.a, comparison.value.b);
});
const cityInfoCards = computed(() => {
  if (!comparison.value) return [];
  return [
    {
      key: "a",
      label: "City A",
      name: comparison.value.a.cityInfo.name,
      state: comparison.value.a.state.toUpperCase(),
      population: comparison.value.a.cityInfo.population.toLocaleString(),
      photoUrl: comparison.value.a.cityInfo.photoUrl,
    },
    {
      key: "b",
      label: "City B",
      name: comparison.value.b.cityInfo.name,
      state: comparison.value.b.state.toUpperCase(),
      population: comparison.value.b.cityInfo.population.toLocaleString(),
      photoUrl: comparison.value.b.cityInfo.photoUrl,
    },
  ];
});
const tickerItems = computed(() => {
  if (!hasCityB.value) {
    return [
      "Pick City B",
      "Run the matchup",
      "Atlas compare mode",
      "Find the better fit",
      "Compare the tradeoffs",
      "Two cities, one call",
    ];
  }

  if (!comparison.value) {
    return ["Loading comparison", "Crunching the metrics", "Lining up the matchup"];
  }

  const a = comparison.value.a;
  const b = comparison.value.b;
  const incomeLead = Math.abs(a.scores.income - b.scores.income);
  const affordabilityLead = Math.abs(a.scores.affordability - b.scores.affordability);
  const rentDelta = Math.abs(a.housing.housing.medianRent - b.housing.housing.medianRent);
  const populationDelta = Math.abs(a.cityInfo.population - b.cityInfo.population);
  const cheaperCity =
    a.housing.housing.medianRent <= b.housing.housing.medianRent ? slugToDisplay(a.city) : slugToDisplay(b.city);
  const incomeCity =
    a.scores.income >= b.scores.income ? slugToDisplay(a.city) : slugToDisplay(b.city);
  const affordabilityCity =
    a.scores.affordability >= b.scores.affordability ? slugToDisplay(a.city) : slugToDisplay(b.city);
  const largerCity =
    a.cityInfo.population >= b.cityInfo.population ? slugToDisplay(a.city) : slugToDisplay(b.city);

  return [
    `${incomeCity} leads income by ${incomeLead} pts`,
    `${cheaperCity} rent is $${Math.round(rentDelta).toLocaleString()} lower`,
    `${affordabilityCity} leads affordability by ${affordabilityLead} pts`,
    `${largerCity} population +${populationDelta.toLocaleString()}`,
    `${cityLabel(props.cityA, props.stateA)} vs ${cityLabel(props.cityB!, props.stateB!)}`,
  ];
});

async function loadComparedCity(key: "a" | "b", state: string, city: string): Promise<ComparedCity> {
  const [cityInfo, income, housing, affordability, photoUrl] = await Promise.all([
    fetchCity(state, city),
    fetchIncome(state, city),
    fetchHousing(state, city),
    fetchAffordability(state, city),
    fetchCityPhoto(state, city),
  ]);

  return {
    key,
    city,
    state,
    cityInfo: {
      ...cityInfo,
      photoUrl,
    },
    income,
    housing,
    affordability,
    scores: calculateScores(cityInfo, income, housing, affordability),
  };
}

async function loadComparison() {
  if (!compareReady.value) {
    comparison.value = null;
    error.value = null;
    return;
  }

  const token = ++requestToken;
  loading.value = true;
  error.value = null;

  try {
    const [a, b] = await Promise.all([
      loadComparedCity("a", props.stateA, props.cityA),
      loadComparedCity("b", props.stateB!, props.cityB!),
    ]);

    if (token !== requestToken) return;
    comparison.value = { a, b };
  } catch (err) {
    if (token !== requestToken) return;

    comparison.value = null;
    const message = err instanceof Error ? err.message : "Failed to load comparison data";
    error.value = message;
  } finally {
    if (token === requestToken) {
      loading.value = false;
    }
  }
}

watch(
  () => [props.stateA, props.cityA, props.stateB, props.cityB],
  () => {
    void loadComparison();
  },
  { immediate: true },
);

function goBack() {
  router.push({
    name: "city",
    params: {
      state: props.stateA,
      city: props.cityA,
    },
  });
}

function resetToHome() {
  router.push({ name: "home" });
}

function updateRoute(params: { stateA: string; cityA: string; stateB?: string; cityB?: string }) {
  router.replace({
    name: "compare",
    params,
  });
}

function updateCityA(payload: { city: string; state: string }) {
  updateRoute({
    stateA: payload.state,
    cityA: payload.city,
    stateB: props.stateB,
    cityB: props.cityB,
  });
}

function updateCityB(payload: { city: string; state: string }) {
  updateRoute({
    stateA: props.stateA,
    cityA: props.cityA,
    stateB: payload.state,
    cityB: payload.city,
  });
}
</script>

<template>
  <div class="container compare-view">
    <SiteHeader :show-theme-toggle="true" @logo-click="resetToHome">
      <template #leading>
        <button class="breadcrumb compare-view__back" @click="goBack">
          <span class="breadcrumb__arr breadcrumb__arr--1 mdi mdi-arrow-left"></span>
          <span class="breadcrumb__text">Back</span>
          <span class="breadcrumb__arr breadcrumb__arr--2 mdi mdi-arrow-left"></span>
          <span class="breadcrumb__circle"></span>
        </button>
      </template>
      <template #title>
        <h1 class="compare-view__page-title">City Comparison</h1>
      </template>
    </SiteHeader>

    <section class="compare-ticker" :class="{ 'compare-ticker--placeholder': !hasCityB }" aria-label="Comparison ticker">
      <div class="compare-ticker__track">
        <span v-for="(item, index) in [...tickerItems, ...tickerItems]" :key="`${index}-${item}`" class="compare-ticker__item">
          {{ item }}
        </span>
      </div>
      <div class="compare-ticker__overlay" aria-hidden="true"></div>
    </section>

    <section class="compare-view__setup">
      <CompareCitySearch
        label="Choose City"
        tone="a"
        :initial-city="cityA"
        :initial-state="stateA"
        button-label="Add"
        @search="updateCityA"
      />
      <CompareCitySearch
        label="Choose City"
        tone="b"
        :initial-city="cityB"
        :initial-state="stateB"
        button-label="Add"
        @search="updateCityB"
      />
    </section>

    <div class="compare-view__divider" aria-hidden="true"></div>

    <section v-if="!hasCityB" class="compare-empty">
      <div class="compare-empty__icon-wrap">
        <span class="mdi mdi-map-search compare-empty__icon"></span>
      </div>
      <div class="compare-empty__content">
        <h2 class="compare-empty__title">Choose a second city to begin</h2>
        <p class="compare-empty__body">
          City A is already loaded from the dashboard. Add City B to unlock the verdict cards, tradeoff insights, and side-by-side metric comparisons.
        </p>
      </div>
    </section>

    <section v-else-if="loading" class="compare-loading">
      <div v-for="card in 5" :key="card" class="compare-loading__card"></div>
    </section>

    <section v-else-if="error" class="compare-error">
      <span class="mdi mdi-alert-circle-outline compare-error__icon"></span>
      <div>
        <h2 class="compare-error__title">Comparison data could not be loaded</h2>
        <p class="compare-error__body">{{ error }}</p>
      </div>
    </section>

    <template v-else-if="comparison">
      <section class="compare-key-diff">
        <div class="compare-key-diff__header">
          <span class="mdi mdi-lightbulb-on-outline compare-key-diff__icon"></span>
          <h2 class="compare-key-diff__title">Key Differences</h2>
        </div>
        <div class="compare-key-diff__items">
          <template v-for="(card, i) in summaryCards" :key="card.title">
            <div v-if="i > 0" class="compare-key-diff__divider"></div>
            <div class="compare-key-diff__item">
              <div class="compare-key-diff__label">{{ card.label }}</div>
              <p class="compare-key-diff__sentence">
                {{ card.sentence.before }}<span class="compare-key-diff__highlight" :class="`compare-key-diff__highlight--${card.winner}`">{{ card.sentence.value }}</span>{{ card.sentence.after }}
              </p>
            </div>
          </template>
        </div>
      </section>

      <section class="compare-city-info">
        <article
          v-for="card in cityInfoCards"
          :key="card.key"
          class="compare-city-info__card"
          :class="`compare-city-info__card--${card.key}`"
        >
          <div class="compare-city-info__thumb">
            <img v-if="card.photoUrl" :src="card.photoUrl" class="compare-city-info__photo" alt="" />
            <div v-else class="compare-city-info__photo-fallback"></div>
            <span class="compare-city-info__badge" :class="`compare-city-info__badge--${card.key}`">{{ card.key.toUpperCase() }}</span>
          </div>
          <div class="compare-city-info__body">
            <div class="compare-city-info__name">{{ card.name }}</div>
            <div class="compare-city-info__state">{{ card.state }}</div>
            <div class="compare-city-info__stat">
              <span class="compare-city-info__stat-label">Population</span>
              <span class="compare-city-info__stat-value">{{ card.population }}</span>
            </div>
          </div>
        </article>
      </section>

      <section class="compare-sections">
        <CompareSection
          v-for="section in sections"
          :key="section.id"
          :section="section"
          :city-a="cityA"
          :state-a="stateA"
          :city-b="cityB!"
          :state-b="stateB!"
        />
      </section>
    </template>
  </div>
</template>
