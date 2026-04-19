<script setup lang="ts">
import { computed } from "vue";
import type { ComparedCity, SummaryCardData } from "../../lib/compare";

const props = defineProps<{
  cityA: ComparedCity;
  cityB: ComparedCity;
  summaryCards: SummaryCardData[];
}>();

function formatCoord(val: number | null, isLat: boolean): string {
  if (val == null) return "—";
  const abs = Math.abs(val);
  const deg = Math.floor(abs);
  const minFull = (abs - deg) * 60;
  const min = Math.floor(minFull);
  const sec = Math.round((minFull - min) * 60);
  const dir = isLat ? (val >= 0 ? "N" : "S") : (val >= 0 ? "E" : "W");
  return `${deg.toFixed(0)}°${min.toFixed(0)}'${sec.toFixed(0)}"${dir}`;
}

const coordA = computed(() => {
  const { lat, lon } = props.cityA.cityInfo;
  return `${formatCoord(lat, true)} ${formatCoord(lon, false)}`;
});

const coordB = computed(() => {
  const { lat, lon } = props.cityB.cityInfo;
  return `${formatCoord(lat, true)} ${formatCoord(lon, false)}`;
});

const summaryLabels: Record<number, string> = {
  0: "EARNS MORE",
  1: "CHEAPER RENT",
  2: "LIGHTER BURDEN",
};

function summaryValue(card: SummaryCardData): string {
  if (card.winner === "tie") return "Even";
  const cityName = card.winner === "a"
    ? props.cityA.cityInfo.name
    : props.cityB.cityInfo.name;
  return `${cityName} · ${card.sentence.value}`;
}

function summaryWinner(card: SummaryCardData) {
  return card.winner;
}

</script>

<template>
  <div class="cart-hero">

    <!-- Subject/coord row — no borders -->
    <div class="cart-hero__subjects">
      <span class="cart-hero__subject cart-hero__subject--a">
        <span class="cart-hero__subject-marker" aria-hidden="true">○</span>
        <span>SUBJECT A · {{ coordA }}</span>
      </span>
      <span class="cart-hero__subject cart-hero__subject--b">
        <span>{{ coordB }} · SUBJECT B</span>
        <span class="cart-hero__subject-marker" aria-hidden="true">○</span>
      </span>
    </div>

    <!-- City names with HL below -->
    <div class="cart-hero__names">
      <h1 class="cart-hero__city-name">{{ cityA.cityInfo.name }}</h1>
      <span class="cart-hero__vs">vs</span>
      <h1 class="cart-hero__city-name cart-hero__city-name--b">{{ cityB.cityInfo.name }}</h1>
    </div>
    <div class="cart-hero__rule"></div>

    <div class="cart-hero__summary-cards">
      <div
        v-for="(card, i) in summaryCards"
        :key="card.title"
        class="cart-hero__summary-card"
      >
        <div class="cart-hero__summary-label">{{ summaryLabels[i] ?? card.title }}</div>
        <div
          class="cart-hero__summary-value"
          :class="{
            'cart-hero__summary-value--a': summaryWinner(card) === 'a',
            'cart-hero__summary-value--b': summaryWinner(card) === 'b',
          }"
        >
          {{ summaryValue(card) }}
        </div>
      </div>
    </div>
  </div>
</template>
