<script setup lang="ts">
import { computed } from "vue";
import type { ComparedCity } from "../../lib/compare";
import { slugToDisplay } from "../../lib/compare";
import { buildPersonaScores } from "../../lib/personas";

const props = defineProps<{
  cityA: ComparedCity;
  cityB: ComparedCity;
}>();

const personas = computed(() => buildPersonaScores(props.cityA, props.cityB));

function result(winner: "a" | "b" | "tie"): string {
  if (winner === "a") return `→ ${slugToDisplay(props.cityA.city)}`;
  if (winner === "b") return `→ ${slugToDisplay(props.cityB.city)}`;
  return "→ either";
}

const compiledDate = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
</script>

<template>
  <div class="ed-section dossier-personas">
    <div class="ed-section__header">
      <div class="ed-section-label">
        <span class="ed-section-label__num">§</span>
        <span class="ed-section-label__dot">·</span>
        <span>WHO FITS HERE</span>
      </div>
      <h2 class="ed-section__heading">Most at home</h2>
    </div>

    <div class="dossier-personas__table">
      <div
        v-for="p in personas"
        :key="p.persona"
        class="dossier-personas__row"
      >
        <span class="dossier-personas__persona">{{ p.persona }}</span>
        <span
          class="dossier-personas__result"
          :class="{
            'dossier-personas__result--a': p.winner === 'a',
            'dossier-personas__result--b': p.winner === 'b',
            'dossier-personas__result--tie': p.winner === 'tie',
          }"
        >{{ result(p.winner) }}</span>
      </div>
    </div>

    <div class="dossier-personas__footer">
      <span>ATLAS · CITY DOSSIER</span>
      <span>COMPILED {{ compiledDate.toUpperCase() }}</span>
      <span>SOURCES: ACS · ZILLOW · BLS</span>
    </div>
  </div>
</template>
