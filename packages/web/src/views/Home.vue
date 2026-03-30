<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import CitySearch from "../components/CitySearch.vue";
import CityInfoSection from "../components/CityInfoSection.vue";
import HousingSection from "../components/HousingSection.vue";
import HousingExpandedView from "../components/HousingExpandedView.vue";
import IncomeSection from "../components/IncomeSection.vue";
import IncomeExpandedView from "../components/IncomeExpandedView.vue";
import AffordabilitySection from "../components/AffordabilitySection.vue";
import AffordabilityExpandedView from "../components/AffordabilityExpandedView.vue";
import { prefetchDetailedHousing } from "../api/housing";
import { prefetchIncome } from "../api/income";
import { prefetchAffordability } from "../api/affordability";

const props = defineProps<{
  state?: string;
  city?: string;
}>();

const router = useRouter();

const city = ref("");
const state = ref("");
const hasSearched = ref(false);
const cityNotFound = ref(false);
type ExpandableSection = "economic" | "housing" | "affordability";
const expandedSection = ref<ExpandableSection | null>(null);
const expandedPhase = ref<"collapsed" | "expanding" | "expanded" | "collapsing">("collapsed");
const openedSections = reactive<Record<ExpandableSection, boolean>>({
  economic: false,
  housing: false,
  affordability: false,
});
const heroPanel = ref<HTMLElement | null>(null);
const incomePanel = ref<HTMLElement | null>(null);
const housingPanel = ref<HTMLElement | null>(null);
const affordabilityPanel = ref<HTMLElement | null>(null);

const scores = reactive({
  economic: null as number | null,
  housing: null as number | null,
  affordability: null as number | null,
  people: null as number | null,
});

const cityDisplayName = computed(() =>
  city.value.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
);

const sectionExpanded = computed(
  () => expandedPhase.value === "expanded"
);
const expandedLayoutSection = computed(() =>
  sectionExpanded.value ? expandedSection.value : null
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
let taglineIndex = 0;
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
  { id: 1, side: 'left'  as const, x: '3%',  top: '18%', duration: '13s', delay: '0s'  },
  { id: 2, side: 'left'  as const, x: '9%',  top: '43%', duration: '16s', delay: '4s'  },
  { id: 3, side: 'left'  as const, x: '5%',  top: '65%', duration: '12s', delay: '8s'  },
  { id: 4, side: 'left'  as const, x: '12%', top: '82%', duration: '15s', delay: '2s'  },
  { id: 5, side: 'right' as const, x: '4%',  top: '24%', duration: '14s', delay: '6s'  },
  { id: 6, side: 'right' as const, x: '11%', top: '51%', duration: '11s', delay: '1s'  },
  { id: 7, side: 'right' as const, x: '6%',  top: '70%', duration: '17s', delay: '9s'  },
  { id: 8, side: 'right' as const, x: '13%', top: '86%', duration: '13s', delay: '5s'  },
].map((slot, i) => ({ ...slot, label: cityPool[i].label, stat: cityPool[i].stat })));
poolCursor = 8;

function cycleSlot(index: number) {
  const city = cityPool[poolCursor % cityPool.length];
  poolCursor++;
  chipSlots.value[index] = { ...chipSlots.value[index], label: city.label, stat: city.stat };
}


let typeTimer: ReturnType<typeof setTimeout> | null = null;

function typeTagline() {
  const target = taglines[taglineIndex];
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
          taglineIndex = (taglineIndex + 1) % taglines.length;
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

onMounted(() => {
  window.addEventListener('keydown', onKeydown);

  if (props.state && props.city) {
    state.value = props.state;
    city.value = props.city;
    hasSearched.value = true;
    displayedTagline.value = taglines[0];
    typewriterDone.value = true;
    return;
  }

  typeTagline();
});

onUnmounted(() => {
  if (typeTimer) clearTimeout(typeTimer);
  window.removeEventListener('keydown', onKeydown);
});

function onSearch(payload: { city: string; state: string }) {
  city.value = payload.city;
  state.value = payload.state;
  hasSearched.value = true;

  scores.economic = null;
  scores.housing = null;
  scores.affordability = null;
  scores.people = null;
  cityNotFound.value = false;
  expandedSection.value = null;
  expandedPhase.value = "collapsed";
  openedSections.economic = false;
  openedSections.housing = false;
  openedSections.affordability = false;

  router.replace(`/city/${payload.state}/${payload.city}`);
}

function resetSearch() {
  hasSearched.value = false;
  city.value = '';
  state.value = '';
  expandedSection.value = null;
  expandedPhase.value = "collapsed";
  openedSections.economic = false;
  openedSections.housing = false;
  openedSections.affordability = false;
  router.replace('/');
}

function getPanelElement(section: ExpandableSection) {
  if (section === "economic") return incomePanel.value;
  if (section === "housing") return housingPanel.value;
  return affordabilityPanel.value;
}

function getPrefetcher(section: ExpandableSection) {
  if (section === "economic") return prefetchIncome;
  if (section === "housing") return prefetchDetailedHousing;
  return prefetchAffordability;
}

function getPanelKeyframes(
  selectedSection: ExpandableSection,
  panel: "hero" | ExpandableSection,
  expand: boolean,
) {
  // Selected panel slides out/in from its own natural direction
  if (panel === selectedSection) {
    const dirs: Record<ExpandableSection, [number, number]> = {
      economic:     [-56, 0],
      housing:      [ 56, 0],
      affordability: [0, 48],
    };
    const [x, y] = dirs[selectedSection];
    const gone = { transform: `translate(${x}px, ${y}px)`, opacity: 0 };
    const home = { transform: "translate(0,0)", opacity: 1 };
    return expand ? [home, gone] : [gone, home];
  }
  if (panel === "hero") {
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
      { element: heroPanel.value,         keyframes: getPanelKeyframes(section, "hero", true) },
      { element: incomePanel.value,        keyframes: getPanelKeyframes(section, "economic", true) },
      { element: housingPanel.value,       keyframes: getPanelKeyframes(section, "housing", true) },
      { element: affordabilityPanel.value, keyframes: getPanelKeyframes(section, "affordability", true) },
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
      { element: heroPanel.value,         keyframes: getPanelKeyframes(section, "hero", false) },
      { element: incomePanel.value,        keyframes: getPanelKeyframes(section, "economic", false) },
      { element: housingPanel.value,       keyframes: getPanelKeyframes(section, "housing", false) },
      { element: affordabilityPanel.value, keyframes: getPanelKeyframes(section, "affordability", false) },
    ]
      .filter((p): p is { element: HTMLElement; keyframes: Keyframe[] } => Boolean(p.element && p.keyframes))
      .map(({ element, keyframes }) =>
        element.animate(keyframes, { duration: 440, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" })
      );

    await Promise.allSettled([sectionAnimation.finished, ...enters.map(a => a.finished)]);
    expandedPhase.value = "collapsed";
    expandedSection.value = null;
  }
}

async function openSectionDetails(section: ExpandableSection) {
  if (expandedPhase.value !== "collapsed") return;
  expandedSection.value = section;
  openedSections[section] = true;
  getPrefetcher(section)(state.value, city.value);
  await animateSectionTransition(section, true);
}

async function closeExpandedSection() {
  if (expandedPhase.value !== "expanded" || !expandedSection.value) return;
  await animateSectionTransition(expandedSection.value, false);
}
</script>

<template>
  <!-- Before search: full hero landing -->
  <div v-if="!hasSearched" class="hero-landing">
    <!-- Dot grid (drifting layer) -->
    <div class="hero-dots"></div>

    <!-- Floating city chips -->
    <div
      v-for="(slot, i) in chipSlots"
      :key="slot.id"
      class="hero-chip"
      :style="{ [slot.side]: slot.x, top: slot.top, '--chip-duration': slot.duration, '--chip-delay': slot.delay }"
      @animationiteration="cycleSlot(i)"
    >
      <span class="hero-chip__label">{{ slot.label }}</span>
      <span class="hero-chip__divider">·</span>
      <span class="hero-chip__stat">{{ slot.stat }}</span>
    </div>

    <div class="hero-content">
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
      <span class="site-logo-wrap" @click="resetSearch">
        <span class="site-logo">Atlas</span>
        <span class="site-logo-accent" aria-hidden="true"></span>
      </span>
      <CitySearch
        :initial-city="city"
        :initial-state="state"
        @search="onSearch"
      />
    </header>

    <!-- Score pills bar -->
    <div class="score-pills">
      <div
        class="score-pill"
        :class="{ 'score-pill--top': topCategory === 'economic' }"
      >
        <span class="score-pill__label">Economic</span>
        <span class="score-pill__value">{{ scores.economic !== null ? scores.economic : '—' }}</span>
      </div>
      <div
        class="score-pill"
        :class="{ 'score-pill--top': topCategory === 'housing' }"
      >
        <span class="score-pill__label">Housing</span>
        <span class="score-pill__value">{{ scores.housing !== null ? scores.housing : '—' }}</span>
      </div>
      <div
        class="score-pill"
        :class="{ 'score-pill--top': topCategory === 'affordability' }"
      >
        <span class="score-pill__label">Affordability</span>
        <span class="score-pill__value">{{ scores.affordability !== null ? scores.affordability : '—' }}</span>
      </div>
      <div
        class="score-pill"
        :class="{ 'score-pill--top': topCategory === 'people' }"
      >
        <span class="score-pill__label">People</span>
        <span class="score-pill__value">{{ scores.people !== null ? scores.people : '—' }}</span>
      </div>
    </div>

    <!-- City not found state -->
    <div v-if="cityNotFound" class="city-not-found">
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
      class="dashboard-shell"
      :class="{
        'dashboard-shell--section-active': sectionExpanded,
        'dashboard-shell--section-settled': expandedPhase === 'expanded',
      }"
    >
      <div ref="heroPanel" class="dashboard-panel dashboard-panel--hero">
        <CityInfoSection
          :city="city"
          :state="state"
          @score="scores.people = $event"
          @error="cityNotFound = true"
        />
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
    </div>
  </div>
</template>
