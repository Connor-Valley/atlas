<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import DashboardHeader from "../components/DashboardHeader.vue";
import AuthModal from "../components/AuthModal.vue";
import CompareCityColumn from "../components/CompareCityColumn.vue";
import CompareMetricGroup from "../components/CompareMetricGroup.vue";
import CompareKeyDifferences from "../components/CompareKeyDifferences.vue";
import CompareAddCityPicker from "../components/CompareAddCityPicker.vue";
import {
  MIN_COMPARE_CITIES,
  MAX_COMPARE_CITIES,
  buildCompareUrl,
  buildCompareGroups,
  buildKeyDifferences,
  loadCompareCity,
  parseCompareCitiesParam,
  leaderTally,
  type CompareCityBundle,
  type CompareCityRef,
} from "../lib/compare";
import { useAuth } from "../composables/useAuth";
import { useComparisons } from "../composables/useComparisons";
import { useRecentSearches } from "../composables/useRecentSearches";

const props = defineProps<{ cities?: string }>();

const route = useRoute();
const router = useRouter();
const { recordRecentSearch } = useRecentSearches();
const { user } = useAuth();
const { addComparison, removeComparison, isComparisonSaved, fetchComparisons } = useComparisons();

void fetchComparisons();
watch(user, () => void fetchComparisons());

function onHeaderSearch(payload: { city: string; state: string }) {
  void recordRecentSearch(payload.city, payload.state);
  router.push(`/city/${payload.state}/${payload.city}`);
}

const slots = ref<CompareCityRef[]>(parseCompareCitiesParam(props.cities));
const bundles = ref<CompareCityBundle[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const mode = ref<"values" | "delta">("values");
const highlightLeaders = ref(true);
const pickerOpen = ref(false);
const showAuthModal = ref(false);
const showSaveConfirmation = ref(false);
const shareCopied = ref(false);

function citiesEqual(a: CompareCityRef[], b: CompareCityRef[]) {
  if (a.length !== b.length) return false;
  return a.every((c, i) => c.state === b[i].state && c.city === b[i].city);
}

watch(
  () => props.cities,
  (val) => {
    const parsed = parseCompareCitiesParam(val);
    if (!citiesEqual(parsed, slots.value)) {
      slots.value = parsed;
    }
  },
);

let requestToken = 0;
async function loadBundles() {
  if (slots.value.length < MIN_COMPARE_CITIES) {
    bundles.value = [];
    error.value = null;
    loading.value = false;
    return;
  }

  const token = ++requestToken;
  loading.value = true;
  error.value = null;

  try {
    const loaded = await Promise.all(slots.value.map((s) => loadCompareCity(s.state, s.city)));
    if (token !== requestToken) return;
    bundles.value = loaded;
  } catch (err) {
    if (token !== requestToken) return;
    bundles.value = [];
    error.value = err instanceof Error ? err.message : "Failed to load comparison data";
  } finally {
    if (token === requestToken) loading.value = false;
  }
}

function syncRoute() {
  const desired = slots.value.map((c) => `${c.state.toLowerCase()}-${c.city}`).join("_");
  const current = typeof route.params.cities === "string" ? route.params.cities : "";
  if (desired === current) return;
  if (desired) {
    router.replace({ name: "compare", params: { cities: desired } });
  } else {
    router.replace({ name: "compare-empty" });
  }
}

watch(
  slots,
  () => {
    syncRoute();
    void loadBundles();
  },
  { immediate: true, deep: true },
);

const groups = computed(() => buildCompareGroups(bundles.value));
const rankedRows = computed(() => groups.value.flatMap((g) => g.rows).filter((r) => r.ranked));
const leaderCounts = computed(() => leaderTally(rankedRows.value, slots.value.length));
const keyDifferences = computed(() => buildKeyDifferences(bundles.value));

const canAdd = computed(() => slots.value.length < MAX_COMPARE_CITIES);

function removeSlot(index: number) {
  slots.value = slots.value.filter((_, i) => i !== index);
}

function addCity(payload: CompareCityRef) {
  if (slots.value.length >= MAX_COMPARE_CITIES) return;
  if (slots.value.some((s) => s.state === payload.state && s.city === payload.city)) {
    pickerOpen.value = false;
    return;
  }
  slots.value = [...slots.value, payload];
  pickerOpen.value = false;
}

function resetAll() {
  slots.value = [];
  mode.value = "values";
  highlightLeaders.value = true;
}

const isSaved = computed(() => (slots.value.length >= 2 ? isComparisonSaved(slots.value) : false));

async function toggleSave() {
  if (!user.value) {
    showAuthModal.value = true;
    return;
  }
  if (bundles.value.length < 2) return;

  if (isSaved.value) {
    await removeComparison(slots.value);
  } else {
    await addComparison(bundles.value.map((b) => ({ state: b.state, city: b.city, cityName: b.name })));
    showSaveConfirmation.value = true;
    setTimeout(() => {
      showSaveConfirmation.value = false;
    }, 2500);
  }
}

const supportsNativeShare = computed(() => typeof navigator !== "undefined" && typeof navigator.share === "function");

async function share() {
  if (typeof window === "undefined") return;
  const url = window.location.href;

  if (supportsNativeShare.value) {
    try {
      await navigator.share({ title: "Atlas city comparison", url });
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        console.error("Native share failed", err);
      }
    }
    return;
  }

  try {
    await navigator.clipboard.writeText(url);
    shareCopied.value = true;
    setTimeout(() => {
      shareCopied.value = false;
    }, 1800);
  } catch (err) {
    console.error("Failed to copy share link", err);
  }
}

function resetToSearch() {
  router.push({ name: "search" });
}
</script>

<template>
  <div class="container cmp-page">
    <DashboardHeader page-label="City Comparison" @logo-click="resetToSearch" @search="onHeaderSearch" />

    <div class="cmp-page__header">
      <div>
        <div class="cmp-page__eyebrow">SIDE BY SIDE</div>
        <h1 class="cmp-page__title">Compare up to four cities</h1>
        <p class="cmp-page__subtitle">
          Comparing {{ slots.length }} of {{ MAX_COMPARE_CITIES }} cities · {{ rankedRows.length }} metrics · ranked, with US averages for reference
        </p>
      </div>
      <div v-if="slots.length >= 2" class="cmp-page__actions">
        <button class="cmp-page__action-btn" @click="share">{{ shareCopied ? "Copied" : "Share" }}</button>
        <button class="cmp-page__action-btn cmp-page__action-btn--primary" @click="toggleSave">
          {{ isSaved ? "Saved" : (showSaveConfirmation ? "Saved!" : "Save comparison") }}
        </button>
      </div>
    </div>

    <CompareKeyDifferences v-if="bundles.length" :items="keyDifferences" />

    <div v-if="slots.length" class="cmp-toolbar">
      <div class="cmp-toolbar__mode">
        <button
          class="cmp-toolbar__mode-btn"
          :class="{ 'cmp-toolbar__mode-btn--active': mode === 'values' }"
          @click="mode = 'values'"
        >Values</button>
        <button
          class="cmp-toolbar__mode-btn"
          :class="{ 'cmp-toolbar__mode-btn--active': mode === 'delta' }"
          @click="mode = 'delta'"
        >Δ vs {{ bundles[0]?.name ?? "first" }}</button>
      </div>
      <button
        class="cmp-toolbar__highlight"
        :class="{ 'cmp-toolbar__highlight--active': highlightLeaders }"
        @click="highlightLeaders = !highlightLeaders"
      >
        <span class="cmp-toolbar__highlight-dot"></span>
        Highlight leaders
      </button>
      <div class="cmp-toolbar__spacer"></div>
      <div class="cmp-toolbar__add-wrap">
        <button v-if="canAdd" class="cmp-toolbar__add-btn" @click="pickerOpen = !pickerOpen">
          + Add city
        </button>
        <span v-else class="cmp-toolbar__full">All {{ MAX_COMPARE_CITIES }} slots in use</span>
        <CompareAddCityPicker
          v-if="pickerOpen"
          @select="addCity"
          @close="pickerOpen = false"
        />
      </div>
      <button class="cmp-toolbar__reset" @click="resetAll">Reset</button>
    </div>

    <section v-if="!slots.length" class="cmp-empty">
      <span class="mdi mdi-map-search cmp-empty__icon"></span>
      <h2 class="cmp-empty__title">Choose two cities to compare</h2>
      <p class="cmp-empty__body">Search for a city above to unlock ranked metrics, Atlas Score subscores, and side-by-side comparisons for up to four cities.</p>
      <div class="cmp-toolbar__add-wrap">
        <button class="cmp-page__action-btn cmp-page__action-btn--primary" @click="pickerOpen = true">+ Add city</button>
        <CompareAddCityPicker
          v-if="pickerOpen"
          @select="addCity"
          @close="pickerOpen = false"
        />
      </div>
    </section>

    <section v-else-if="slots.length < MIN_COMPARE_CITIES" class="cmp-empty">
      <span class="mdi mdi-map-search cmp-empty__icon"></span>
      <h2 class="cmp-empty__title">Choose a second city to begin</h2>
      <p class="cmp-empty__body">Add another city to unlock ranked metrics and side-by-side comparisons.</p>
    </section>

    <section v-else-if="loading" class="cmp-loading">
      <div v-for="i in 3" :key="i" class="cmp-loading__card"></div>
    </section>

    <section v-else-if="error" class="cmp-empty">
      <span class="mdi mdi-alert-circle-outline cmp-empty__icon"></span>
      <h2 class="cmp-empty__title">Comparison data could not be loaded</h2>
      <p class="cmp-empty__body">{{ error }}</p>
    </section>

    <template v-else-if="bundles.length">
      <div class="cmp-table">
        <div class="cmp-table__header-row">
          <div class="cmp-table__header-spacer">
            <span class="cmp-table__header-label">METRIC</span>
          </div>
          <CompareCityColumn
            v-for="(b, i) in bundles"
            :key="`${b.state}-${b.city}`"
            :slot-index="i"
            :name="b.name"
            :state="b.state"
            :county="b.county"
            :population="b.population"
            :atlas-score="b.atlasScore"
            @remove="removeSlot(i)"
          />
        </div>

        <CompareMetricGroup
          v-for="group in groups"
          :key="group.key"
          :group="group"
          :mode="mode"
          :highlight-leaders="highlightLeaders"
        />

        <div class="cmp-table__footer">
          <span class="cmp-table__footer-label">LEADER TALLY</span>
          <span v-for="(b, i) in bundles" :key="`tally-${b.state}-${b.city}`" class="cmp-table__footer-pill">
            <span class="cmp-table__footer-dot" :style="{ background: `var(--compare-slot-${i + 1})` }"></span>
            {{ b.name }}
            <span class="cmp-table__footer-wins">{{ leaderCounts[i] }} leads</span>
          </span>
          <div class="cmp-table__footer-spacer"></div>
          <span class="cmp-table__footer-caption">ACS 5-YEAR ESTIMATES</span>
        </div>
      </div>
    </template>
  </div>

  <AuthModal v-if="showAuthModal" mode="login" @close="showAuthModal = false" />
</template>
