<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useRouter } from "vue-router";
import CitySearch from "../components/CitySearch.vue";
import CompareCitySearch from "../components/CompareCitySearch.vue";
import CityInfoSection from "../components/CityInfoSection.vue";
import CityInfoExpandedView from "../components/CityInfoExpandedView.vue";
import HousingSection from "../components/HousingSection.vue";
import HousingExpandedView from "../components/HousingExpandedView.vue";
import IncomeSection from "../components/IncomeSection.vue";
import IncomeExpandedView from "../components/IncomeExpandedView.vue";
import AffordabilitySection from "../components/AffordabilitySection.vue";
import AffordabilityExpandedView from "../components/AffordabilityExpandedView.vue";
import ClimateSection from "../components/ClimateSection.vue";
import ClimateExpandedView from "../components/ClimateExpandedView.vue";
import LifestyleSection from "../components/LifestyleSection.vue";
import LifestyleExpandedView from "../components/LifestyleExpandedView.vue";
import ScoreAttribution from "../components/ScoreAttribution.vue";
import AuthModal from "../components/AuthModal.vue";
import DashboardHeader from "../components/DashboardHeader.vue";
import ThemeToggle from "../components/ThemeToggle.vue";
import { useAuth } from "../composables/useAuth";
import { useRecentSearches } from "../composables/useRecentSearches";
import AtlasScoreCard from "../components/AtlasScoreCard.vue";
import { prefetchDetailedHousing } from "../api/housing";
import { prefetchDetailedCityProfile } from "../api/cityProfile";
import { prefetchDetailedQualityOfLife } from "../api/qualityOfLife";
import { prefetchIncome } from "../api/income";
import { prefetchAffordability } from "../api/affordability";
import { prefetchClimate } from "../api/climate";
import { prefetchLifestyle } from "../api/lifestyle";
import { prefetchAirQuality } from "../api/airQuality";
import type { DimensionScores } from "../lib/atlasScore";

type ExpandableSection = "city" | "economic" | "housing" | "affordability" | "climate" | "lifestyle";

const SECTION_DIMS: Record<ExpandableSection, Array<keyof DimensionScores>> = {
  city: ['opportunity'],
  economic: ['jobMarket', 'opportunity'],
  housing: ['affordability'],
  affordability: ['affordability'],
  climate: ['climate'],
  lifestyle: ['lifestyleVibrancy', 'airQuality', 'connectivity'],
};

const props = defineProps<{
  state?: string;
  city?: string;
  section?: ExpandableSection;
}>();

const router = useRouter();
const { user, displayName, signOut } = useAuth();
const { recordRecentSearch } = useRecentSearches();
const showAuthModal  = ref(false);
const authModalMode  = ref<'login' | 'register'>('register');
const userMenuOpen   = ref(false);
// Hover only reveals the username label on the button — it no longer opens
// the dropdown, which now opens strictly on click.
const userMenuHovered = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);

function openUserMenuHover() {
  userMenuHovered.value = true;
}

function closeUserMenuHover() {
  userMenuHovered.value = false;
}
const cityShareMenuRef = ref<HTMLElement | null>(null);
const cityShareMenuOpen = ref(false);
const cityShareCopied = ref(false);
let cityShareCopiedTimeout: ReturnType<typeof setTimeout> | null = null;

function openAuth(mode: 'login' | 'register') {
  authModalMode.value = mode;
  showAuthModal.value = true;
}

type HeroMode = 'search' | 'compare';
const heroMode = ref<HeroMode>('search');
const compareCityA = reactive<{ city: string; state: string }>({ city: '', state: '' });
const compareCityB = reactive<{ city: string; state: string }>({ city: '', state: '' });
const compareReady = computed(() => !!compareCityA.city && !!compareCityA.state && !!compareCityB.city && !!compareCityB.state);
const comparePartialReady = computed(() => !!compareCityA.city && !!compareCityA.state);

const city = ref("");
const state = ref("");
const hasSearched = ref(false);
const cityNotFound = ref(false);
const transitioningToDashboard = ref(false);
const transitioningToLanding = ref(false);
const expandedSection = ref<ExpandableSection | null>(null);
const expandedPhase = ref<"collapsed" | "expanding" | "expanded" | "collapsing">("collapsed");
const openedSections = reactive<Record<ExpandableSection, boolean>>({
  city: false,
  economic: false,
  housing: false,
  affordability: false,
  climate: false,
  lifestyle: false,
});
const heroPanel = ref<HTMLElement | null>(null);
const incomePanel = ref<HTMLElement | null>(null);
const housingPanel = ref<HTMLElement | null>(null);
const affordabilityPanel = ref<HTMLElement | null>(null);
const climatePanel = ref<HTMLElement | null>(null);
const lifestylePanel = ref<HTMLElement | null>(null);
const landingStage = ref<HTMLElement | null>(null);
const landingContent = ref<HTMLElement | null>(null);
const heroDots = ref<HTMLElement | null>(null);
const landingSearch = ref<HTMLElement | null>(null);
const dashboardStage = ref<HTMLElement | null>(null);
const scorePills = ref<HTMLElement | null>(null);
const dashboardShell = ref<HTMLElement | null>(null);
const cityNotFoundPanel = ref<HTMLElement | null>(null);
const isMobile = ref(typeof window !== 'undefined' && window.innerWidth < 640);

const scores = reactive({
  economic: null as number | null,
  housing: null as number | null,
  affordability: null as number | null,
  people: null as number | null,
  climate: null as number | null,
  lifestyle: null as number | null,
});

// Tracks which sections have hit a Census sample too small to publish, so the
// hero card can surface a single "some data is missing" banner.
const dataGaps = reactive({
  economic: false,
  housing: false,
  affordability: false,
});
const hasMissingData = computed(() => Object.values(dataGaps).some(Boolean));

const cityDisplayName = computed(() =>
  city.value.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
);

const sectionExpanded = computed(
  () => expandedPhase.value === "expanded"
);
const expandedLayoutSection = computed(() =>
  sectionExpanded.value ? expandedSection.value : null
);
const showLanding = computed(
  () => !hasSearched.value || transitioningToDashboard.value || transitioningToLanding.value
);
const showDashboard = computed(
  () => hasSearched.value || transitioningToLanding.value
);

const topCategory = computed(() => {
  const entries = (Object.entries(scores) as [string, number | null][])
    .filter(([, v]) => v !== null) as [string, number][];
  if (!entries.length) return null;
  return entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
});

// --- Landing page enhancements ---
const taglines = [
  "Aggregates public data to help you understand housing, income, and affordability across U.S. cities.",
  "Find your next city with confidence. Compare cost of living, job markets, and neighborhood stats.",
  "Moving soon? Discover which cities fit your budget and lifestyle.",
  "Data-driven city exploration. Housing trends, income levels, and affordability scores, all in one place.",
  "Your next home is out there. Let Atlas help you find the city that works for you.",
];
const mobileTaglines = [
  "Find your next city today.",
  "Compare cities. Move smarter.",
  "Your next home is out there.",
  "Compare rent, income, and more.",
  "Data-driven decisions for your move.",
  "See how cities stack up.",
  "Explore U.S. cities by cost.",
  "Affordability, simplified.",
  "Move with confidence.",
  "Find the city that fits.",
];
let taglineIndex = 0;
let mobileTaglineIndex = 0;
const displayedTagline = ref('');
const typewriterDone = ref(false);
const taglineHighlighted = ref(false);
const selectedWordCount = ref(0);
const taglineWords = computed(() =>
  displayedTagline.value.split(' ').map((w, i, arr) => i < arr.length - 1 ? w + ' ' : w)
);

const cityPool = [
  { label: 'Austin, TX',      stat: '$1,842/mo'   },
  { label: 'Denver, CO',      stat: '$412K home'  },
  { label: 'Nashville, TN',   stat: '$67K income' },
  { label: 'Portland, OR',    stat: '$1,950/mo'   },
  { label: 'Phoenix, AZ',     stat: '$320K home'  },
  { label: 'Charlotte, NC',   stat: 'Score: 72'   },
  { label: 'Seattle, WA',     stat: '$2,100/mo'   },
  { label: 'Minneapolis, MN', stat: '$1,200/mo'   },
  { label: 'Chicago, IL',     stat: '$2,250/mo'   },
  { label: 'Boise, ID',       stat: '$289K home'  },
  { label: 'Raleigh, NC',     stat: '$71K income' },
  { label: 'Tampa, FL',       stat: 'Score: 61'   },
  { label: 'Salt Lake City',  stat: '$1,780/mo'   },
  { label: 'Columbus, OH',    stat: '$198K home'  },
  { label: 'Kansas City, MO', stat: '$58K income' },
  { label: 'San Antonio, TX', stat: '$1,320/mo'   },
  { label: 'Boston, MA',      stat: '$2,800/mo'   },
  { label: 'Miami, FL',       stat: '$2,400/mo'   },
  { label: 'Atlanta, GA',     stat: '$1,680/mo'   },
  { label: 'Las Vegas, NV',   stat: '$1,540/mo'   },
  { label: 'Pittsburgh, PA',  stat: '$148K home'  },
  { label: 'Richmond, VA',    stat: '$63K income' },
  { label: 'Tucson, AZ',      stat: '$890/mo'     },
  { label: 'Madison, WI',     stat: '$74K income' },
];

let poolCursor = 0;

const chipSlots = ref([
  { id: 1, side: 'left'  as const, x: '3%',  top: '18%', mobileTop: '4%',  duration: '13s', delay: '0s',  mobileHide: false },
  { id: 2, side: 'left'  as const, x: '9%',  top: '43%', mobileTop: null,  duration: '16s', delay: '4s',  mobileHide: true  },
  { id: 3, side: 'left'  as const, x: '5%',  top: '65%', mobileTop: null,  duration: '12s', delay: '8s',  mobileHide: true  },
  { id: 4, side: 'left'  as const, x: '12%', top: '82%', mobileTop: null,  duration: '15s', delay: '2s',  mobileHide: false },
  { id: 5, side: 'right' as const, x: '4%',  top: '24%', mobileTop: '10%', duration: '14s', delay: '6s',  mobileHide: false },
  { id: 6, side: 'right' as const, x: '11%', top: '51%', mobileTop: null,  duration: '11s', delay: '1s',  mobileHide: true  },
  { id: 7, side: 'right' as const, x: '6%',  top: '70%', mobileTop: null,  duration: '17s', delay: '9s',  mobileHide: true  },
  { id: 8, side: 'right' as const, x: '13%', top: '86%', mobileTop: null,  duration: '13s', delay: '5s',  mobileHide: false },
].map((slot, i) => ({ ...slot, label: cityPool[i].label, stat: cityPool[i].stat })));
poolCursor = 8;

function cycleSlot(index: number) {
  const city = cityPool[poolCursor % cityPool.length];
  poolCursor++;
  chipSlots.value[index] = { ...chipSlots.value[index], label: city.label, stat: city.stat };
}


let typeTimer: ReturnType<typeof setTimeout> | null = null;

function activeTaglines() {
  return window.innerWidth < 640 ? mobileTaglines : taglines;
}

function activeTaglineIndex() {
  return window.innerWidth < 640 ? mobileTaglineIndex : taglineIndex;
}

function advanceTaglineIndex() {
  if (window.innerWidth < 640) {
    mobileTaglineIndex = (mobileTaglineIndex + 1) % mobileTaglines.length;
  } else {
    taglineIndex = (taglineIndex + 1) % taglines.length;
  }
}

function typeTagline() {
  const list = activeTaglines();
  const target = list[activeTaglineIndex()];
  let i = displayedTagline.value.length;
  typewriterDone.value = false;

  function typeChar() {
    i++;
    displayedTagline.value = target.slice(0, i);
    if (i < target.length) {
      typeTimer = setTimeout(typeChar, 24);
    } else {
      typewriterDone.value = true;
      typeTimer = setTimeout(selectTagline, 5500);
    }
  }
  typeChar();
}

function selectTagline() {
  taglineHighlighted.value = true;
  selectedWordCount.value = 0;
  const wordCount = taglineWords.value.length;

  function step() {
    selectedWordCount.value++;
    if (selectedWordCount.value < 2) {
      typeTimer = setTimeout(step, 220);
    } else {
      // After 2 words, snap-select everything
      typeTimer = setTimeout(() => {
        selectedWordCount.value = wordCount;
        typeTimer = setTimeout(() => {
          displayedTagline.value = '';
          taglineHighlighted.value = false;
          selectedWordCount.value = 0;
          advanceTaglineIndex();
          typeTimer = setTimeout(typeTagline, 220);
        }, 1600);
      }, 180);
    }
  }

  typeTimer = setTimeout(step, 120);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && expandedPhase.value === 'expanded') closeExpandedSection();
}

function handleUserMenuClickOutside(event: MouseEvent) {
  if (!userMenuRef.value?.contains(event.target as Node)) {
    userMenuOpen.value = false;
  }
}

function handleCityShareClickOutside(event: MouseEvent) {
  if (!cityShareMenuRef.value?.contains(event.target as Node)) {
    cityShareMenuOpen.value = false;
  }
}

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value;
}

function closeUserMenu() {
  userMenuOpen.value = false;
}

function navigateToAccountPage(routeName: 'profile' | 'favorites' | 'saved-comparisons' | 'friends') {
  closeUserMenu();
  router.push({ name: routeName });
}

async function signOutFromLanding() {
  closeUserMenu();
  await signOut();
}

function onResize() {
  isMobile.value = window.innerWidth < 640;
}

function scrollMobileDetailToTop() {
  if (!isMobile.value) return;
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', onResize);
  document.addEventListener('click', handleUserMenuClickOutside, { capture: true });
  document.addEventListener('click', handleCityShareClickOutside, { capture: true });

  if (props.state && props.city) {
    state.value = props.state;
    city.value = props.city;
    hasSearched.value = true;
    if (props.section) {
      expandedSection.value = props.section;
      expandedPhase.value = 'expanded';
      openedSections[props.section] = true;
      getPrefetcher(props.section)(props.state, props.city);
      scrollMobileDetailToTop();
    }
    displayedTagline.value = taglines[0];
    typewriterDone.value = true;
    return;
  }

  typeTagline();
});

watch(() => props.section, async (newSection, oldSection) => {
  if (programmaticNavigation) {
    programmaticNavigation = false;
    return;
  }
  if (newSection && expandedPhase.value === 'collapsed') {
    // Browser forward navigation to a section URL
    expandedSection.value = newSection;
    expandedPhase.value = 'expanded';
    openedSections[newSection] = true;
    getPrefetcher(newSection)(state.value, city.value);
    await nextTick();
    scrollMobileDetailToTop();
  } else if (!newSection && expandedPhase.value === 'expanded' && oldSection) {
    // Browser back button from section URL to city URL
    await animateSectionTransition(oldSection, false);
  }
});

watch(() => props.city, (newCity) => {
  if (!newCity && hasSearched.value) {
    hasSearched.value = false;
    city.value = '';
    state.value = '';
    cityNotFound.value = false;
    scores.economic = null;
    scores.housing = null;
    scores.affordability = null;
    scores.people = null;
    scores.climate = null;
    scores.lifestyle = null;
    expandedSection.value = null;
    expandedPhase.value = 'collapsed';
    openedSections.city = false;
    openedSections.economic = false;
    openedSections.housing = false;
    openedSections.affordability = false;
    openedSections.climate = false;
    openedSections.lifestyle = false;
    if (typeTimer) clearTimeout(typeTimer);
    displayedTagline.value = '';
    typewriterDone.value = false;
    taglineHighlighted.value = false;
    selectedWordCount.value = 0;
    taglineIndex = 0;
    typeTagline();
  }
});

onUnmounted(() => {
  if (typeTimer) clearTimeout(typeTimer);
  if (cityShareCopiedTimeout) clearTimeout(cityShareCopiedTimeout);
  document.removeEventListener('click', handleUserMenuClickOutside, { capture: true });
  document.removeEventListener('click', handleCityShareClickOutside, { capture: true });
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('resize', onResize);
});

function canAnimateSearchTransition() {
  return (
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !window.matchMedia("(pointer: coarse)").matches &&
    window.innerWidth > 768
  );
}

function onSearch(payload: { city: string; state: string }) {
  const shouldAnimateLandingTransition = !hasSearched.value && canAnimateSearchTransition();

  city.value = payload.city;
  state.value = payload.state;

  scores.economic = null;
  scores.housing = null;
  scores.affordability = null;
  scores.people = null;
  scores.climate = null;
  scores.lifestyle = null;
  cityNotFound.value = false;
  expandedSection.value = null;
  expandedPhase.value = "collapsed";
  openedSections.city = false;
  openedSections.economic = false;
  openedSections.housing = false;
  openedSections.affordability = false;
  openedSections.climate = false;
  openedSections.lifestyle = false;

  router.push(`/city/${payload.state}/${payload.city}`);

  void recordRecentSearch(payload.city, payload.state);

  if (shouldAnimateLandingTransition) {
    void animateLandingToDashboard();
    return;
  }

  hasSearched.value = true;
}

function clearSearchState() {
  hasSearched.value = false;
  city.value = '';
  state.value = '';
  cityNotFound.value = false;
  scores.economic = null;
  scores.housing = null;
  scores.affordability = null;
  scores.people = null;
  scores.climate = null;
  scores.lifestyle = null;
  expandedSection.value = null;
  expandedPhase.value = "collapsed";
  openedSections.city = false;
  openedSections.economic = false;
  openedSections.housing = false;
  openedSections.affordability = false;
  openedSections.climate = false;
  openedSections.lifestyle = false;
  router.replace('/');

  if (typeTimer) clearTimeout(typeTimer);
  displayedTagline.value = '';
  typewriterDone.value = false;
  taglineHighlighted.value = false;
  selectedWordCount.value = 0;
  taglineIndex = 0;
  typeTagline();
}

function resetSearch() {
  const shouldAnimateReturn =
    hasSearched.value &&
    !transitioningToLanding.value &&
    canAnimateSearchTransition();

  if (shouldAnimateReturn) {
    void animateDashboardToLanding();
    return;
  }

  clearSearchState();
}

function goToCompare() {
  router.push({ name: "compare-empty" });
}

function onHeroModeToggle(mode: HeroMode) {
  heroMode.value = mode;
  if (mode === 'search') {
    compareCityA.city = ''; compareCityA.state = '';
    compareCityB.city = ''; compareCityB.state = '';
  }
}

function onCompareASearch(p: { city: string; state: string }) {
  compareCityA.city = p.city;
  compareCityA.state = p.state;
}

function onCompareBSearch(p: { city: string; state: string }) {
  compareCityB.city = p.city;
  compareCityB.state = p.state;
}

function submitHeroCompare() {
  if (!comparePartialReady.value) return;
  router.push({
    name: 'compare',
    params: compareReady.value
      ? { stateA: compareCityA.state, cityA: compareCityA.city, stateB: compareCityB.state, cityB: compareCityB.city }
      : { stateA: compareCityA.state, cityA: compareCityA.city },
  });
}

function openCompareView() {
  if (!state.value || !city.value) return;

  router.push({
    name: "compare",
    params: {
      stateA: state.value,
      cityA: city.value,
    },
  });
}

function cityLabel(citySlug: string, stateCode: string) {
  const displayCity = citySlug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return `${displayCity}, ${stateCode.toUpperCase()}`;
}

function closeCityShareMenu() {
  cityShareMenuOpen.value = false;
}

const cityShareTitle = computed(() =>
  state.value && city.value ? `${cityLabel(city.value, state.value)} | Atlas` : 'Atlas city'
);

const cityShareText = computed(() =>
  state.value && city.value ? `Explore ${cityLabel(city.value, state.value)} on Atlas.` : 'Explore cities on Atlas.'
);

const cityShareUrl = computed(() => {
  if (!state.value || !city.value) return '';

  const href = router.resolve({
    name: 'city',
    params: {
      state: state.value,
      city: city.value,
    },
  }).href;

  const shareBase = import.meta.env.VITE_SHARE_BASE as string | undefined;
  return shareBase ? new URL(href, shareBase).toString() : new URL(href, window.location.origin).toString();
});

const supportsCityNativeShare = computed(() =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function'
);

function setCityShareCopied() {
  cityShareCopied.value = true;
  if (cityShareCopiedTimeout) clearTimeout(cityShareCopiedTimeout);
  cityShareCopiedTimeout = setTimeout(() => {
    cityShareCopied.value = false;
  }, 1800);
}

async function copyCityShareLink() {
  if (!cityShareUrl.value) return;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(cityShareUrl.value);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = cityShareUrl.value;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCityShareCopied();
    closeCityShareMenu();
  } catch (error) {
    console.error('Failed to copy city share link', error);
  }
}

async function shareCityNatively() {
  if (!supportsCityNativeShare.value || !cityShareUrl.value) return;

  try {
    await navigator.share({
      title: cityShareTitle.value,
      text: cityShareText.value,
      url: cityShareUrl.value,
    });
    closeCityShareMenu();
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      console.error('Failed to share city', error);
    }
  }
}

function openCityShareOptions() {
  if (cityShareUrl.value && typeof navigator.share === 'function') {
    navigator.share({
      title: cityShareTitle.value,
      text: cityShareText.value,
      url: cityShareUrl.value,
    }).catch((error) => {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        cityShareMenuOpen.value = !cityShareMenuOpen.value;
      }
    });
    return;
  }

  cityShareMenuOpen.value = !cityShareMenuOpen.value;
}

function openCityShareTarget(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
  closeCityShareMenu();
}

function shareCityToMessages() {
  if (!cityShareUrl.value) return;
  const body = encodeURIComponent(`${cityShareText.value} ${cityShareUrl.value}`);
  window.location.href = `sms:?&body=${body}`;
  closeCityShareMenu();
}

function shareCityToEmail() {
  if (!cityShareUrl.value) return;
  const subject = encodeURIComponent(cityShareTitle.value);
  const body = encodeURIComponent(`${cityShareText.value}\n\n${cityShareUrl.value}`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
  closeCityShareMenu();
}

function shareCityToX() {
  openCityShareTarget(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${cityShareText.value} ${cityShareUrl.value}`)}`);
}

function shareCityToFacebook() {
  openCityShareTarget(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(cityShareUrl.value)}`);
}

function shareCityToLinkedIn() {
  openCityShareTarget(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(cityShareUrl.value)}`);
}

function getPanelElement(section: ExpandableSection) {
  if (section === "city") return heroPanel.value;
  if (section === "economic") return incomePanel.value;
  if (section === "housing") return housingPanel.value;
  if (section === "climate") return climatePanel.value;
  if (section === "lifestyle") return lifestylePanel.value;
  return affordabilityPanel.value;
}

function getDashboardEnterElements() {
  return [
    dashboardStage.value?.querySelector(".dashboard-hdr") as HTMLElement | null,
    scorePills.value,
    dashboardShell.value,
    cityNotFoundPanel.value,
  ].filter((element): element is HTMLElement => Boolean(element));
}

function getSearchBarElement(container: HTMLElement | null) {
  return container?.querySelector(".search-bar") as HTMLElement | null;
}

function resetFinishedAnimations(animations: Animation[]) {
  animations.forEach((animation) => animation.cancel());
}

async function animateLandingToDashboard() {
  const source = getSearchBarElement(landingSearch.value);
  if (!source) {
    hasSearched.value = true;
    return;
  }

  const sourceRect = source.getBoundingClientRect();
  transitioningToDashboard.value = true;
  hasSearched.value = true;
  await nextTick();

  const target = getSearchBarElement(dashboardStage.value);
  if (!target) {
    transitioningToDashboard.value = false;
    return;
  }

  const targetRect = target.getBoundingClientRect();
  const ghost = source.cloneNode(true) as HTMLElement;
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${sourceRect.left}px`,
    top: `${sourceRect.top}px`,
    width: `${sourceRect.width}px`,
    height: `${sourceRect.height}px`,
    margin: "0",
    zIndex: "40",
    pointerEvents: "none",
  });
  document.body.appendChild(ghost);

  source.style.opacity = "0";
  target.style.opacity = "0";

  const landingAnimations: Animation[] = [];
  const landingElements = [
    landingStage.value,
    heroDots.value,
    ...(landingStage.value
      ? Array.from(landingStage.value.querySelectorAll(".hero-chip")) as HTMLElement[]
      : []),
  ].filter((element): element is HTMLElement => Boolean(element));

  landingElements.forEach((element, index) => {
    landingAnimations.push(
      element.animate(
        [
          { opacity: 1, transform: "translateY(0px)" },
          { opacity: index === 0 ? 0 : 0, transform: index === 0 ? "translateY(0px)" : "translateY(-20px)" },
        ],
        {
          duration: 760,
          delay: index === 0 ? 180 : 40,
          easing: "cubic-bezier(0.2, 0.9, 0.24, 1)",
          fill: "both",
        },
      ),
    );
  });

  if (landingContent.value) {
    landingAnimations.push(
      landingContent.value.animate(
        [
          { opacity: 1, transform: "translateY(0px)" },
          { opacity: 0, transform: "translateY(-26px)" },
        ],
        {
          duration: 680,
          easing: "cubic-bezier(0.2, 0.9, 0.24, 1)",
          fill: "both",
        },
      ),
    );
  }

  const searchDeltaX = targetRect.left - sourceRect.left;
  const searchDeltaY = targetRect.top - sourceRect.top;
  const ghostAnimation = ghost.animate(
    [
      {
        transform: "translate(0px, 0px)",
        width: `${sourceRect.width}px`,
        height: `${sourceRect.height}px`,
        opacity: 1,
      },
      {
        transform: `translate(${searchDeltaX}px, ${searchDeltaY}px)`,
        width: `${targetRect.width}px`,
        height: `${targetRect.height}px`,
        opacity: 1,
      },
    ],
    {
      duration: 980,
      easing: "cubic-bezier(0.2, 0.9, 0.24, 1)",
      fill: "both",
    },
  );

  const dashboardAnimations = getDashboardEnterElements().map((element, index) =>
    element.animate(
      [
        { opacity: 0, transform: "translateY(56px)" },
        { opacity: 1, transform: "translateY(0px)" },
      ],
      {
        duration: 860,
        delay: 320 + index * 40,
        easing: "cubic-bezier(0.2, 0.9, 0.24, 1)",
        fill: "both",
      },
    ),
  );

  await Promise.allSettled([
    ghostAnimation.finished,
    ...landingAnimations.map((animation) => animation.finished),
    ...dashboardAnimations.map((animation) => animation.finished),
  ]);

  resetFinishedAnimations([ghostAnimation, ...landingAnimations, ...dashboardAnimations]);
  ghost.remove();
  source.style.opacity = "";
  target.style.opacity = "";
  transitioningToDashboard.value = false;
}

async function animateDashboardToLanding() {
  const source = getSearchBarElement(dashboardStage.value);
  if (!source) {
    clearSearchState();
    return;
  }

  transitioningToLanding.value = true;
  await nextTick();

  const target = getSearchBarElement(landingSearch.value);
  if (!target) {
    transitioningToLanding.value = false;
    clearSearchState();
    return;
  }

  const sourceRect = source.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const ghost = source.cloneNode(true) as HTMLElement;
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${sourceRect.left}px`,
    top: `${sourceRect.top}px`,
    width: `${sourceRect.width}px`,
    height: `${sourceRect.height}px`,
    margin: "0",
    zIndex: "40",
    pointerEvents: "none",
  });
  document.body.appendChild(ghost);

  source.style.opacity = "0";
  target.style.opacity = "0";

  const dashboardElements = [
    dashboardStage.value?.querySelector(".dashboard-hdr") as HTMLElement | null,
    scorePills.value,
    dashboardShell.value,
    cityNotFoundPanel.value,
  ].filter((element): element is HTMLElement => Boolean(element));

  const dashboardAnimations = dashboardElements.map((element, index) =>
    element.animate(
      [
        { opacity: 1, transform: "translateY(0px)" },
        { opacity: 0, transform: "translateY(36px)" },
      ],
      {
        duration: 620,
        delay: index * 40,
        easing: "cubic-bezier(0.2, 0.9, 0.24, 1)",
        fill: "both",
      },
    ),
  );

  const landingElements = [
    landingStage.value,
    heroDots.value,
    ...(landingStage.value
      ? Array.from(landingStage.value.querySelectorAll(".hero-chip")) as HTMLElement[]
      : []),
  ].filter((element): element is HTMLElement => Boolean(element));

  const landingAnimations: Animation[] = [];
  landingElements.forEach((element, index) => {
    landingAnimations.push(
      element.animate(
        [
          { opacity: index === 0 ? 0 : 0, transform: index === 0 ? "translateY(0px)" : "translateY(18px)" },
          { opacity: 1, transform: "translateY(0px)" },
        ],
        {
          duration: 760,
          delay: index === 0 ? 120 : 220,
          easing: "cubic-bezier(0.2, 0.9, 0.24, 1)",
          fill: "both",
        },
      ),
    );
  });

  if (landingContent.value) {
    landingAnimations.push(
      landingContent.value.animate(
        [
          { opacity: 0, transform: "translateY(26px)" },
          { opacity: 1, transform: "translateY(0px)" },
        ],
        {
          duration: 680,
          delay: 180,
          easing: "cubic-bezier(0.2, 0.9, 0.24, 1)",
          fill: "both",
        },
      ),
    );
  }

  const searchDeltaX = targetRect.left - sourceRect.left;
  const searchDeltaY = targetRect.top - sourceRect.top;
  const ghostAnimation = ghost.animate(
    [
      {
        transform: "translate(0px, 0px)",
        width: `${sourceRect.width}px`,
        height: `${sourceRect.height}px`,
        opacity: 1,
      },
      {
        transform: `translate(${searchDeltaX}px, ${searchDeltaY}px)`,
        width: `${targetRect.width}px`,
        height: `${targetRect.height}px`,
        opacity: 1,
      },
    ],
    {
      duration: 980,
      easing: "cubic-bezier(0.2, 0.9, 0.24, 1)",
      fill: "both",
    },
  );

  await Promise.allSettled([
    ghostAnimation.finished,
    ...dashboardAnimations.map((animation) => animation.finished),
    ...landingAnimations.map((animation) => animation.finished),
  ]);

  resetFinishedAnimations([ghostAnimation, ...dashboardAnimations, ...landingAnimations]);
  ghost.remove();
  source.style.opacity = "";
  target.style.opacity = "";
  transitioningToLanding.value = false;
  clearSearchState();
}

function getPrefetcher(section: ExpandableSection) {
  if (section === "city") return (state: string, city: string) => { prefetchDetailedCityProfile(state, city); prefetchDetailedQualityOfLife(state, city); };
  if (section === "economic") return prefetchIncome;
  if (section === "housing") return prefetchDetailedHousing;
  if (section === "climate") return prefetchClimate;
  if (section === "lifestyle") return (state: string, city: string) => { prefetchLifestyle(state, city); prefetchAirQuality(state, city); };
  return prefetchAffordability;
}

function getPanelKeyframes(
  selectedSection: ExpandableSection,
  panel: ExpandableSection,
  expand: boolean,
) {
  // Selected panel slides out/in from its own natural direction
  if (panel === selectedSection) {
    const dirs: Record<ExpandableSection, [number, number]> = {
      city:          [0, -36],
      economic:     [-56, 0],
      housing:      [ 56, 0],
      affordability: [0, 48],
      climate:       [0, 48],
      lifestyle:     [0, 48],
    };
    const [x, y] = dirs[selectedSection];
    const gone = { transform: `translate(${x}px, ${y}px)`, opacity: 0 };
    const home = { transform: "translate(0,0)", opacity: 1 };
    return expand ? [home, gone] : [gone, home];
  }
  if (panel === "city") {
    return expand
      ? [{ transform: "translateY(0px)", opacity: 1 }, { transform: "translateY(-48px)", opacity: 0 }]
      : [{ transform: "translateY(-48px)", opacity: 0 }, { transform: "translateY(0px)", opacity: 1 }];
  }
  if (panel === "economic") {
    return expand
      ? [{ transform: "translateX(0px)", opacity: 1 }, { transform: "translateX(-56px)", opacity: 0 }]
      : [{ transform: "translateX(-56px)", opacity: 0 }, { transform: "translateX(0px)", opacity: 1 }];
  }
  if (panel === "housing") {
    return expand
      ? [{ transform: "translateX(0px)", opacity: 1 }, { transform: "translateX(56px)", opacity: 0 }]
      : [{ transform: "translateX(56px)", opacity: 0 }, { transform: "translateX(0px)", opacity: 1 }];
  }
  return expand
    ? [{ transform: "translateY(0px)", opacity: 1 }, { transform: "translateY(48px)", opacity: 0 }]
    : [{ transform: "translateY(48px)", opacity: 0 }, { transform: "translateY(0px)", opacity: 1 }];
}

async function animateSectionTransition(section: ExpandableSection, expand: boolean) {
  if (expand) {
    // Slide all panels out from their dashboard positions, then CSS reveals expanded content
    expandedPhase.value = "expanding";
    await nextTick();
    // Grid stays in dashboard layout during exit (sectionExpanded only true at 'expanded')

    const panelItems = [
      { element: heroPanel.value,         keyframes: getPanelKeyframes(section, "city", true) },
      { element: incomePanel.value,        keyframes: getPanelKeyframes(section, "economic", true) },
      { element: housingPanel.value,       keyframes: getPanelKeyframes(section, "housing", true) },
      { element: affordabilityPanel.value, keyframes: getPanelKeyframes(section, "affordability", true) },
      { element: climatePanel.value,       keyframes: getPanelKeyframes(section, "climate", true) },
      { element: lifestylePanel.value,     keyframes: getPanelKeyframes(section, "lifestyle", true) },
    ].filter((p): p is { element: HTMLElement; keyframes: Keyframe[] } => Boolean(p.element && p.keyframes));

    const exits = panelItems.map(({ element, keyframes }) =>
      element.animate(keyframes, { duration: 260, easing: "ease-in", fill: "both" })
    );

    await Promise.allSettled(exits.map(a => a.finished));

    // Cancel the selected panel's animation so CSS (not the JS fill) controls
    // its opacity in the expanded view — other panels stay hidden via CSS
    const selectedEl = getPanelElement(section);
    panelItems.forEach(({ element }, i) => {
      if (element === selectedEl) exits[i].cancel();
    });

    expandedPhase.value = "expanded";
    await nextTick();
    exits.forEach((animation) => animation.cancel());

  } else {
    // FLIP the selected panel back to its dashboard position, slide others back in
    const panel = getPanelElement(section);
    if (!panel) {
      expandedPhase.value = "collapsed";
      expandedSection.value = null;
      return;
    }

    const firstRect = panel.getBoundingClientRect();
    expandedPhase.value = "collapsing";
    await nextTick();

    const lastRect = panel.getBoundingClientRect();
    const sectionAnimation = panel.animate(
      [
        {
          transformOrigin: "top left",
          transform: `translate(${firstRect.left - lastRect.left}px, ${firstRect.top - lastRect.top}px) scale(${firstRect.width / lastRect.width}, ${firstRect.height / lastRect.height})`,
        },
        { transformOrigin: "top left", transform: "translate(0,0) scale(1,1)" },
      ],
      { duration: 520, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" }
    );

    const enters = [
      { element: heroPanel.value,         keyframes: getPanelKeyframes(section, "city", false) },
      { element: incomePanel.value,        keyframes: getPanelKeyframes(section, "economic", false) },
      { element: housingPanel.value,       keyframes: getPanelKeyframes(section, "housing", false) },
      { element: affordabilityPanel.value, keyframes: getPanelKeyframes(section, "affordability", false) },
      { element: climatePanel.value,       keyframes: getPanelKeyframes(section, "climate", false) },
      { element: lifestylePanel.value,     keyframes: getPanelKeyframes(section, "lifestyle", false) },
    ]
      .filter((p): p is { element: HTMLElement; keyframes: Keyframe[] } => Boolean(p.element && p.keyframes))
      .map(({ element, keyframes }) =>
        element.animate(keyframes, { duration: 440, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" })
      );

    await Promise.allSettled([sectionAnimation.finished, ...enters.map(a => a.finished)]);
    expandedPhase.value = "collapsed";
    expandedSection.value = null;
    await nextTick();
    sectionAnimation.cancel();
    enters.forEach((animation) => animation.cancel());
  }
}

const sectionRouteNames: Record<ExpandableSection, string> = {
  city: 'city-details',
  economic: 'city-income',
  housing: 'city-housing',
  affordability: 'city-affordability',
  climate: 'city-climate',
  lifestyle: 'city-lifestyle',
};

let programmaticNavigation = false;

async function openSectionDetails(section: ExpandableSection) {
  if (expandedPhase.value !== "collapsed") return;
  scrollMobileDetailToTop();
  expandedSection.value = section;
  openedSections[section] = true;
  getPrefetcher(section)(state.value, city.value);
  programmaticNavigation = true;
  router.push({ name: sectionRouteNames[section], params: { state: state.value, city: city.value } });
  await animateSectionTransition(section, true);
}

async function closeExpandedSection() {
  if (expandedPhase.value !== "expanded" || !expandedSection.value) return;
  await animateSectionTransition(expandedSection.value, false);
  programmaticNavigation = true;
  router.push({ name: 'city', params: { state: state.value, city: city.value } });
}
</script>

<template>
  <AuthModal v-if="showAuthModal" :mode="authModalMode" @close="showAuthModal = false" />

  <!-- Before search: full hero landing -->
  <div
    v-if="showLanding"
    ref="landingStage"
    class="hero-landing"
    :class="{
      'hero-landing--transitioning': transitioningToDashboard || transitioningToLanding,
      'hero-landing--returning': transitioningToLanding,
    }"
  >
    <!-- Dot grid (drifting layer) -->
    <div ref="heroDots" class="hero-dots"></div>

    <ThemeToggle />

    <div v-if="user" class="hero-landing__account">
      <div ref="userMenuRef" class="user-menu hero-auth__user-menu" @mouseenter="openUserMenuHover" @mouseleave="closeUserMenuHover">
        <button
          class="user-menu__btn hero-auth__menu-btn"
          :class="{ 'hero-auth__menu-btn--open': userMenuOpen }"
          @click.stop="toggleUserMenu"
        >
          <Transition name="menu-name-slide">
            <span v-if="userMenuOpen || userMenuHovered" class="user-menu__name hero-auth__menu-name">{{ displayName() ?? 'Account' }}</span>
          </Transition>
          <span class="user-menu__avatar">{{ (displayName() ?? 'A')[0].toUpperCase() }}</span>
        </button>
        <Transition name="user-menu-fade">
        <div v-if="userMenuOpen" class="user-menu__dropdown" @click.stop>
          <button class="user-menu__header user-menu__header-btn" @click="navigateToAccountPage('profile')">
            <span class="user-menu__header-avatar">{{ (displayName() ?? 'A')[0].toUpperCase() }}</span>
            <div class="user-menu__header-info">
              <span class="user-menu__header-name">{{ displayName() ?? 'Account' }}</span>
              <span class="user-menu__header-email">{{ user.email }}</span>
            </div>
          </button>
          <div class="user-menu__divider"></div>
          <button class="user-menu__item" @click="navigateToAccountPage('friends')">
            <span class="mdi mdi-account-group-outline user-menu__item-icon"></span>
            Friends
          </button>
          <button class="user-menu__item" @click="navigateToAccountPage('favorites')">
            <span class="mdi mdi-star-outline user-menu__item-icon"></span>
            Favorites
          </button>
          <button class="user-menu__item" @click="navigateToAccountPage('saved-comparisons')">
            <span class="mdi mdi-bookmark-multiple-outline user-menu__item-icon"></span>
            Saved Comparisons
          </button>
          <div class="user-menu__divider"></div>
          <button class="user-menu__item user-menu__item--danger" @click="signOutFromLanding">
            <span class="mdi mdi-logout user-menu__item-icon"></span>
            Sign out
          </button>
        </div>
        </Transition>
      </div>
    </div>

    <!-- Floating city chips -->
    <div
      v-for="(slot, i) in chipSlots"
      :key="slot.id"
      class="hero-chip"
      :class="{ 'hero-chip--mobile-hide': slot.mobileHide }"
      :style="{ [slot.side]: slot.x, top: (isMobile && slot.mobileTop) ? slot.mobileTop : slot.top, '--chip-duration': slot.duration, '--chip-delay': slot.delay }"
      @animationiteration="cycleSlot(i)"
    >
      <span class="hero-chip__label">{{ slot.label }}</span>
      <span class="hero-chip__divider">·</span>
      <span class="hero-chip__stat">{{ slot.stat }}</span>
    </div>

    <div ref="landingContent" class="hero-content">
      <span class="hero-logo">Atlas</span>
      <h1 class="hero-headline">Compare cities. Make informed decisions.</h1>
      <p class="hero-tagline">
        <template v-if="taglineHighlighted">
          <span
            v-for="(word, i) in taglineWords"
            :key="i"
            class="hero-tagline__word"
            :class="{ 'hero-tagline__word--selected': i >= taglineWords.length - selectedWordCount }"
          >{{ word }}</span>
        </template>
        <template v-else>{{ displayedTagline }}</template><span
          v-if="!taglineHighlighted"
          class="hero-tagline__cursor"
          :class="{ 'hero-tagline__cursor--done': typewriterDone }"
        >|</span>
      </p>
      <div class="hero-mode-toggle" role="group" aria-label="Choose mode">
        <button
          class="hero-mode-toggle__option"
          :class="{ 'hero-mode-toggle__option--active': heroMode === 'search' }"
          @click="onHeroModeToggle('search')"
        >
          <span class="mdi mdi-magnify"></span>
          Search
        </button>
        <button
          class="hero-mode-toggle__option"
          :class="{ 'hero-mode-toggle__option--active': heroMode === 'compare' }"
          @click="onHeroModeToggle('compare')"
        >
          <span class="mdi mdi-compare-horizontal"></span>
          Compare
        </button>
      </div>
      <div ref="landingSearch">
        <CitySearch
          v-if="heroMode === 'search'"
          :initial-city="city"
          :initial-state="state"
          @search="onSearch"
        />
        <div v-else class="hero-compare-picker">
          <CompareCitySearch
            label="Choose City"
            tone="a"
            variant="card"
            :button-label="compareCityA.city ? 'Update' : 'Add'"
            :initial-city="compareCityA.city"
            :initial-state="compareCityA.state"
            @search="onCompareASearch"
          />
          <div class="hero-compare-picker__divider"></div>
          <CompareCitySearch
            label="Choose City"
            tone="b"
            variant="card"
            :button-label="compareCityB.city ? 'Update' : 'Add'"
            :initial-city="compareCityB.city"
            :initial-state="compareCityB.state"
            @search="onCompareBSearch"
          />
          <button
            class="hero-compare-picker__submit"
            :disabled="!comparePartialReady"
            @click="submitHeroCompare"
          >
            <span class="mdi mdi-arrow-right-circle-outline"></span>
            Compare Cities
          </button>
        </div>
      </div>
      <div v-if="!user" class="hero-auth">
        <div class="hero-auth__actions">
          <button class="hero-auth__register" @click="openAuth('register')">Create a free account</button>
        </div>
        <span class="hero-auth__login">
          Already have an account?
          <button class="hero-auth__login-btn" @click="openAuth('login')">Sign in</button>
        </span>
      </div>
      <div v-else class="hero-auth hero-auth--welcome">
        <span class="hero-auth__welcome">Welcome back, {{ displayName() ?? 'there' }}!</span>
      </div>
    </div>
  </div>

  <!-- After search: city data view -->
  <div v-if="showDashboard" ref="dashboardStage" class="container">
    <DashboardHeader :city="city" :state="state" @logo-click="router.push({ name: 'search' })" @search="onSearch">
      <template v-if="!cityNotFound && !sectionExpanded" #actions>
        <div ref="cityShareMenuRef" class="score-pills__share-wrap">
          <button
            class="score-pills__compare-btn"
            :class="{ 'score-pills__compare-btn--active': cityShareMenuOpen }"
            @click.stop="openCityShareOptions"
          >
            <span class="mdi" :class="cityShareCopied ? 'mdi-check' : 'mdi-share-variant-outline'"></span>
            {{ cityShareCopied ? 'Copied Link' : 'Share City' }}
          </button>

          <div v-if="cityShareMenuOpen" class="score-pills__share-menu" @click.stop>
            <button
              v-if="supportsCityNativeShare"
              class="score-pills__share-item score-pills__share-item--primary"
              @click="shareCityNatively"
            >
              <span class="mdi mdi-cellphone-arrow-down score-pills__share-item-icon"></span>
              Share via device
            </button>
            <button class="score-pills__share-item" @click="copyCityShareLink">
              <span class="mdi mdi-content-copy score-pills__share-item-icon"></span>
              Copy link
            </button>
            <button class="score-pills__share-item" @click="shareCityToMessages">
              <span class="mdi mdi-message-text-outline score-pills__share-item-icon"></span>
              Messages
            </button>
            <button class="score-pills__share-item" @click="shareCityToEmail">
              <span class="mdi mdi-email-outline score-pills__share-item-icon"></span>
              Email
            </button>
            <button class="score-pills__share-item" @click="shareCityToX">
              <span class="mdi mdi-twitter score-pills__share-item-icon"></span>
              X
            </button>
            <button class="score-pills__share-item" @click="shareCityToFacebook">
              <span class="mdi mdi-facebook score-pills__share-item-icon"></span>
              Facebook
            </button>
            <button class="score-pills__share-item" @click="shareCityToLinkedIn">
              <span class="mdi mdi-linkedin score-pills__share-item-icon"></span>
              LinkedIn
            </button>
          </div>
        </div>
        <button class="score-pills__compare-btn" @click="openCompareView">
          <span class="mdi mdi-compare-horizontal score-pills__compare-icon"></span>
          Compare City
        </button>
      </template>
    </DashboardHeader>

    <!-- Score pills bar (expanded-detail breadcrumb only) -->
    <div v-if="!cityNotFound && sectionExpanded" ref="scorePills" class="score-pills score-pills--expanded">
      <button class="breadcrumb score-pills__back" @click="closeExpandedSection">
        <span class="breadcrumb__arr breadcrumb__arr--1 mdi mdi-arrow-left"></span>
        <span class="breadcrumb__text">Back</span>
        <span class="breadcrumb__arr breadcrumb__arr--2 mdi mdi-arrow-left"></span>
        <span class="breadcrumb__circle"></span>
      </button>
      <ScoreAttribution :dims="SECTION_DIMS[expandedSection!]" />
      <span class="housing-exp__subtitle score-pills__page-title">{{
        expandedSection === 'city' ? 'City Details' :
        expandedSection === 'economic' ? 'Income Details' :
        expandedSection === 'housing' ? 'Housing Details' :
        expandedSection === 'climate' ? 'Climate Details' :
        expandedSection === 'lifestyle' ? 'Lifestyle & Connectivity Details' :
        'Affordability Details'
      }}</span>
    </div>

    <!-- City not found state -->
    <div v-if="cityNotFound" ref="cityNotFoundPanel" class="city-not-found">
      <span class="city-not-found__icon mdi mdi-map-search-outline"></span>
      <h2 class="city-not-found__heading">No data found</h2>
      <p class="city-not-found__body">
        We don't have data for <strong>{{ cityDisplayName }}, {{ state.toUpperCase() }}</strong> yet.
        Try searching for a larger nearby city, or check that the spelling is correct.
      </p>
      <button class="city-not-found__btn" @click="resetSearch">Try Another City</button>
    </div>

    <!-- Data cards grid -->
    <div
      v-if="!cityNotFound"
      ref="dashboardShell"
      class="dashboard-shell"
      :class="{
        'dashboard-shell--section-active': sectionExpanded,
        'dashboard-shell--section-settled': expandedPhase === 'expanded',
      }"
    >
      <div
        ref="heroPanel"
        class="dashboard-panel dashboard-panel--hero expansion-slot"
        :class="[
          { 'dashboard-panel--expanded': expandedLayoutSection === 'city' },
          { 'expansion-slot--selected': expandedSection === 'city' },
          `expansion-slot--${expandedPhase}`,
        ]"
      >
        <div class="expansion-slot__layer expansion-slot__layer--overview">
          <CityInfoSection
            :city="city"
            :state="state"
            :has-missing-data="hasMissingData"
            @score="scores.people = $event"
            @not-found="cityNotFound = true"
            @auth-required="openAuth('login')"
            @expand="openSectionDetails('city')"
          />
        </div>
        <div
          v-if="openedSections.city"
          class="expansion-slot__layer expansion-slot__layer--details"
        >
          <CityInfoExpandedView
            :city="city"
            :state="state"
            @close="closeExpandedSection"
          />
        </div>
      </div>

      <div v-if="!sectionExpanded" style="grid-column: 1 / -1;">
        <AtlasScoreCard :city="city" :state="state" @auth-required="openAuth('login')" />
      </div>

      <div
        ref="incomePanel"
        class="dashboard-panel dashboard-panel--income expansion-slot"
        :class="[
          { 'dashboard-panel--expanded': expandedLayoutSection === 'economic' },
          { 'expansion-slot--selected': expandedSection === 'economic' },
          `expansion-slot--${expandedPhase}`,
        ]"
      >
        <div class="expansion-slot__layer expansion-slot__layer--overview">
          <IncomeSection
            :city="city"
            :state="state"
            @score="scores.economic = $event"
            @expand="openSectionDetails('economic')"
            @data-unavailable="dataGaps.economic = $event"
          />
        </div>
        <div
          v-if="openedSections.economic"
          class="expansion-slot__layer expansion-slot__layer--details"
        >
          <IncomeExpandedView
            :city="city"
            :state="state"
            @close="closeExpandedSection"
          />
        </div>
      </div>

      <div
        ref="housingPanel"
        class="dashboard-panel dashboard-panel--housing expansion-slot"
        :class="[
          { 'dashboard-panel--expanded': expandedLayoutSection === 'housing' },
          { 'expansion-slot--selected': expandedSection === 'housing' },
          `expansion-slot--${expandedPhase}`,
        ]"
      >
        <div class="expansion-slot__layer expansion-slot__layer--overview">
          <HousingSection
            :city="city"
            :state="state"
            @score="scores.housing = $event"
            @expand="openSectionDetails('housing')"
            @data-unavailable="dataGaps.housing = $event"
          />
        </div>

        <div
          v-if="openedSections.housing"
          class="expansion-slot__layer expansion-slot__layer--details"
        >
          <HousingExpandedView
            :city="city"
            :state="state"
            @close="closeExpandedSection"
          />
        </div>
      </div>

      <div
        ref="affordabilityPanel"
        class="dashboard-panel dashboard-panel--affordability expansion-slot"
        :class="[
          { 'dashboard-panel--expanded': expandedLayoutSection === 'affordability' },
          { 'expansion-slot--selected': expandedSection === 'affordability' },
          `expansion-slot--${expandedPhase}`,
        ]"
      >
        <div class="expansion-slot__layer expansion-slot__layer--overview">
          <AffordabilitySection
            :city="city"
            :state="state"
            @score="scores.affordability = $event"
            @expand="openSectionDetails('affordability')"
            @data-unavailable="dataGaps.affordability = $event"
          />
        </div>
        <div
          v-if="openedSections.affordability"
          class="expansion-slot__layer expansion-slot__layer--details"
        >
          <AffordabilityExpandedView
            :city="city"
            :state="state"
            @close="closeExpandedSection"
          />
        </div>
      </div>

      <div
        ref="climatePanel"
        class="dashboard-panel dashboard-panel--climate expansion-slot"
        :class="[
          { 'dashboard-panel--expanded': expandedLayoutSection === 'climate' },
          { 'expansion-slot--selected': expandedSection === 'climate' },
          `expansion-slot--${expandedPhase}`,
        ]"
      >
        <div class="expansion-slot__layer expansion-slot__layer--overview">
          <ClimateSection
            :city="city"
            :state="state"
            @score="scores.climate = $event"
            @expand="openSectionDetails('climate')"
          />
        </div>
        <div
          v-if="openedSections.climate"
          class="expansion-slot__layer expansion-slot__layer--details"
        >
          <ClimateExpandedView
            :city="city"
            :state="state"
            @close="closeExpandedSection"
          />
        </div>
      </div>

      <div
        ref="lifestylePanel"
        class="dashboard-panel dashboard-panel--lifestyle expansion-slot"
        :class="[
          { 'dashboard-panel--expanded': expandedLayoutSection === 'lifestyle' },
          { 'expansion-slot--selected': expandedSection === 'lifestyle' },
          `expansion-slot--${expandedPhase}`,
        ]"
      >
        <div class="expansion-slot__layer expansion-slot__layer--overview">
          <LifestyleSection
            :city="city"
            :state="state"
            @score="scores.lifestyle = $event"
            @expand="openSectionDetails('lifestyle')"
          />
        </div>
        <div
          v-if="openedSections.lifestyle"
          class="expansion-slot__layer expansion-slot__layer--details"
        >
          <LifestyleExpandedView
            :city="city"
            :state="state"
            @close="closeExpandedSection"
          />
        </div>
      </div>
    </div>
  </div>
</template>
