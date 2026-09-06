<script setup lang="ts">
import { computed } from "vue";
import type { CompareRow } from "../lib/compare";
import { bestIndex, rankCells } from "../lib/compareMetrics";
import CompareMetricCell from "./CompareMetricCell.vue";

const props = defineProps<{
  row: CompareRow;
  mode: "values" | "delta";
  highlightLeaders: boolean;
}>();

const ranks = computed(() => rankCells(props.row.cells, props.row.direction));
const best = computed(() => bestIndex(props.row.cells, props.row.direction));
const worst = computed(() => {
  const validRanks = ranks.value.filter((r): r is number => r != null);
  if (!validRanks.length) return null;
  const maxRank = Math.max(...validRanks);
  const idx = ranks.value.findIndex((r) => r === maxRank);
  return idx === best.value ? null : idx;
});
</script>

<template>
  <div class="cmp-row">
    <div class="cmp-row__label-col">
      <div class="cmp-row__label-line">
        <span class="cmp-row__label">{{ row.label }}</span>
      </div>
      <span class="cmp-row__sub-label">{{ row.subLabel }}</span>
    </div>
    <CompareMetricCell
      v-for="(cell, i) in row.cells"
      :key="i"
      :cell="cell"
      :cells="row.cells"
      :first-cell="row.cells[0]"
      :direction="row.direction"
      :ranked="row.ranked"
      :rank="ranks[i]"
      :is-best="i === best"
      :is-worst="i === worst"
      :highlight-leaders="highlightLeaders"
      :mode="mode"
      :us-value="row.usValue"
      :is-first-column="i === 0"
      :format="() => cell.display"
    />
  </div>
</template>

<style scoped>
.cmp-row {
  display: flex;
  border-top: 1px solid var(--border-subtle);
}

.cmp-row:hover {
  background: color-mix(in srgb, var(--text-primary) 3%, transparent);
}

.cmp-row__label-col {
  width: 260px;
  flex: none;
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  text-align: right;
}

.cmp-row__label-line {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.cmp-row__label {
  font-size: 1rem;
  color: var(--text-primary);
}

.cmp-row__sub-label {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.cmp-row :deep(.cmp-cell) {
  flex: 1 1 0;
}
</style>
