<script setup lang="ts">
import { computed } from "vue";
import type { ComparedCity } from "../../lib/compare";
import { buildVerdictProse, buildVerdictColumns } from "../../lib/compare";

const props = defineProps<{
  cityA: ComparedCity;
  cityB: ComparedCity;
}>();

const prose = computed(() => buildVerdictProse(props.cityA, props.cityB));
const columns = computed(() => buildVerdictColumns(props.cityA, props.cityB));

// Build the prose sentence fragments
const sentence = computed(() => {
  const p = prose.value;
  if (p.incomeWinner === "tie" && p.housingWinner === "tie") {
    return {
      parts: [
        { text: "Both cities offer ", highlight: null as null | "a" | "b" },
        { text: "nearly equal", highlight: null },
        { text: " income and rent. Renters in ", highlight: null },
        { text: p.cityAName, highlight: "a" as const },
        { text: " hand over ", highlight: null },
        { text: p.rtiA, highlight: "a" as const },
        { text: " of their paycheck; in ", highlight: null },
        { text: p.cityBName, highlight: "b" as const },
        { text: ", it's ", highlight: null },
        { text: p.rtiB, highlight: "b" as const },
        { text: ".", highlight: null },
      ],
    };
  }
  const incomeLeaderHighlight = p.incomeWinner === "a" ? "a" : p.incomeWinner === "b" ? "b" : null;
  const rentLeaderHighlight = p.housingWinner === "a" ? "a" : p.housingWinner === "b" ? "b" : null;
  const rtiAHighlight: "a" | null = null;
  const rtiBHighlight: "b" | null = null;
  return {
    parts: [
      { text: p.incomeLeader, highlight: incomeLeaderHighlight as null | "a" | "b" },
      { text: " earns ", highlight: null },
      { text: p.incomeDiff, highlight: incomeLeaderHighlight as null | "a" | "b" },
      { text: " more, but ", highlight: null },
      { text: p.rentLeader, highlight: rentLeaderHighlight as null | "a" | "b" },
      { text: " asks ", highlight: null },
      { text: p.rentDiff, highlight: rentLeaderHighlight as null | "a" | "b" },
      { text: " more in rent. Renters in ", highlight: null },
      { text: p.cityAName, highlight: "a" as const },
      { text: " hand over ", highlight: null },
      { text: p.rtiA, highlight: rtiAHighlight },
      { text: " of their paycheck; in ", highlight: null },
      { text: p.cityBName, highlight: "b" as const },
      { text: ", it's ", highlight: null },
      { text: p.rtiB, highlight: rtiBHighlight },
      { text: ".", highlight: null },
    ],
  };
});
</script>

<template>
  <div class="ed-section">
    <!-- Prose sentence -->
    <div class="verdict-prose-wrap">
      <p class="verdict-prose">
        <template v-for="(part, i) in sentence.parts" :key="i">
          <span
            v-if="part.highlight"
            class="verdict-prose__highlight"
            :class="{
              'verdict-prose__highlight--a': part.highlight === 'a',
              'verdict-prose__highlight--b': part.highlight === 'b',
            }"
          >{{ part.text }}</span>
          <template v-else>{{ part.text }}</template>
        </template>
      </p>
    </div>

    <!-- Three-column summary table -->
    <div class="verdict-columns">
      <div v-for="col in columns" :key="col.title" class="verdict-col">
        <div class="verdict-col__header">— {{ col.title.toUpperCase() }}</div>
        <div class="verdict-col__city-head">
          <span class="verdict-col__city verdict-col__city--a">{{ cityA.cityInfo.name }}</span>
          <span class="verdict-col__city verdict-col__city--b">{{ cityB.cityInfo.name }}</span>
        </div>
        <div v-for="row in col.metrics" :key="row.label" class="verdict-col__row">
          <div class="verdict-col__row-label">{{ row.label }}</div>
          <div
            class="verdict-col__row-val"
            :class="{
              'verdict-col__row-val--a-win': row.winner === 'a',
            }"
          >{{ row.aValue }}</div>
          <div
            class="verdict-col__row-val"
            :class="{
              'verdict-col__row-val--b-win': row.winner === 'b',
            }"
          >{{ row.bValue }}</div>
        </div>
        <div class="verdict-col__insight">{{ col.insight }}</div>
      </div>
    </div>
  </div>
</template>
