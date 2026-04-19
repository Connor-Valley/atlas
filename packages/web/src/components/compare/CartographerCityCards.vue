<script setup lang="ts">
import { computed } from "vue";
import type { ComparedCity } from "../../lib/compare";

const props = defineProps<{
  cityA: ComparedCity;
  cityB: ComparedCity;
}>();

// Topo ring sizes for visual effect
const topoRings = [280, 200, 135, 82, 46, 22];

function formatCoordDecimal(lat: number | null, lon: number | null): string {
  if (lat == null || lon == null) return "—";
  return `${lat.toFixed(4)}°N  ${lon.toFixed(4)}°W`;
}

function formatCurrency(v: number | null | undefined): string {
  if (v == null) return "—";
  return `$${Math.round(v).toLocaleString()}`;
}

function formatPercent(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

const cardData = computed(() => [
  {
    key: "a",
    tone: "a",
    city: props.cityA,
    stats: buildStats(props.cityA),
  },
  {
    key: "b",
    tone: "b",
    city: props.cityB,
    stats: buildStats(props.cityB),
  },
]);

function buildStats(city: ComparedCity) {
  const metroArea = city.cityProfile?.metroArea ?? null;
  const unemployment = city.qualityOfLife?.unemploymentRate?.value ?? null;
  return [
    { label: "Population", value: city.cityInfo.population?.toLocaleString() ?? "—" },
    { label: "Metro", value: metroArea ?? "—" },
    { label: "Median HH Income", value: formatCurrency(city.income.medianHouseholdIncome) },
    { label: "Median Rent", value: city.housing.housing.medianRent != null ? `$${Math.round(city.housing.housing.medianRent).toLocaleString()}/mo` : "—" },
    { label: "Rent-to-Income", value: formatPercent(city.affordability.rentToIncomeRatio) },
    ...(unemployment != null ? [{ label: "Unemployment", value: `${(unemployment * 100).toFixed(1)}%` }] : []),
    { label: "Walk Score", value: "—" },
    { label: "Sunny Days", value: "—" },
  ];
}
</script>

<template>
  <div class="cart-city-cards">
    <div
      v-for="card in cardData"
      :key="card.key"
      class="cart-city-card"
    >
      <!-- Topo map placeholder -->
      <div class="cart-city-card__map" :class="`cart-city-card__map--${card.tone}`">
        <div class="cart-city-card__topo">
          <div
            v-for="(size, i) in topoRings"
            :key="i"
            class="cart-city-card__topo-ring"
            :style="{ width: `${size}px`, height: `${size * 0.55}px` }"
          ></div>
        </div>
        <div class="cart-city-card__map-name">
          <span class="cart-city-card__map-city">{{ card.city.cityInfo.name }}</span>
          <span class="cart-city-card__map-state">{{ card.city.state.toUpperCase() }}</span>
        </div>
        <div class="cart-city-card__dot"></div>
        <div class="cart-city-card__map-footer">
          <span class="cart-city-card__map-footer-label">
            {{ formatCoordDecimal(card.city.cityInfo.lat, card.city.cityInfo.lon) }}
          </span>
          <span class="cart-city-card__map-footer-label">ELEV —</span>
        </div>
      </div>

      <!-- Stats -->
      <div class="cart-city-card__dossier-id">
        <span>DOSSIER · {{ card.key.toUpperCase() }}</span>
        <span></span>
      </div>
      <div class="cart-city-card__stats">
        <div
          v-for="stat in card.stats"
          :key="stat.label"
          class="cart-city-card__stat-row"
        >
          <span class="cart-city-card__stat-label">{{ stat.label }}</span>
          <span class="cart-city-card__stat-value">{{ stat.value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
