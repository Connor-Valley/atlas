<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted } from "vue";
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

const scores = reactive({
  economic: null as number | null,
  housing: null as number | null,
  affordability: null as number | null,
  people: null as number | null,
});

const cityDisplayName = computed(() =>
  city.value.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
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

onMounted(() => {
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
});

function onSearch(payload: { city: string; state: string }) {
  city.value = payload.city;
  state.value = payload.state;
  hasSearched.value = true;

  scores.economic = null;
  scores.housing = null;
  scores.affordability = null;
  scores.people = null;

  router.replace(`/city/${payload.state}/${payload.city}`);
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

    <!-- Hero city info section -->
    <CityInfoSection
      :city="city"
      :state="state"
      @score="scores.people = $event"
    />

    <!-- Data cards grid -->
    <div class="data-grid">
      <IncomeSection
        :city="city"
        :state="state"
        @score="scores.economic = $event"
      />
      <HousingSection
        :city="city"
        :state="state"
        @score="scores.housing = $event"
      />
      <AffordabilitySection
        class="data-grid__wide"
        :city="city"
        :state="state"
        @score="scores.affordability = $event"
      />
    </div>
  </div>
</template>
