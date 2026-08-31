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
}>();

defineEmits<{ remove: [] }>();

const letter = computed(() => String.fromCharCode(65 + props.slotIndex));
const meta = computed(() => `${props.state.toUpperCase()} · ${props.county} · ${props.population.toLocaleString()}`);
const compactLabel = computed(() => cityLabel(props.name, props.state));
</script>

<template>
  <div class="cmp-col" :class="{ 'cmp-col--compact': compact }" :style="{ '--slot-color': `var(--compare-slot-${slotIndex + 1})` }">
    <div class="cmp-col__top">
      <span class="cmp-col__badge">{{ letter }}</span>
      <span class="cmp-col__name" :title="cityLabel(name, state)">{{ compact ? compactLabel : name }}</span>
      <span v-if="compact && atlasScore != null" class="cmp-col__score cmp-col__score--inline">{{ atlasScore }}</span>
      <div class="cmp-col__spacer"></div>
      <button class="cmp-col__remove" type="button" aria-label="Remove city" @click="$emit('remove')">×</button>
    </div>
    <div v-if="!compact" class="cmp-col__meta">{{ meta }}</div>
    <div v-if="!compact && atlasScore != null" class="cmp-col__score-row">
      <span class="cmp-col__score">{{ atlasScore }}</span>
      <span class="cmp-col__score-label">/100 Atlas Score</span>
    </div>
    <div v-if="!compact && atlasScore != null" class="cmp-col__bar">
      <div class="cmp-col__bar-fill" :style="{ width: `${atlasScore}%` }"></div>
    </div>
  </div>
</template>

<style scoped>
.cmp-col {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  min-width: 0;
  border-left: 1px solid var(--border-subtle);
  transition: padding 0.15s ease;
}

.cmp-col--compact {
  padding: 10px 16px;
}

.cmp-col__top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cmp-col__badge {
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 800;
  color: #12100F;
  background: var(--slot-color);
  transition: width 0.15s ease, height 0.15s ease;
}

.cmp-col--compact .cmp-col__badge {
  width: 16px;
  height: 16px;
  font-size: 0.58rem;
}

.cmp-col__name {
  flex: 0 1 auto;
  min-width: 0;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
  transition: font-size 0.15s ease;
}

.cmp-col--compact .cmp-col__name {
  font-size: 0.86rem;
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
  margin-top: 2px;
}

.cmp-col__score {
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.cmp-col__score--inline {
  flex: none;
  font-size: 0.92rem;
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
