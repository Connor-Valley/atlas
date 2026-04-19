<script setup lang="ts">
import type { ComparedCity } from "../../lib/compare";

defineProps<{
  cityA: ComparedCity;
  cityB: ComparedCity;
}>();
</script>

<template>
  <div class="ed-section">
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 0 8px;">
      <div class="dossier-hero__eyebrow">Atlas · City Dossier · Vol. 2026</div>
    </div>

    <div class="dossier-hero__study">A Comparative Study</div>

    <h1 class="dossier-hero__title">
      <span class="dossier-hero__title-city dossier-hero__title-city--a">{{ cityA.cityInfo.name }}</span>
      <em> or </em>
      <span class="dossier-hero__title-city dossier-hero__title-city--b">{{ cityB.cityInfo.name }}</span>
    </h1>

    <p class="dossier-hero__prose">
      Two cities set against each other — the numbers they earn,
      the rents they charge, and the people they suit.
    </p>

    <!-- Placeholder image blocks -->
    <div class="dossier-hero__images">
      <div class="dossier-hero__image-block dossier-hero__image-block--a">
        <img
          v-if="cityA.cityInfo.photoUrl"
          :src="cityA.cityInfo.photoUrl"
          alt=""
          class="dossier-hero__image dossier-hero__image--a"
        />
        <div class="dossier-hero__image-pattern"></div>
        <div class="dossier-hero__image-label">PART · SUBJECT A</div>
      </div>
      <div class="dossier-hero__image-block dossier-hero__image-block--b">
        <img
          v-if="cityB.cityInfo.photoUrl"
          :src="cityB.cityInfo.photoUrl"
          alt=""
          class="dossier-hero__image dossier-hero__image--b"
        />
        <div class="dossier-hero__image-pattern"></div>
        <div class="dossier-hero__image-label">PART · SUBJECT B</div>
      </div>
    </div>

    <div class="dossier-hero__verdict-rule">
      <span class="dossier-hero__verdict-label">— The Verdict —</span>
    </div>
  </div>
</template>
