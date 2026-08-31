<script setup lang="ts">
import type { CompareCharRow } from "../lib/compare";

defineProps<{
  row: CompareCharRow;
}>();
</script>

<template>
  <div class="cmp-char-row">
    <div class="cmp-char-row__label-col">
      <span class="cmp-char-row__label">{{ row.label }}</span>
    </div>
    <div v-for="(cell, i) in row.cells" :key="i" class="cmp-char-cell">
      <span
        v-if="cell.tier"
        class="cmp-char-cell__dot"
        :class="`cmp-char-cell__dot--${cell.tier}`"
      ></span>
      <span class="cmp-char-cell__text">{{ cell.char ?? "—" }}</span>
    </div>
  </div>
</template>

<style scoped>
.cmp-char-row {
  display: flex;
  border-top: 1px solid var(--border-subtle);
}

.cmp-char-row:hover {
  background: color-mix(in srgb, var(--text-primary) 3%, transparent);
}

.cmp-char-row__label-col {
  width: 240px;
  flex: none;
  padding: 17px 16px;
  display: flex;
  align-items: center;
}

.cmp-char-row__label {
  font-size: 1rem;
  color: var(--text-primary);
}

.cmp-char-cell {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 17px 16px;
  min-width: 0;
}

.cmp-char-cell__dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.cmp-char-cell__dot--good {
  background: var(--positive);
}

.cmp-char-cell__dot--average {
  background: var(--caution);
}

.cmp-char-cell__dot--below {
  background: var(--warning);
}

.cmp-char-cell__text {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-primary);
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
