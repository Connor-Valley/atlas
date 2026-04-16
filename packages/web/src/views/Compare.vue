<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import CompareCitySearch from "../components/CompareCitySearch.vue";
import CompareSection from "../components/CompareSection.vue";
import SiteHeader from "../components/SiteHeader.vue";
import AuthModal from "../components/AuthModal.vue";
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
import { useAuth } from "../composables/useAuth";
import { useComparisons } from "../composables/useComparisons";

const props = defineProps<{
  stateA: string;
  cityA: string;
  stateB?: string;
  cityB?: string;
}>();

const router = useRouter();
const { user } = useAuth();
const { fetchComparisons, addComparison, removeComparison, isComparisonSaved } = useComparisons();
const loading = ref(false);
const error = ref<string | null>(null);
const showAuthModal = ref(false);
const shareMenuRef = ref<HTMLElement | null>(null);
const shareMenuOpen = ref(false);
const shareCopied = ref(false);
const mobileDraft = ref({
  stateA: props.stateA,
  cityA: props.cityA,
  stateB: props.stateB ?? "",
  cityB: props.cityB ?? "",
});
const mobileDraftPhotos = ref<{ a: string | null; b: string | null }>({ a: null, b: null });
const isMobileViewport = ref(false);
const isMobileEditorOpen = ref(false);
const mobileImagePreview = ref<{ src: string; city: string } | null>(null);
const mobileEditorTarget = ref<"a" | "b">("a");
const mobileSheetPanelRef = ref<HTMLElement | null>(null);
const mobileSheetTranslateY = ref(0);
const mobileSheetDragging = ref(false);
const mobileSheetExpanded = ref(false);
const mobileKeyboardInset = ref(0);
let shareCopiedTimeout: ReturnType<typeof setTimeout> | null = null;
let mobileDraftPhotoRequestToken = 0;
let mobileSheetDragStartY = 0;
let mobileSheetDragLastY = 0;

fetchComparisons();
const comparison = ref<{ a: ComparedCity; b: ComparedCity } | null>(null);
let requestToken = 0;

const hasCityB = computed(() => Boolean(props.stateB && props.cityB));
const compareReady = computed(() => Boolean(props.stateA && props.cityA && props.stateB && props.cityB));
const mobileDraftHasTwoCities = computed(() =>
  Boolean(mobileDraft.value.stateA && mobileDraft.value.cityA && mobileDraft.value.stateB && mobileDraft.value.cityB),
);
const mobileDraftDirty = computed(() =>
  mobileDraft.value.stateA !== props.stateA ||
  mobileDraft.value.cityA !== props.cityA ||
  (mobileDraft.value.stateB || "") !== (props.stateB ?? "") ||
  (mobileDraft.value.cityB || "") !== (props.cityB ?? ""),
);
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
const mobileCityCards = computed(() => [
  {
    key: "a" as const,
    tone: "a" as const,
    label: "City A",
    city:
      !mobileDraftDirty.value && comparison.value?.a.cityInfo.name
        ? comparison.value.a.cityInfo.name
        : (mobileDraft.value.cityA ? slugToDisplay(mobileDraft.value.cityA) : "Choose a city"),
    state: mobileDraft.value.stateA ? mobileDraft.value.stateA.toUpperCase() : "Not set",
    photoUrl:
      !mobileDraftDirty.value && comparison.value?.a.cityInfo.photoUrl
        ? comparison.value.a.cityInfo.photoUrl
        : mobileDraftPhotos.value.a,
    isEmpty: !mobileDraft.value.cityA || !mobileDraft.value.stateA,
  },
  {
    key: "b" as const,
    tone: "b" as const,
    label: "City B",
    city:
      !mobileDraftDirty.value && comparison.value?.b.cityInfo.name
        ? comparison.value.b.cityInfo.name
        : (mobileDraft.value.cityB ? slugToDisplay(mobileDraft.value.cityB) : "Add a city"),
    state: mobileDraft.value.stateB ? mobileDraft.value.stateB.toUpperCase() : "Ready to compare",
    photoUrl:
      !mobileDraftDirty.value && comparison.value?.b.cityInfo.photoUrl
        ? comparison.value.b.cityInfo.photoUrl
        : mobileDraftPhotos.value.b,
    isEmpty: !mobileDraft.value.cityB || !mobileDraft.value.stateB,
  },
]);
const mobileComparisonCta = computed(() =>
  compareReady.value && mobileDraftHasTwoCities.value ? "Update comparison" : "Compare",
);
const mobileSheetMaxLift = computed(() => Math.min(280, Math.max(118, mobileKeyboardInset.value + 84)));
const mobileSheetLift = computed(() => Math.max(0, -mobileSheetTranslateY.value));
const mobileSheetDrop = computed(() => Math.max(0, mobileSheetTranslateY.value));
const mobileSheetStyle = computed(() => ({
  "--sheet-extend": `${mobileSheetLift.value}px`,
  "--sheet-content-offset": `${-mobileSheetLift.value}px`,
  "--sheet-transition": mobileSheetDragging.value ? "none" : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
  transform: `translateY(${mobileSheetDrop.value}px)`,
  transition: mobileSheetDragging.value ? "none" : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
}));

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

async function loadMobileDraftPhotos() {
  const token = ++mobileDraftPhotoRequestToken;

  const [photoA, photoB] = await Promise.all([
    mobileDraft.value.stateA && mobileDraft.value.cityA
      ? fetchCityPhoto(mobileDraft.value.stateA, mobileDraft.value.cityA).catch(() => null)
      : Promise.resolve(null),
    mobileDraft.value.stateB && mobileDraft.value.cityB
      ? fetchCityPhoto(mobileDraft.value.stateB, mobileDraft.value.cityB).catch(() => null)
      : Promise.resolve(null),
  ]);

  if (token !== mobileDraftPhotoRequestToken) return;
  mobileDraftPhotos.value = { a: photoA, b: photoB };
}

watch(
  () => [props.stateA, props.cityA, props.stateB, props.cityB],
  () => {
    mobileDraft.value = {
      stateA: props.stateA,
      cityA: props.cityA,
      stateB: props.stateB ?? "",
      cityB: props.cityB ?? "",
    };
    void loadComparison();
  },
  { immediate: true },
);

watch(
  () => [mobileDraft.value.stateA, mobileDraft.value.cityA, mobileDraft.value.stateB, mobileDraft.value.cityB],
  () => {
    void loadMobileDraftPhotos();
  },
  { immediate: true },
);

watch(user, () => {
  void fetchComparisons();
});

const isSaved = computed(() => {
  if (!props.stateB || !props.cityB) return false;
  return isComparisonSaved(props.cityA, props.stateA, props.cityB, props.stateB);
});

const shareTitle = computed(() => {
  if (!compareReady.value) return "Atlas city comparison";
  return `Compare ${cityLabel(props.cityA, props.stateA)} vs ${cityLabel(props.cityB!, props.stateB!)} on Atlas`;
});

const shareText = computed(() => {
  if (!compareReady.value) return "Compare cities on Atlas.";
  return `${cityLabel(props.cityA, props.stateA)} vs ${cityLabel(props.cityB!, props.stateB!)} on Atlas.`;
});

const shareUrl = computed(() => {
  if (!compareReady.value) return "";
  const href = `/share/compare/${props.stateA}/${props.cityA}/${props.stateB!}/${props.cityB!}`;
  const shareBase = import.meta.env.VITE_SHARE_BASE as string | undefined;

  if (shareBase) {
    return new URL(href, shareBase).toString();
  }

  if (typeof window === "undefined") return href;
  return new URL(href, window.location.origin).toString();
});

const supportsNativeShare = computed(() => typeof navigator !== "undefined" && typeof navigator.share === "function");
const isSaving = ref(false);
const showSavedLink = ref(false);
let savedLinkTimeout: ReturnType<typeof setTimeout> | null = null;

async function toggleSave() {
  if (!user.value) {
    showAuthModal.value = true;
    return;
  }
  if (!props.stateB || !props.cityB || !comparison.value) return;
  if (isSaved.value) {
    await removeComparison(props.cityA, props.stateA, props.cityB, props.stateB);
    showSavedLink.value = false;
  } else {
    isSaving.value = true;
    await addComparison(
      props.cityA, comparison.value.a.cityInfo.name, props.stateA,
      props.cityB, comparison.value.b.cityInfo.name, props.stateB,
    );
    setTimeout(() => { isSaving.value = false; }, 700);
    showSavedLink.value = true;
    if (savedLinkTimeout) clearTimeout(savedLinkTimeout);
    savedLinkTimeout = setTimeout(() => { showSavedLink.value = false; }, 6000);
  }
}

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
  if (isMobileViewport.value) {
    mobileDraft.value = {
      ...mobileDraft.value,
      stateA: payload.state,
      cityA: payload.city,
    };
    closeMobileEditor();
    return;
  }
  updateRoute({
    stateA: payload.state,
    cityA: payload.city,
    stateB: props.stateB,
    cityB: props.cityB,
  });
}

function updateCityB(payload: { city: string; state: string }) {
  if (isMobileViewport.value) {
    mobileDraft.value = {
      ...mobileDraft.value,
      stateB: payload.state,
      cityB: payload.city,
    };
    closeMobileEditor();
    return;
  }
  updateRoute({
    stateA: props.stateA,
    cityA: props.cityA,
    stateB: payload.state,
    cityB: payload.city,
  });
}

function closeShareMenu() {
  shareMenuOpen.value = false;
}

async function openShareOptions() {
  if (supportsNativeShare.value) {
    await shareNatively();
    return;
  }

  shareMenuOpen.value = !shareMenuOpen.value;
}

function handleShareClickOutside(event: MouseEvent) {
  if (!shareMenuRef.value?.contains(event.target as Node)) {
    closeShareMenu();
  }
}

function setCopiedState() {
  shareCopied.value = true;
  if (shareCopiedTimeout) clearTimeout(shareCopiedTimeout);
  shareCopiedTimeout = setTimeout(() => {
    shareCopied.value = false;
  }, 1800);
}

async function copyShareLink() {
  if (!shareUrl.value) return;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl.value);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl.value;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopiedState();
    closeShareMenu();
  } catch (err) {
    console.error("Failed to copy share link", err);
  }
}

async function shareNatively() {
  if (!supportsNativeShare.value || !shareUrl.value) return;

  try {
    await navigator.share({
      title: shareTitle.value,
      text: shareText.value,
      url: shareUrl.value,
    });
    closeShareMenu();
  } catch (err) {
    if (!(err instanceof DOMException && err.name === "AbortError")) {
      console.error("Native share failed", err);
    }
  }
}

function openShareTarget(url: string) {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
  closeShareMenu();
}

function shareToMessages() {
  if (!shareUrl.value || typeof window === "undefined") return;
  const body = encodeURIComponent(`${shareText.value} ${shareUrl.value}`);
  window.location.href = `sms:?&body=${body}`;
  closeShareMenu();
}

function shareToEmail() {
  if (!shareUrl.value || typeof window === "undefined") return;
  const subject = encodeURIComponent(shareTitle.value);
  const body = encodeURIComponent(`${shareText.value}\n\n${shareUrl.value}`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
  closeShareMenu();
}

function shareToX() {
  openShareTarget(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText.value} ${shareUrl.value}`)}`);
}

function shareToFacebook() {
  openShareTarget(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl.value)}`);
}

function shareToLinkedIn() {
  openShareTarget(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl.value)}`);
}

function syncMobileViewport() {
  if (typeof window === "undefined") return;
  isMobileViewport.value = window.innerWidth <= 640;
  const viewport = window.visualViewport;
  mobileKeyboardInset.value = viewport
    ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
    : 0;

  if (!isMobileViewport.value) {
    isMobileEditorOpen.value = false;
  }
}

function setMobileSheetExpanded(expanded: boolean) {
  mobileSheetExpanded.value = expanded;
  mobileSheetTranslateY.value = expanded ? -mobileSheetMaxLift.value : 0;
}

function closeMobileEditor() {
  mobileSheetDragging.value = false;
  mobileSheetTranslateY.value = 0;
  mobileSheetExpanded.value = false;
  isMobileEditorOpen.value = false;
}

function openMobileImagePreview(city: string, src: string) {
  mobileImagePreview.value = { city, src };
}

function closeMobileImagePreview() {
  mobileImagePreview.value = null;
}

function openMobileEditor(target: "a" | "b") {
  mobileEditorTarget.value = target;
  mobileSheetTranslateY.value = 0;
  mobileSheetExpanded.value = false;
  isMobileEditorOpen.value = true;
}

function applyMobileDraftComparison() {
  if (!mobileDraft.value.stateA || !mobileDraft.value.cityA) return;

  updateRoute({
    stateA: mobileDraft.value.stateA,
    cityA: mobileDraft.value.cityA,
    stateB: mobileDraft.value.stateB || undefined,
    cityB: mobileDraft.value.cityB || undefined,
  });
}

function onMobileSheetPointerMove(event: PointerEvent) {
  if (!mobileSheetDragging.value) return;
  mobileSheetDragLastY = event.clientY;
  mobileSheetTranslateY.value = Math.min(220, Math.max(-mobileSheetMaxLift.value, event.clientY - mobileSheetDragStartY));
}

function stopMobileSheetDragging() {
  window.removeEventListener("pointermove", onMobileSheetPointerMove);
  window.removeEventListener("pointerup", onMobileSheetPointerUp);
  window.removeEventListener("pointercancel", onMobileSheetPointerUp);
}

function onMobileSheetPointerUp() {
  if (!mobileSheetDragging.value) return;
  mobileSheetDragging.value = false;
  stopMobileSheetDragging();

  if (mobileSheetTranslateY.value > 120) {
    closeMobileEditor();
    return;
  }

  if (mobileSheetTranslateY.value < -56) {
    setMobileSheetExpanded(true);
    return;
  }

  setMobileSheetExpanded(false);
}

function startMobileSheetDrag(event: PointerEvent) {
  mobileSheetDragging.value = true;
  mobileSheetDragStartY = event.clientY - mobileSheetTranslateY.value;
  mobileSheetDragLastY = event.clientY;
  stopMobileSheetDragging();
  window.addEventListener("pointermove", onMobileSheetPointerMove);
  window.addEventListener("pointerup", onMobileSheetPointerUp);
  window.addEventListener("pointercancel", onMobileSheetPointerUp);
}

onMounted(() => {
  syncMobileViewport();
  window.addEventListener("resize", syncMobileViewport);
  window.visualViewport?.addEventListener("resize", syncMobileViewport);
  window.visualViewport?.addEventListener("scroll", syncMobileViewport);
  document.addEventListener("click", handleShareClickOutside, { capture: true });
});

watch([isMobileEditorOpen, mobileImagePreview], ([editorOpen, imagePreview]) => {
  if (typeof document === "undefined") return;
  document.body.style.overflow = editorOpen || Boolean(imagePreview) ? "hidden" : "";
});

onBeforeUnmount(() => {
  stopMobileSheetDragging();
  window.removeEventListener("resize", syncMobileViewport);
  window.visualViewport?.removeEventListener("resize", syncMobileViewport);
  window.visualViewport?.removeEventListener("scroll", syncMobileViewport);
  document.removeEventListener("click", handleShareClickOutside, { capture: true });
  document.body.style.overflow = "";
  if (shareCopiedTimeout) clearTimeout(shareCopiedTimeout);
});
</script>

<template>
  <div class="container compare-view">
    <SiteHeader :show-theme-toggle="true" theme-toggle-placement="after-actions" :mobile-compact="true" @logo-click="resetToHome">
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
      <template v-if="compareReady" #actions>
        <div class="compare-view__actions">
          <div ref="shareMenuRef" class="compare-view__share-wrap">
            <button
              class="compare-view__share-btn"
              :class="{ 'compare-view__share-btn--active': shareMenuOpen }"
              @click.stop="openShareOptions"
            >
              <span class="compare-view__share-btn-label">{{ shareCopied ? 'Copied' : 'Share' }}</span>
              <span class="mdi" :class="shareCopied ? 'mdi-check' : 'mdi-share-variant-outline'"></span>
            </button>

            <div v-if="shareMenuOpen" class="compare-view__share-menu" @click.stop>
              <button
                v-if="supportsNativeShare"
                class="compare-view__share-item compare-view__share-item--primary"
                @click="shareNatively"
              >
                <span class="mdi mdi-cellphone-arrow-down compare-view__share-item-icon"></span>
                Share via device
              </button>
              <button class="compare-view__share-item" @click="copyShareLink">
                <span class="mdi mdi-content-copy compare-view__share-item-icon"></span>
                Copy link
              </button>
              <button class="compare-view__share-item" @click="shareToMessages">
                <span class="mdi mdi-message-text-outline compare-view__share-item-icon"></span>
                Messages
              </button>
              <button class="compare-view__share-item" @click="shareToEmail">
                <span class="mdi mdi-email-outline compare-view__share-item-icon"></span>
                Email
              </button>
              <button class="compare-view__share-item" @click="shareToX">
                <span class="mdi mdi-twitter compare-view__share-item-icon"></span>
                X
              </button>
              <button class="compare-view__share-item" @click="shareToFacebook">
                <span class="mdi mdi-facebook compare-view__share-item-icon"></span>
                Facebook
              </button>
              <button class="compare-view__share-item" @click="shareToLinkedIn">
                <span class="mdi mdi-linkedin compare-view__share-item-icon"></span>
                LinkedIn
              </button>
            </div>
          </div>

          <span class="compare-view__save-wrap">
            <button
              class="compare-view__save-btn"
              :class="{ 'compare-view__save-btn--saved': isSaved, 'compare-view__save-btn--animating': isSaving }"
              :data-tooltip="isSaved ? 'Unsave comparison' : 'Save city comparison'"
              @click="toggleSave"
            >
              <span class="compare-view__save-btn-label">{{ isSaved ? 'Saved' : 'Save' }}</span>
              <span class="mdi" :class="isSaved ? 'mdi-bookmark' : 'mdi-bookmark-outline'"></span>
            </button>
            <Transition name="saved-link">
              <button
                v-if="showSavedLink"
                class="compare-view__saved-link"
                @click="router.push({ name: 'saved-comparisons' })"
              >
                View saved
                <span class="mdi mdi-arrow-right"></span>
              </button>
            </Transition>
          </span>
        </div>
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

    <section v-if="isMobileViewport" class="compare-mobile-summary">
      <div class="compare-mobile-summary__cards">
        <article
          v-for="cityCard in mobileCityCards"
          :key="cityCard.key"
          class="compare-mobile-summary__card"
          :class="`compare-mobile-summary__card--${cityCard.tone}`"
        >
          <button
            v-if="cityCard.photoUrl"
            class="compare-mobile-summary__thumb compare-mobile-summary__thumb--interactive"
            :aria-label="`Preview photo for ${cityCard.city}`"
            type="button"
            @click.stop="openMobileImagePreview(cityCard.city, cityCard.photoUrl)"
          >
            <img :src="cityCard.photoUrl" alt="" class="compare-mobile-summary__thumb-image" />
          </button>
          <div v-else class="compare-mobile-summary__thumb">
            <div class="compare-mobile-summary__thumb-fallback"></div>
          </div>
          <button
            class="compare-mobile-summary__card-body compare-mobile-summary__card-body-button"
            :aria-label="`Edit ${cityCard.label}`"
            type="button"
            @click="openMobileEditor(cityCard.key)"
          >
            <div class="compare-mobile-summary__card-meta">
              <span class="compare-mobile-summary__badge" :class="`compare-mobile-summary__badge--${cityCard.tone}`">{{ cityCard.label.slice(-1) }}</span>
              <div class="compare-mobile-summary__card-text">
                <div class="compare-mobile-summary__card-city" :class="{ 'compare-mobile-summary__card-city--empty': cityCard.isEmpty }">
                  {{ cityCard.city }}
                </div>
                <div class="compare-mobile-summary__card-state">{{ cityCard.state }}</div>
              </div>
            </div>
          </button>
          <button class="compare-mobile-summary__card-edit" type="button" @click="openMobileEditor(cityCard.key)">
            Edit
          </button>
        </article>
      </div>

      <button v-if="mobileDraftDirty" class="compare-mobile-summary__edit-btn" @click="applyMobileDraftComparison">
        <span class="mdi mdi-autorenew"></span>
        {{ mobileComparisonCta }}
      </button>
    </section>

    <section class="compare-view__setup">
      <CompareCitySearch
        label="Choose City"
        tone="a"
        :initial-city="cityA"
        :initial-state="stateA"
        :button-label="cityA && stateA ? 'Update' : 'Add'"
        @search="updateCityA"
      />
      <CompareCitySearch
        label="Choose City"
        tone="b"
        :initial-city="cityB"
        :initial-state="stateB"
        :button-label="cityB && stateB ? 'Update' : 'Add'"
        @search="updateCityB"
      />
    </section>

    <Teleport to="body">
      <div v-if="isMobileViewport && mobileImagePreview !== null" class="compare-mobile-image-modal">
        <div class="compare-mobile-image-modal__backdrop" aria-hidden="true" @click="closeMobileImagePreview"></div>
        <div
          class="compare-mobile-image-modal__dialog"
          role="dialog"
          aria-modal="true"
          :aria-label="`${mobileImagePreview.city} photo`"
          @click="closeMobileImagePreview"
        >
          <button class="compare-mobile-image-modal__close" aria-label="Close image preview" @click="closeMobileImagePreview">
            <span class="mdi mdi-close"></span>
          </button>
          <div class="compare-mobile-image-modal__frame" @click.stop>
            <img :src="mobileImagePreview.src" :alt="mobileImagePreview.city" class="compare-mobile-image-modal__image" />
          </div>
          <div class="compare-mobile-image-modal__caption" @click.stop>{{ mobileImagePreview.city }}</div>
        </div>
      </div>

      <div v-if="isMobileViewport && isMobileEditorOpen" class="compare-mobile-sheet">
        <div class="compare-mobile-sheet__backdrop" aria-hidden="true" @click="closeMobileEditor"></div>
        <div
          ref="mobileSheetPanelRef"
          class="compare-mobile-sheet__panel"
          :class="{ 'compare-mobile-sheet__panel--expanded': mobileSheetExpanded }"
          :style="mobileSheetStyle"
          role="dialog"
          aria-modal="true"
          aria-labelledby="compare-mobile-sheet-title"
        >
          <div class="compare-mobile-sheet__panel-scroll">
            <div class="compare-mobile-sheet__drag-zone" @pointerdown="startMobileSheetDrag">
              <div class="compare-mobile-sheet__handle" aria-hidden="true"></div>
            </div>
            <div class="compare-mobile-sheet__header">
              <div>
                <p class="compare-mobile-sheet__eyebrow">City editor</p>
                <h2 id="compare-mobile-sheet-title" class="compare-mobile-sheet__title">
                  {{ mobileEditorTarget === 'a' ? 'Update City A' : 'Update City B' }}
                </h2>
              </div>
              <button class="compare-mobile-sheet__close" aria-label="Close city editor" @click="closeMobileEditor">
                <span class="mdi mdi-close"></span>
              </button>
            </div>

            <div class="compare-mobile-sheet__content">
              <CompareCitySearch
                v-if="mobileEditorTarget === 'a'"
                label="City A"
                tone="a"
                variant="sheet"
                :initial-city="mobileDraft.cityA"
                :initial-state="mobileDraft.stateA"
                :button-label="mobileDraft.cityA && mobileDraft.stateA ? 'Update City A' : 'Set City A'"
                @search="updateCityA"
              />
              <CompareCitySearch
                v-else
                label="City B"
                tone="b"
                variant="sheet"
                :initial-city="mobileDraft.cityB"
                :initial-state="mobileDraft.stateB"
                :button-label="mobileDraft.cityB && mobileDraft.stateB ? 'Update City B' : 'Set City B'"
                @search="updateCityB"
              />
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <div class="compare-view__divider" aria-hidden="true"></div>

    <section v-if="!hasCityB" class="compare-empty">
      <div class="compare-empty__icon-wrap">
        <span class="mdi mdi-map-search compare-empty__icon"></span>
      </div>
      <div class="compare-empty__content">
        <h2 class="compare-empty__title">Choose a second city to begin</h2>
        <p class="compare-empty__body">
          Add City B to unlock the verdict cards, tradeoff insights, and side-by-side metric comparisons.
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

  <AuthModal v-if="showAuthModal" mode="login" @close="showAuthModal = false" />
</template>
