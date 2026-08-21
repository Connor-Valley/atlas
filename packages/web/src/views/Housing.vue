<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { fetchDetailedHousing } from "../api/housing";
import { mdiOfficeBuildingOutline } from "@mdi/js";
import DashboardHeader from "../components/DashboardHeader.vue";
import { useRecentSearches } from "../composables/useRecentSearches";

const props = defineProps<{
  state: string;
  city: string;
}>();

const router = useRouter();
const { recordRecentSearch } = useRecentSearches();

function onHeaderSearch(payload: { city: string; state: string }) {
  void recordRecentSearch(payload.city, payload.state);
  router.push(`/city/${payload.state}/${payload.city}`);
}

const data = ref<any>(null);
const loading = ref(false);
const error = ref<string | null>(null);

async function loadDetailedHousing() {
  loading.value = true;
  error.value = null;
  data.value = null;

  try {
    data.value = await fetchDetailedHousing(props.state, props.city);
  } catch (err) {
    error.value = "Failed to load detailed housing data";
    console.error(err);
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.push({
    name: 'city',
    params: {
      state: props.state,
      city: props.city
    }
  });
}

function formatChange(ratio: number): string {
  const sign = ratio >= 0 ? "+" : "";
  return `${sign}${(ratio * 100).toFixed(2)}%`;
}

const housingStructureSegments = computed(() => {
  const structure = data.value?.housing?.housingStructure;
  if (!structure) return [];

  return [
    { key: "single-family", label: "Single Family", value: structure.singleFamily * 100, shade: "structure-segment--1" },
    { key: "duplex", label: "Duplex", value: structure.duplex * 100, shade: "structure-segment--2" },
    { key: "small-apartment", label: "Small Apartment (3–9)", value: structure.smallApartment * 100, shade: "structure-segment--3" },
    { key: "large-apartment", label: "Large Apartment (10+)", value: structure.largeApartment * 100, shade: "structure-segment--4" },
    { key: "mobile-home", label: "Mobile Home", value: structure.mobile * 100, shade: "structure-segment--5" },
    { key: "other", label: "Other", value: structure.other * 100, shade: "structure-segment--6" },
  ].filter((segment) => segment.value > 0);
});

onMounted(() => {
  loadDetailedHousing();
});
</script>

<template>
  <div class="container">
    <DashboardHeader :city="city" :state="state" @logo-click="goBack" @search="onHeaderSearch" />

    <div v-if="loading" class="hero">
      <p>Loading detailed housing data…</p>
    </div>

    <div v-else-if="error" class="hero">
      <p style="color: var(--warning)">{{ error }}</p>
    </div>

    <div v-else-if="data">
      <!-- Overview -->
      <div class="section">
        <div class="section-header-container">
          <div class="section-header">Overview</div>
        </div>
        <div class="section-content">
          <div class="stat-grid">
            <div class="stat" v-if="data.housing?.medianRent">
              <label>Median Rent</label>
              <strong>${{ data.housing.medianRent.toLocaleString() }}</strong>
            </div>
            <div class="stat" v-if="data.housing?.medianHomeValue">
              <label>Median Home Value</label>
              <strong>${{ data.housing.medianHomeValue.toLocaleString() }}</strong>
            </div>
            <div class="stat" v-if="data.housing?.medianHouseholdIncome">
              <label>Median Household Income</label>
              <strong>${{ data.housing.medianHouseholdIncome.toLocaleString() }}</strong>
            </div>
            <div class="stat" v-if="data.housing?.medianYearBuilt">
              <label>Median Year Built</label>
              <strong>{{ data.housing.medianYearBuilt }}</strong>
            </div>
            <div class="stat" v-if="data.housing?.renterShare != null">
              <label>Renter Share</label>
              <strong>{{ (data.housing.renterShare * 100).toFixed(1) }}%</strong>
            </div>
            <div class="stat" v-if="data.housing?.vacancyRate != null">
              <label>Vacancy Rate</label>
              <strong>{{ (data.housing.vacancyRate * 100).toFixed(1) }}%</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Affordability -->
      <div class="section">
        <div class="section-header-container">
          <div class="section-header">Affordability</div>
        </div>
        <div class="section-content">
          <div class="stat-grid">
            <div class="stat" v-if="data.housing?.estimatedMortgage">
              <label>Est. Monthly Mortgage</label>
              <strong>${{ data.housing.estimatedMortgage.toLocaleString() }}</strong>
            </div>
            <div class="stat" v-if="data.housing?.mortgageToIncomeRatio != null">
              <label>Mortgage-to-Income Ratio</label>
              <strong :class="{ 'status-warning': data.housing.mortgageToIncomeRatio > 0.30 }">
                {{ (data.housing.mortgageToIncomeRatio * 100).toFixed(1) }}%
              </strong>
            </div>
            <div class="stat" v-if="data.housing?.rentBurdenPercent != null">
              <label>Rent Burdened Households</label>
              <strong :class="{ 'status-warning': data.housing.rentBurdenPercent > 0.30 }">
                {{ (data.housing.rentBurdenPercent * 100).toFixed(1) }}%
              </strong>
            </div>
          </div>
          <p class="muted" style="margin-top: 16px; font-size: 0.8rem;">
            Mortgage estimate assumes 20% down, 6.5% rate, 30-year term. Rent burden = households paying 30%+ of income on rent.
          </p>
        </div>
      </div>

      <!-- Housing Structure -->
      <div class="section" v-if="data.housing?.housingStructure">
        <div class="section-header-container">
          <div class="section-header">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path :d="mdiOfficeBuildingOutline" fill="currentColor" />
            </svg>
            <span>Housing Structure</span>
          </div>
        </div>
        <div class="section-content">
          <div class="structure-chart" role="img" aria-label="Housing structure distribution">
            <div class="structure-chart__bar">
              <div
                v-for="segment in housingStructureSegments"
                :key="segment.key"
                class="structure-chart__segment"
                :class="segment.shade"
                :style="{ width: `${segment.value}%` }"
                :title="`${segment.label}: ${segment.value.toFixed(1)}%`"
              >
                <span v-if="segment.value >= 5" class="structure-chart__segment-label">
                  {{ segment.value.toFixed(1) }}%
                </span>
              </div>
            </div>

            <div class="structure-chart__legend">
              <div
                v-for="segment in housingStructureSegments"
                :key="`${segment.key}-legend`"
                class="structure-chart__legend-item"
              >
                <span class="structure-chart__legend-swatch" :class="segment.shade"></span>
                <span class="structure-chart__legend-label">{{ segment.label }}</span>
                <span class="structure-chart__legend-value">{{ segment.value.toFixed(1) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Price Trends (FHFA) -->
      <div class="section" v-if="data.housing?.fhfaData">
        <div class="section-header-container">
          <div class="section-header">Home Price Trends (FHFA)</div>
        </div>
        <div class="section-content">
          <div class="stat-grid">
            <div class="stat">
              <label>Year-over-Year Change</label>
              <strong :class="data.housing.fhfaData.yoyChange >= 0 ? 'positive' : 'status-warning'">
                {{ formatChange(data.housing.fhfaData.yoyChange) }}
              </strong>
            </div>
            <div class="stat">
              <label>Quarter-over-Quarter Change</label>
              <strong :class="data.housing.fhfaData.qoqChange >= 0 ? 'positive' : 'status-warning'">
                {{ formatChange(data.housing.fhfaData.qoqChange) }}
              </strong>
            </div>
            <div class="stat" v-if="data.housing.fhfaData.fiveYearChange != null">
              <label>5-Year Change</label>
              <strong :class="data.housing.fhfaData.fiveYearChange >= 0 ? 'positive' : 'status-warning'">
                {{ formatChange(data.housing.fhfaData.fiveYearChange) }}
              </strong>
            </div>
          </div>
          <p class="muted" style="margin-top: 16px; font-size: 0.8rem;">
            Source: FHFA House Price Index —
            {{ data.housing.fhfaData.geographyName }}
            ({{ data.housing.fhfaData.level === 'msa' ? 'MSA-level' : 'State-level' }} data,
            last updated {{ data.housing.fhfaData.lastUpdated }})
          </p>
        </div>
      </div>
    </div>

    <div v-else class="hero">
      <p>No data available for {{ city }}, {{ state }}.</p>
    </div>
  </div>
</template>
