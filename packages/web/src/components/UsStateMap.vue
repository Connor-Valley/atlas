<script setup lang="ts">
import { computed } from 'vue';
import { US_STATE_PATHS, US_MAP_VIEWBOX } from '../lib/usStatePaths';

const props = defineProps<{
  states: { code: string; name: string }[];
  hoveredCode?: string | null;
}>();

const emit = defineEmits<{
  (e: 'select', code: string): void;
  (e: 'hover', code: string | null): void;
}>();

const nameByCode = computed(() => {
  const map: Record<string, string> = {};
  for (const s of props.states) map[s.code.toUpperCase()] = s.name;
  return map;
});

const stateEntries = computed(() => Object.entries(US_STATE_PATHS).filter(([code]) => code !== 'DC'));

// DC's real land boundary is a sliver too small to click reliably at map scale,
// so it's rendered as an enlarged circle marker instead (matches the source
// SVG's own "dccircle" convention, just with a bigger radius for usability).
const DC_MARKER = { cx: 801.6, cy: 252.1, r: 9 };

// Invisible padded hit-area for Hawaii, sized from its bounding box in the
// path data — the actual archipelago is too small to click reliably on its own.
const HAWAII_FRAME = { x: 230, y: 488, width: 134, height: 118, rx: 14 };
</script>

<template>
  <svg class="us-map" :viewBox="US_MAP_VIEWBOX" role="img" aria-label="Map of the United States">
    <rect
      class="us-map__frame--hawaii"
      v-bind="HAWAII_FRAME"
      role="button"
      :aria-label="nameByCode['HI'] ?? 'Hawaii'"
      tabindex="0"
      @click="emit('select', 'HI')"
      @keydown.enter="emit('select', 'HI')"
      @mouseenter="emit('hover', 'HI')"
      @mouseleave="emit('hover', null)"
      @focus="emit('hover', 'HI')"
      @blur="emit('hover', null)"
    ><title>{{ nameByCode['HI'] ?? 'Hawaii' }}</title></rect>

    <path
      v-for="[code, d] in stateEntries"
      :key="code"
      :d="d"
      class="us-map__state"
      :class="{ 'us-map__state--hovered': hoveredCode === code }"
      role="button"
      :aria-label="nameByCode[code] ?? code"
      tabindex="0"
      @click="emit('select', code)"
      @keydown.enter="emit('select', code)"
      @mouseenter="emit('hover', code)"
      @mouseleave="emit('hover', null)"
      @focus="emit('hover', code)"
      @blur="emit('hover', null)"
    ><title>{{ nameByCode[code] ?? code }}</title></path>

    <circle
      :cx="DC_MARKER.cx"
      :cy="DC_MARKER.cy"
      :r="DC_MARKER.r"
      class="us-map__state us-map__state--dc"
      :class="{ 'us-map__state--hovered': hoveredCode === 'DC' }"
      role="button"
      :aria-label="nameByCode['DC'] ?? 'District of Columbia'"
      tabindex="0"
      @click="emit('select', 'DC')"
      @keydown.enter="emit('select', 'DC')"
      @mouseenter="emit('hover', 'DC')"
      @mouseleave="emit('hover', null)"
      @focus="emit('hover', 'DC')"
      @blur="emit('hover', null)"
    ><title>{{ nameByCode['DC'] ?? 'District of Columbia' }}</title></circle>
  </svg>
</template>

<style scoped>
.us-map {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}

.us-map__state {
  fill: var(--bg-card-inner);
  stroke: var(--text-muted);
  stroke-opacity: 0.55;
  stroke-width: 1.1;
  stroke-linejoin: round;
  cursor: pointer;
  transition: fill 0.15s ease, filter 0.15s ease;
  outline: none;
}

.us-map__state:hover,
.us-map__state--hovered,
.us-map__state:focus-visible {
  fill: var(--accent);
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 45%, transparent));
}

.us-map__state--dc {
  stroke: var(--bg-page);
  stroke-opacity: 1;
  stroke-width: 1;
}

/* Invisible enlarged hit-area for Hawaii — no visible box, just a bigger
   click/hover/focus target than the tiny archipelago shape itself. */
.us-map__frame--hawaii {
  fill: transparent;
  stroke: none;
  pointer-events: auto;
  cursor: pointer;
  outline: none;
}
</style>
