<script setup lang="ts">
import { computed } from "vue";
import type { ComparedCity, DumbbellMetric } from "../../lib/compare";
import { buildDumbbellMetrics } from "../../lib/compare";

const props = defineProps<{
  cityA: ComparedCity;
  cityB: ComparedCity;
}>();

const metrics = computed(() => buildDumbbellMetrics(props.cityA, props.cityB));

// Group by category
const categories = computed(() => {
  const order = ["Income", "Housing", "Affordability", "Lifestyle"];
  const groups: Record<string, DumbbellMetric[]> = {};
  for (const m of metrics.value) {
    if (!groups[m.category]) groups[m.category] = [];
    groups[m.category].push(m);
  }
  return order.filter(c => groups[c]?.length).map(c => ({ name: c, metrics: groups[c] }));
});

// Compute left/right positions for the dumbbell dots
// aNormalized and bNormalized are 15–85 range values
function dotStyle(normalized: number): string {
  return `left: ${normalized}%`;
}

function connectorStyle(aN: number, bN: number): string {
  const left = Math.min(aN, bN);
  const right = Math.max(aN, bN);
  return `left: ${left}%; width: ${right - left}%`;
}
</script>

<template>
  <div class="ed-section">
    <div class="ed-section__header">
      <div class="ed-section-label">
        <span class="ed-section-label__num">§ 02</span>
        <span class="ed-section-label__dot">·</span>
        <span>SIDE-BY-SIDE</span>
      </div>
      <h2 class="ed-section__heading">By the numbers</h2>
    </div>

    <div v-for="group in categories" :key="group.name">
      <div class="ed-group-header">
        <span class="ed-group-header__dash">—</span>
        <span>{{ group.name.toUpperCase() }}</span>
      </div>

      <div
        v-for="metric in group.metrics"
        :key="metric.label"
        class="ed-metric-row"
      >
          <!-- City A value -->
          <div
            class="ed-metric-row__val ed-metric-row__val--a"
            :class="{
              'ed-metric-row__val--wins-a': metric.winner === 'a',
            }"
          >
            {{ metric.aFormatted }}
          </div>

          <!-- Center: label + dumbbell -->
          <div class="ed-metric-center">
            <div class="ed-metric-row__label">{{ metric.label }}</div>
            <div class="dumbbell" v-if="metric.aValue != null && metric.bValue != null">
              <div class="dumbbell__track"></div>
              <div
                class="dumbbell__connector"
                :style="connectorStyle(metric.aNormalized, metric.bNormalized)"
              ></div>
              <!-- Center tick — always at 50% with center-out normalization -->
              <div class="dumbbell__midpoint"></div>
              <div
                class="dumbbell__dot"
                :class="metric.winner === 'a' ? 'dumbbell__dot--a' : metric.winner === 'tie' ? 'dumbbell__dot--tie' : 'dumbbell__dot--a'"
                :style="dotStyle(metric.aNormalized)"
              ></div>
              <div
                class="dumbbell__dot"
                :class="metric.winner === 'b' ? 'dumbbell__dot--b' : metric.winner === 'tie' ? 'dumbbell__dot--tie' : 'dumbbell__dot--b'"
                :style="dotStyle(metric.bNormalized)"
              ></div>
            </div>
            <div v-else class="ed-metric-row__label" style="opacity: 0.4;">—</div>
          </div>

          <!-- City B value -->
          <div
            class="ed-metric-row__val ed-metric-row__val--b"
            :class="{
              'ed-metric-row__val--wins-b': metric.winner === 'b',
            }"
          >
            {{ metric.bFormatted }}
          </div>
        </div>
    </div>
  </div>
</template>
