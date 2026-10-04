<script setup lang="ts">
import { ref } from "vue";
import type { CompareGroup } from "../lib/compare";
import CompareMetricRow from "./CompareMetricRow.vue";
import CompareCharMetricRow from "./CompareCharMetricRow.vue";

defineProps<{
  group: CompareGroup;
  mode: "values" | "delta";
  highlightLeaders: boolean;
}>();

const open = ref(true);
</script>

<template>
  <div class="cmp-group">
    <button class="cmp-group__header" type="button" @click="open = !open">
      <span class="cmp-group__caret">{{ open ? "▾" : "▸" }}</span>
      <span class="cmp-group__label">{{ group.label }}</span>
      <div class="cmp-group__spacer"></div>
      <span class="cmp-group__count">{{ group.rows.length }} metrics</span>
    </button>
    <div v-if="open">
      <template v-for="row in group.rows" :key="row.key">
        <CompareCharMetricRow v-if="row.kind === 'char'" :row="row" />
        <CompareMetricRow
          v-else
          :row="row"
          :mode="mode"
          :highlight-leaders="highlightLeaders"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.cmp-group__header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border: none;
  border-top: 1px solid var(--border-subtle);
  background: color-mix(in srgb, var(--text-primary) 2%, transparent);
  cursor: pointer;
  text-align: left;
}

.cmp-group__header:hover {
  background: color-mix(in srgb, var(--text-primary) 4%, transparent);
}

.cmp-group__caret {
  font-size: 0.7rem;
  color: var(--text-muted);
  width: 10px;
}

.cmp-group__label {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  color: var(--accent);
}

.cmp-group__spacer {
  flex: 1;
}

.cmp-group__count {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
</style>
