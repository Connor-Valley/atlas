<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
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
  slugToDisplay,
  type CompareCityBundle,
  type CompareCityRef,
} from "../lib/compare";
import { useAuth } from "../composables/useAuth";
import { useComparisons } from "../composables/useComparisons";
import { useRecentSearches } from "../composables/useRecentSearches";
import { usePreferences, hasRealPreferences } from "../composables/usePreferences";

const props = defineProps<{ cities?: string }>();

const route = useRoute();
const router = useRouter();
const { recordRecentSearch } = useRecentSearches();
const { user, loading: authLoading } = useAuth();
const { addComparison, removeComparison, isComparisonSaved, fetchComparisons } = useComparisons();
const { preferences, fetchPreferences } = usePreferences();

void fetchComparisons();
watch(user, () => void fetchComparisons());

// Wait for auth to finish restoring the session before fetching preferences — mirrors
// AtlasScoreCard.vue's guard against locking preferences to defaults on a transient null user.
watch([user, authLoading], ([, isAuthLoading]) => {
  if (!isAuthLoading) void fetchPreferences();
}, { immediate: true });

const personalized = computed(() => (user.value && hasRealPreferences(preferences.value) ? preferences.value : null));
watch(personalized, () => void loadBundles());

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
  if (!slots.value.length) {
    bundles.value = [];
    error.value = null;
    loading.value = false;
    stopLoadingTips();
    return;
  }

  const token = ++requestToken;
  loading.value = true;
  error.value = null;
  startLoadingTips();

  try {
    const loaded = await Promise.all(slots.value.map((s) => loadCompareCity(s.state, s.city, personalized.value)));
    if (token !== requestToken) return;
    bundles.value = loaded;
  } catch (err) {
    if (token !== requestToken) return;
    bundles.value = [];
    error.value = err instanceof Error ? err.message : "Failed to load comparison data";
  } finally {
    if (token === requestToken) {
      loading.value = false;
      stopLoadingTips();
    }
  }
}

// ── Loading tips ─────────────────────────────────────────────────────────────
// Uncached cities can take a few seconds to load (multiple Census/FHFA/EPA lookups per
// city) — this rotating status line is the loading screen's only content, so it starts
// immediately rather than waiting to see if the load is "slow enough to bother".
const loadingTip = ref("");
const LOADING_TIPS = [
  "Pulling Census data…",
  "Comparing rent, income, and job markets…",
  "Crunching climate and air quality stats…",
  "Double-checking the numbers…",
  "Good things take a moment (so does good data)…",
  "Almost there, lining it all up…",
];
let tipRotateTimer: ReturnType<typeof setInterval> | undefined;

function startLoadingTips() {
  clearInterval(tipRotateTimer);
  let i = 0;
  loadingTip.value = LOADING_TIPS[i];
  tipRotateTimer = setInterval(() => {
    i = (i + 1) % LOADING_TIPS.length;
    loadingTip.value = LOADING_TIPS[i];
  }, 1900);
}

function stopLoadingTips() {
  clearInterval(tipRotateTimer);
}

onUnmounted(stopLoadingTips);

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

// ── Sticky header offset ────────────────────────────────────────────────────
// DashboardHeader is itself sticky (top: 0). If the comparison table's header row
// also sticks at top: 0, the two fight for the same spot and the table header
// visually glitches under/behind the site header instead of stacking below it.
// Track the site header's live height and stick the table header right under it.
//
// Queried directly by class rather than via a template ref: DashboardHeader has a
// multi-root template (<header> plus a sibling <AuthModal v-if>), so its component
// instance's $el resolves to Vue's internal fragment anchor (a comment node, no
// getBoundingClientRect) rather than the actual <header> element.
// 60 matches .dashboard-hdr's fixed desktop height (see comparePage.css) — used as the
// correct value up front instead of 0, in case the live measurement below is ever delayed
// or unavailable (e.g. SSR, ResizeObserver support). Updated to the real height once measured.
const stickyOffset = ref(60);

function measureStickyOffset() {
  const el = document.querySelector<HTMLElement>(".dashboard-hdr");
  const height = el?.getBoundingClientRect().height;
  // Ignore 0/undefined reads (element not yet laid out) — keep the last-known-good value
  // rather than collapsing the offset to 0, which would re-introduce the header overlap bug.
  if (height) stickyOffset.value = height;
}

const resizeObserver = typeof ResizeObserver !== "undefined"
  ? new ResizeObserver(() => measureStickyOffset())
  : null;

onMounted(() => {
  measureStickyOffset();
  const el = document.querySelector(".dashboard-hdr");
  if (el) resizeObserver?.observe(el);
});

// ── Sticky header shrink ────────────────────────────────────────────────────
// A 1px sentinel sits right above the sticky header row. Once its top edge scrolls up
// past the point where the header row starts sticking (stickyOffset), the header has
// begun sticking — shrink it so it doesn't dominate the screen while scrolling through
// the metric rows below it. Driven directly off scroll position (rather than an
// IntersectionObserver) so it can't fall out of sync with the dynamic stickyOffset.
const headerSentinel = ref<HTMLElement | null>(null);
const headerStuck = ref(false);
let scrollRaf = 0;

function updateHeaderStuck() {
  const el = headerSentinel.value;
  headerStuck.value = !!el && el.getBoundingClientRect().top <= stickyOffset.value;
}

function onScroll() {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0;
    updateHeaderStuck();
  });
}

onMounted(() => {
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onScroll);
  if (scrollRaf) cancelAnimationFrame(scrollRaf);
  resizeObserver?.disconnect();
});

// Re-check whenever the sentinel mounts/unmounts (table toggles in/out) or the site
// header's measured height changes.
watch([headerSentinel, stickyOffset], () => updateHeaderStuck(), { flush: "post" });
</script>

<template>
  <div class="container cmp-page">
    <DashboardHeader page-label="City Comparison" @logo-click="resetToSearch" @search="onHeaderSearch" />

    <div class="cmp-page__header">
      <div>
        <div class="cmp-page__eyebrow">SIDE BY SIDE</div>
        <h1 class="cmp-page__title">Compare up to four cities</h1>
      </div>
      <div v-if="slots.length >= 2" class="cmp-page__actions">
        <button class="cmp-page__action-btn" @click="share">{{ shareCopied ? "Copied" : "Share" }}</button>
        <button class="cmp-page__action-btn cmp-page__action-btn--primary" @click="toggleSave">
          {{ isSaved ? "Saved" : (showSaveConfirmation ? "Saved!" : "Save comparison") }}
        </button>
      </div>
    </div>

    <CompareKeyDifferences v-if="bundles.length >= 2" :items="keyDifferences" />

    <div v-if="slots.length >= MIN_COMPARE_CITIES" class="cmp-toolbar">
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

    <section v-if="!slots.length" class="cmp-staging">
      <div class="cmp-staging__add-wrap">
        <button class="cmp-staging__add" type="button" @click="pickerOpen = true">
          <span class="mdi mdi-plus-circle-outline cmp-staging__add-icon"></span>
          <span class="cmp-staging__add-title">Add a city</span>
          <span class="cmp-staging__add-body">Search above or click here to pick your first city.</span>
        </button>
        <CompareAddCityPicker
          v-if="pickerOpen"
          @select="addCity"
          @close="pickerOpen = false"
        />
      </div>

      <div class="cmp-staging__divider">
        <span class="cmp-staging__divider-label">VS</span>
      </div>

      <div class="cmp-staging__add-wrap">
        <button class="cmp-staging__add" type="button" @click="pickerOpen = true">
          <span class="mdi mdi-plus-circle-outline cmp-staging__add-icon"></span>
          <span class="cmp-staging__add-title">Add a city</span>
          <span class="cmp-staging__add-body">Then pick a second city to compare it against.</span>
        </button>
      </div>
    </section>

    <section v-else-if="loading" class="cmp-loading-screen">
      <div class="cmp-loading-screen__pins">
        <span
          v-for="(s, i) in (slots.length ? slots : [{}, {}])"
          :key="i"
          class="cmp-loading-screen__pin mdi mdi-map-marker"
          :style="{ '--slot-color': `var(--compare-slot-${i + 1})`, animationDelay: `${i * 0.15}s` }"
        ></span>
      </div>
      <h2 class="cmp-loading-screen__title">
        Comparing {{ slots.map((s) => slugToDisplay(s.city)).join(' vs ') }}
      </h2>
      <Transition name="cmp-tip-fade" mode="out-in">
        <p :key="loadingTip" class="cmp-loading-screen__tip">{{ loadingTip || "Loading…" }}</p>
      </Transition>
    </section>

    <section v-else-if="error" class="cmp-empty">
      <span class="mdi mdi-alert-circle-outline cmp-empty__icon"></span>
      <h2 class="cmp-empty__title">Comparison data could not be loaded</h2>
      <p class="cmp-empty__body">{{ error }}</p>
    </section>

    <section v-else-if="bundles.length === 1" class="cmp-staging">
      <div
        class="cmp-staging__card"
        :style="bundles[0].photoUrl ? { backgroundImage: `linear-gradient(140deg, color-mix(in srgb, var(--compare-slot-1) 46%, transparent) 0%, color-mix(in srgb, var(--compare-slot-1) 34%, transparent) 55%, rgba(18,16,15,0.55) 100%), url(${bundles[0].photoUrl})` } : undefined"
      >
        <span class="cmp-staging__badge">A</span>
        <button class="cmp-staging__remove" type="button" aria-label="Remove city" @click="removeSlot(0)">×</button>
        <div class="cmp-staging__content">
          <h2 class="cmp-staging__name">{{ bundles[0].name }}</h2>
          <p class="cmp-staging__meta">{{ bundles[0].state.toUpperCase() }} · {{ bundles[0].county }} · {{ bundles[0].population.toLocaleString() }}</p>
          <div v-if="bundles[0].personalizedAtlasScore != null" class="cmp-staging__score-row">
            <span class="cmp-staging__score">{{ bundles[0].personalizedAtlasScore }}</span>
            <span class="cmp-staging__score-label">/100 Atlas Score</span>
          </div>
        </div>
      </div>

      <div class="cmp-staging__divider">
        <span class="cmp-staging__divider-label">VS</span>
      </div>

      <div class="cmp-staging__add-wrap">
        <button class="cmp-staging__add" type="button" @click="pickerOpen = true">
          <span class="mdi mdi-plus-circle-outline cmp-staging__add-icon"></span>
          <span class="cmp-staging__add-title">Who's competing with {{ bundles[0].name }}?</span>
          <span class="cmp-staging__add-body">Search above or click here to pick a city.</span>
        </button>
        <CompareAddCityPicker
          v-if="pickerOpen"
          @select="addCity"
          @close="pickerOpen = false"
        />
      </div>
    </section>

    <template v-else-if="bundles.length >= 2">
      <div ref="headerSentinel" class="cmp-table__sentinel"></div>
      <div class="cmp-table">
        <div
          class="cmp-table__header-row"
          :class="{ 'cmp-table__header-row--compact': headerStuck }"
          :style="{ top: `${stickyOffset}px` }"
        >
          <div class="cmp-table__header-spacer" :class="{ 'cmp-table__header-spacer--compact': headerStuck }">
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
            :compact="headerStuck"
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
