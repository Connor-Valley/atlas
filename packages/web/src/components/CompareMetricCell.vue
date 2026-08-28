<script setup lang="ts">
import { computed } from "vue";
import type { CompareCell, MetricDirection } from "../lib/compare";
import { barWidth, deltaVsFirst } from "../lib/compareMetrics";

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

const width = computed(() => Math.max(6, Math.round(barWidth(props.cell, props.cells, props.direction) * 100)));
const barColor = computed(() =>
  props.highlightLeaders && props.isBest ? "var(--positive)" : undefined,
);

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
    </div>
    <div class="cmp-cell__bar-track">
      <div class="cmp-cell__bar-fill" :style="{ width: `${width}%`, background: barColor }"></div>
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
  gap: 5px;
  padding: 10px 16px;
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
  font-size: 0.62rem;
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
  font-size: 0.92rem;
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

.cmp-cell__bar-track {
  height: 3px;
  border-radius: 99px;
  background: color-mix(in srgb, var(--text-muted) 16%, transparent);
  overflow: hidden;
}

.cmp-cell__bar-fill {
  height: 3px;
  border-radius: 99px;
  background: var(--accent-soft);
}

.cmp-cell__sub-row {
  display: flex;
  justify-content: flex-end;
  min-width: 0;
}

.cmp-cell__us {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.cmp-cell__delta {
  font-family: var(--font-mono);
  font-size: 0.62rem;
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
