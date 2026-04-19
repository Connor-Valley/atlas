<script setup lang="ts">
import { computed } from "vue";
import type { ComparedCity } from "../../lib/compare";
import { buildPersonaScores } from "../../lib/personas";
import { slugToDisplay } from "../../lib/compare";

const props = defineProps<{
  cityA: ComparedCity;
  cityB: ComparedCity;
}>();

const personas = computed(() => buildPersonaScores(props.cityA, props.cityB));

function cityName(winner: "a" | "b" | "tie"): string {
  if (winner === "a") return slugToDisplay(props.cityA.city);
  if (winner === "b") return slugToDisplay(props.cityB.city);
  return "Even";
}
</script>

<template>
  <div class="ed-section">
    <div class="ed-section__header">
      <div class="ed-section-label">
        <span class="ed-section-label__num">§ 03</span>
        <span class="ed-section-label__dot">·</span>
        <span>BEST FOR</span>
      </div>
      <h2 class="ed-section__heading">Who thrives where</h2>
    </div>

    <div class="thrives-grid">
      <div
        v-for="p in personas"
        :key="p.persona"
        class="thrives-card"
      >
        <div class="thrives-card__persona">{{ p.persona }}</div>
        <div class="thrives-card__result">
          <span
            class="thrives-card__city"
            :class="{
              'thrives-card__city--a': p.winner === 'a',
              'thrives-card__city--b': p.winner === 'b',
            }"
          >{{ cityName(p.winner) }}</span>
          <span v-if="p.winner !== 'tie'" class="thrives-card__margin">+{{ p.margin }}</span>
        </div>
        <div class="thrives-card__scores">
          <span class="thrives-card__score thrives-card__score--a">A · {{ p.aScore }}</span>
          <span class="thrives-card__score thrives-card__score--b">B · {{ p.bScore }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
