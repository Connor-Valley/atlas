<script setup lang="ts">
import { computed } from "vue";
import type { CompareCell, MetricDirection } from "../lib/compare";
import { deltaVsFirst } from "../lib/compareMetrics";

const props = defineProps<{
  cell: CompareCell;
  cells: CompareCell[];
  firstCell: CompareCell;
  direction: MetricDirection;
  ranked: boolean;
  rank: number | null;
  isBest: boolean;
  isWorst: boolean;
  highlightLeaders: boolean;
  mode: "values" | "delta";
  usValue: number | null;
  isFirstColumn: boolean;
  format: (v: number) => string;
}>();

const delta = computed(() => {
  if (props.isFirstColumn || props.mode !== "delta") return null;
  return deltaVsFirst(props.cell, props.firstCell, props.direction);
});

const vsUsText = computed(() => {
  if (props.usValue == null || props.cell.value == null) return null;
  const pct = Math.round(((props.cell.value - props.usValue) / props.usValue) * 100);
  return `${pct > 0 ? "+" : ""}${pct}% vs US`;
});
</script>

<template>
  <div class="cmp-cell">
    <div class="cmp-cell__value-row">
      <span
        v-if="ranked && highlightLeaders && rank != null"
        class="cmp-cell__rank"
        :class="{ 'cmp-cell__rank--best': isBest }"
      >#{{ rank }}</span>
      <span
        class="cmp-cell__value"
        :class="{ 'cmp-cell__value--best': ranked && highlightLeaders && isBest, 'cmp-cell__value--worst': ranked && highlightLeaders && isWorst }"
      >{{ cell.display }}</span>
      <span v-if="cell.note" class="cmp-cell__note">
        <span class="mdi mdi-information-outline cmp-cell__note-icon"></span>
        <span class="cmp-cell__note-tooltip">{{ cell.note }}</span>
      </span>
    </div>
    <div class="cmp-cell__sub-row">
      <span v-if="mode === 'values' && vsUsText" class="cmp-cell__us">{{ vsUsText }}</span>
      <span
        v-else-if="mode === 'delta' && delta"
        class="cmp-cell__delta"
        :class="`cmp-cell__delta--${delta.klass}`"
      >{{ delta.klass === 'flat' ? 'even' : `${delta.fraction > 0 ? '↑' : '↓'} ${Math.abs(Math.round(delta.fraction * 100))}%` }}</span>
      <span v-else-if="mode === 'delta' && isFirstColumn" class="cmp-cell__us">baseline</span>
    </div>
  </div>
</template>

<style scoped>
.cmp-cell {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: 17px 16px;
  min-width: 0;
}

.cmp-cell__value-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.cmp-cell__rank {
  flex: none;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  padding: 2px 6px;
  border-radius: 5px;
  background: color-mix(in srgb, var(--text-muted) 12%, transparent);
  color: var(--text-muted);
}

.cmp-cell__rank--best {
  background: color-mix(in srgb, var(--positive) 16%, transparent);
  color: var(--positive);
}

.cmp-cell__value {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.cmp-cell__value--best {
  font-weight: 700;
  color: var(--positive);
}

.cmp-cell__value--worst {
  color: var(--text-muted);
}

.cmp-cell__note {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: none;
}

.cmp-cell__note-icon {
  color: var(--text-muted);
  font-size: 0.8rem;
  cursor: default;
  line-height: 1;
}

.cmp-cell__note-tooltip {
  display: none;
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  background: var(--bg-card-inner);
  color: var(--text-secondary);
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.71rem;
  font-weight: 400;
  line-height: 1.5;
  white-space: normal;
  text-align: left;
  width: 220px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 100;
  pointer-events: none;
}

.cmp-cell__note:hover .cmp-cell__note-tooltip {
  display: block;
}

.cmp-cell__sub-row {
  display: flex;
  justify-content: flex-end;
  min-width: 0;
}

.cmp-cell__us {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.cmp-cell__delta {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  padding: 2px 7px;
  border-radius: 99px;
  white-space: nowrap;
}

.cmp-cell__delta--good {
  background: color-mix(in srgb, var(--positive) 14%, transparent);
  color: var(--positive);
}

.cmp-cell__delta--bad {
  background: color-mix(in srgb, var(--danger) 14%, transparent);
  color: var(--danger);
}

.cmp-cell__delta--flat {
  background: color-mix(in srgb, var(--text-muted) 12%, transparent);
  color: var(--text-muted);
}
</style>
