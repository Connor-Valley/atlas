<script setup lang="ts">
import { computed } from "vue";
import { cityLabel } from "../lib/compare";

const props = defineProps<{
  slotIndex: number;
  name: string;
  state: string;
  county: string;
  population: number;
  atlasScore: number | null;
  compact?: boolean;
  isBaseline?: boolean;
  showBaselineAction?: boolean;
}>();

defineEmits<{ remove: []; "set-baseline": [] }>();

const letter = computed(() => String.fromCharCode(65 + props.slotIndex));
const meta = computed(() => `${props.state.toUpperCase()} · ${props.county} · ${props.population.toLocaleString()}`);
</script>

<template>
  <div class="cmp-col" :style="{ '--slot-color': `var(--compare-slot-${slotIndex + 1})` }">
    <div class="cmp-col__top">
      <span class="mdi mdi-drag-vertical cmp-col__drag-handle" title="Drag to reorder"></span>
      <span class="cmp-col__badge">{{ letter }}</span>
      <span class="cmp-col__name" :title="cityLabel(name, state)">{{ name }}<span class="cmp-col__name-state">, {{ state.toUpperCase() }}</span></span>
      <div class="cmp-col__spacer"></div>
      <span
        v-if="atlasScore != null"
        class="cmp-col__score cmp-col__score--inline"
        :title="`Atlas Score: ${atlasScore}/100`"
      >{{ atlasScore }}<span class="cmp-col__score-max">/100</span></span>
      <span
        v-if="!compact && isBaseline && showBaselineAction"
        class="cmp-col__baseline-badge"
        title="Baseline for the delta comparison"
      >BASELINE</span>
      <button
        v-else-if="!compact && showBaselineAction"
        class="cmp-col__baseline-btn"
        type="button"
        title="Set as baseline for the delta comparison"
        @click="$emit('set-baseline')"
      ><span class="mdi mdi-flag-outline"></span></button>
      <button class="cmp-col__remove" type="button" aria-label="Remove city" @click="$emit('remove')">×</button>
    </div>
    <div class="cmp-col__expand">
      <div class="cmp-col__expand-inner">
        <div class="cmp-col__meta">{{ meta }}</div>
        <div v-if="atlasScore != null" class="cmp-col__score-row">
          <span class="cmp-col__score">{{ atlasScore }}</span>
          <span class="cmp-col__score-label">/100 Atlas Score</span>
        </div>
        <div v-if="atlasScore != null" class="cmp-col__bar">
          <div class="cmp-col__bar-fill" :style="{ width: `${atlasScore}%` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cmp-col {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  /* --cmp-collapse (0 expanded, 1 compact) is set on the header row by Compare.vue from
     the scroll position. The vertical sizes below that shrink with it (this padding, the
     top row's margin, and the expand block) must add up to its --cmp-collapse-dist. */
  padding: calc(14px - 4px * var(--cmp-collapse, 0)) 16px;
  min-width: 0;
  border-left: 1px solid var(--border-subtle);
}

.cmp-col__top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: calc(8px * (1 - var(--cmp-collapse, 0)));
}

.cmp-col__drag-handle {
  flex: none;
  font-size: 1.2rem;
  line-height: 1;
  margin-left: -6px;
  color: var(--text-muted);
  cursor: grab;
}

.cmp-col__drag-handle:active {
  cursor: grabbing;
}

.cmp-col--sortable-ghost {
  opacity: 0.4;
}

/* Baseline controls fade and fold away as the header collapses. The negative margin
   cancels the flex gap they would otherwise leave behind. */
.cmp-col__baseline-btn,
.cmp-col__baseline-badge {
  margin-left: calc(-8px * var(--cmp-collapse, 0));
  opacity: calc(1 - 2 * var(--cmp-collapse, 0));
  overflow: hidden;
}

.cmp-col__baseline-btn {
  flex: none;
  max-width: calc(22px * (1 - var(--cmp-collapse, 0)));
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.85rem;
  cursor: pointer;
}

.cmp-col__baseline-btn:hover {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
}

.cmp-col__baseline-badge {
  flex: none;
  max-width: calc(90px * (1 - var(--cmp-collapse, 0)));
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  padding: 3px calc(7px * (1 - var(--cmp-collapse, 0)));
  border-radius: 99px;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  color: var(--accent);
  white-space: nowrap;
}

.cmp-col__badge {
  flex: none;
  width: calc(20px - 2px * var(--cmp-collapse, 0));
  height: calc(20px - 2px * var(--cmp-collapse, 0));
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(0.68rem - 0.04rem * var(--cmp-collapse, 0));
  font-weight: 800;
  color: #12100F;
  background: var(--slot-color);
}

.cmp-col__name {
  flex: 0 1 auto;
  min-width: 0;
  font-size: calc(1rem - 0.05rem * var(--cmp-collapse, 0));
  font-weight: 700;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}

/* ", ST" suffix: hidden while expanded (the meta line already shows the state) and
   unfolded as that meta line collapses away. */
.cmp-col__name-state {
  display: inline-block;
  max-width: calc(3em * var(--cmp-collapse, 0));
  opacity: calc(2 * var(--cmp-collapse, 0) - 1);
  overflow: hidden;
  vertical-align: bottom;
}

.cmp-col__spacer {
  flex: 1;
}

.cmp-col__remove {
  flex: none;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
}

.cmp-col__remove:hover {
  background: color-mix(in srgb, var(--danger) 14%, transparent);
  color: var(--danger);
}

.cmp-col__expand {
  overflow: hidden;
  max-height: calc(var(--cmp-expand-h, 160px) * (1 - var(--cmp-collapse, 0)));
  opacity: calc(1 - 1.5 * var(--cmp-collapse, 0));
}

.cmp-col__expand-inner {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cmp-col__meta {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cmp-col__score-row {
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.cmp-col__score {
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.cmp-col__score--inline {
  flex: none;
  font-size: 0.86rem;
  line-height: 1;
  max-width: calc(80px * var(--cmp-collapse, 0));
  /* Cancels the flex gap while the pill is folded shut. */
  margin-left: calc(-8px * (1 - var(--cmp-collapse, 0)));
  padding: 4px calc(9px * var(--cmp-collapse, 0));
  border-radius: 99px;
  background: color-mix(in srgb, var(--slot-color) 20%, transparent);
  opacity: calc(2 * var(--cmp-collapse, 0) - 1);
  overflow: hidden;
  white-space: nowrap;
}

.cmp-col__score-max {
  margin-left: 1px;
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0;
  color: var(--text-muted);
}

.cmp-col__score-label {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.cmp-col__bar {
  height: 3px;
  border-radius: 99px;
  background: var(--progress-bg);
  overflow: hidden;
}

.cmp-col__bar-fill {
  height: 3px;
  border-radius: 99px;
  background: var(--slot-color);
}
</style>
