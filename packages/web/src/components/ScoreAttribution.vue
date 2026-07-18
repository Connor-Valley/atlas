<script setup lang="ts">
import { computed } from "vue";
import { DIMS } from "../lib/atlasScoreDims";
import type { DimensionScores } from "../lib/atlasScore";

const props = defineProps<{ dims: Array<keyof DimensionScores> }>();

const items = computed(() =>
  props.dims.map(key => DIMS.find(d => d.key === key)).filter((d): d is typeof DIMS[number] => Boolean(d))
);
</script>

<template>
  <div v-if="items.length" class="score-attribution">
    <span class="score-attribution__label">
      <span class="mdi mdi-map-marker-star-outline"></span> Feeds into your Atlas Score
    </span>
    <span v-for="item in items" :key="item.key" class="score-attribution__badge">
      {{ item.label }}
      <span class="score-attribution__tooltip">{{ item.tooltip }}</span>
    </span>
  </div>
</template>

<style scoped>
.score-attribution {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.76rem;
  min-width: 0;
}

.score-attribution__label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-muted);
  font-weight: 600;
}

.score-attribution__badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--bg-card-inner);
  color: var(--text-secondary);
  font-weight: 600;
  cursor: default;
}

.score-attribution__tooltip {
  display: none;
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-card-inner);
  color: var(--text-secondary);
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.71rem;
  font-weight: 400;
  line-height: 1.5;
  white-space: normal;
  width: 220px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 100;
  pointer-events: none;
}

.score-attribution__badge:hover .score-attribution__tooltip {
  display: block;
}
</style>
