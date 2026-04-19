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

function fitsLabel(winner: "a" | "b" | "tie", cityA: ComparedCity, cityB: ComparedCity): string {
  if (winner === "a") return slugToDisplay(cityA.city);
  if (winner === "b") return slugToDisplay(cityB.city);
  return "Even";
}

function winnerScoreLabel(p: { winner: "a" | "b" | "tie"; aScore: number; bScore: number }): string {
  if (p.winner === "a") return `A · ${p.aScore}`;
  if (p.winner === "b") return `B · ${p.bScore}`;
  return `EVEN · ${p.aScore} / ${p.bScore}`;
}
</script>

<template>
  <div class="ed-section cart-personas">
    <div class="ed-section__header cart-personas__header">
      <div class="ed-section-label">
        <span class="ed-section-label__num">§ 03</span>
        <span class="ed-section-label__dot">·</span>
        <span>WHO FITS HERE</span>
      </div>
      <h2 class="ed-section__heading">Best suited for</h2>
    </div>

    <div
      v-for="p in personas"
      :key="p.persona"
      class="persona-bar-row"
    >
      <div class="persona-bar-row__label">{{ p.persona }}</div>

      <div class="persona-bar-row__bars">
        <div class="persona-bar-row__bar-wrap">
          <div class="persona-bar-row__track">
            <div
              class="persona-bar-row__bar persona-bar-row__bar--a"
              :style="{ width: `${p.aScore}%` }"
            ></div>
          </div>
        </div>
        <div class="persona-bar-row__bar-wrap">
          <div class="persona-bar-row__track">
            <div
              class="persona-bar-row__bar persona-bar-row__bar--b"
              :style="{ width: `${p.bScore}%` }"
            ></div>
          </div>
        </div>
        <div
          class="persona-bar-row__score"
          :class="{
            'persona-bar-row__score--a': p.winner === 'a',
            'persona-bar-row__score--b': p.winner === 'b',
            'persona-bar-row__score--tie': p.winner === 'tie',
          }"
        >
          {{ winnerScoreLabel(p) }}
        </div>
      </div>

      <div class="persona-bar-row__divider" aria-hidden="true"></div>

      <div class="persona-bar-row__verdict">
        <span class="persona-bar-row__fits-label">FITS</span>
        <span
          class="persona-bar-row__fits-city"
          :class="{
            'persona-bar-row__fits-city--a': p.winner === 'a',
            'persona-bar-row__fits-city--b': p.winner === 'b',
          }"
        >
          {{ fitsLabel(p.winner, cityA, cityB) }}
        </span>
      </div>
    </div>
  </div>
</template>
