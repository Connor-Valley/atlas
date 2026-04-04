<script setup lang="ts">
import { computed } from "vue";
import { cityLabel, type CompareSectionData } from "../lib/compare";

const props = defineProps<{
  section: CompareSectionData;
  cityA: string;
  stateA: string;
  cityB: string;
  stateB: string;
}>();

const cityALabel = computed(() => cityLabel(props.cityA, props.stateA));
const cityBLabel = computed(() => cityLabel(props.cityB, props.stateB));

const badgeClass = computed(() => {
  if (props.section.winner === "a") return "compare-section__badge--a";
  if (props.section.winner === "b") return "compare-section__badge--b";
  if (props.section.winner === "tie") return "compare-section__badge--tie";
  return "compare-section__badge--difference";
});

const heroPillClass = computed(() => {
  if (props.section.winner === "a") return "compare-section__hero-pill--a";
  if (props.section.winner === "b") return "compare-section__hero-pill--b";
  if (props.section.winner === "tie") return "compare-section__hero-pill--tie";
  return "compare-section__hero-pill--difference";
});

function metricClass(winner: "a" | "b" | "tie" | "difference", side: "a" | "b") {
  if (winner === "difference") return side === "a" ? "compare-section__metric-val--wins-a" : "compare-section__metric-val--wins-b";
  if (winner === side) return side === "a" ? "compare-section__metric-val--wins-a" : "compare-section__metric-val--wins-b";
  if (winner === "tie") return "compare-section__metric-val--tie";
  return "compare-section__metric-val--dim";
}

function diffBadgeClass(winner: "a" | "b" | "tie" | "difference") {
  if (winner === "a") return "compare-section__diff--a";
  if (winner === "b") return "compare-section__diff--b";
  return "";
}
</script>

<template>
  <section class="compare-section" :class="`compare-section--${section.variant}`">
    <!-- Header -->
    <div class="compare-section__header">
      <div class="compare-section__title-wrap">
        <span class="mdi compare-section__icon" :class="section.icon"></span>
        <div>
          <h2 class="compare-section__title">{{ section.title }}</h2>
          <p class="compare-section__insight">{{ section.insight }}</p>
        </div>
      </div>
      <span class="compare-section__badge" :class="badgeClass">{{ section.verdict }}</span>
    </div>

    <!-- Hero score comparison -->
    <div class="compare-section__hero">
      <div class="compare-section__hero-side compare-section__hero-side--a">
        <span class="compare-section__hero-city-label">{{ cityALabel }}</span>
        <span class="compare-section__hero-value">{{ section.aSummary }}</span>
      </div>
      <div class="compare-section__hero-center">
        <span class="compare-section__hero-kicker">{{ section.summaryLabel }}</span>
        <div class="compare-section__hero-pill" :class="heroPillClass">
          <span v-if="section.winner === 'a'" class="mdi mdi-arrow-left compare-section__hero-arrow"></span>
          <span class="compare-section__hero-delta">{{ section.summaryDelta }}</span>
          <span v-if="section.winner === 'b'" class="mdi mdi-arrow-right compare-section__hero-arrow"></span>
        </div>
      </div>
      <div class="compare-section__hero-side compare-section__hero-side--b">
        <span class="compare-section__hero-city-label">{{ cityBLabel }}</span>
        <span class="compare-section__hero-value">{{ section.bSummary }}</span>
      </div>
    </div>

    <!-- Metrics table -->
    <div class="compare-section__table">
      <div v-for="metric in section.metrics" :key="metric.label" class="compare-section__metric-block">
        <div class="compare-section__metric-row">
          <div class="compare-section__metric-side compare-section__metric-side--a">
            <div class="compare-section__metric-val compare-section__metric-val--a" :class="metricClass(metric.winner, 'a')">
              {{ metric.aText }}
            </div>
            <div class="compare-section__connector"></div>
          </div>
          <div class="compare-section__metric-center">
            <span class="compare-section__metric-name">{{ metric.label }}</span>
            <span
              v-if="metric.winner === 'a' || metric.winner === 'b'"
              class="compare-section__diff"
              :class="diffBadgeClass(metric.winner)"
            >
              <span class="mdi compare-section__diff-arrow" :class="metric.direction === 'lower' ? 'mdi-arrow-down' : 'mdi-arrow-up'"></span>
              {{ metric.centerLabel }}
            </span>
            <span v-else-if="metric.winner === 'tie'" class="compare-section__diff compare-section__diff--tie">≈ tied</span>
            <span v-else class="compare-section__diff compare-section__diff--context">{{ metric.centerLabel }}</span>
          </div>
          <div class="compare-section__metric-side compare-section__metric-side--b">
            <div class="compare-section__connector"></div>
            <div class="compare-section__metric-val compare-section__metric-val--b" :class="metricClass(metric.winner, 'b')">
              {{ metric.bText }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.compare-section {
  padding: 26px 28px;
  border: 1px solid color-mix(in srgb, var(--border-card) 84%, transparent);
  border-radius: 28px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--bg-card) 96%, white 4%) 0%, var(--bg-card) 100%);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.16);
}

/* ── Header ── */
.compare-section__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 20px;
}

.compare-section__title-wrap {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.compare-section__icon {
  font-size: 1.3rem;
  color: var(--accent);
  padding-top: 3px;
}

.compare-section__title {
  margin: 0 0 4px;
  font-size: 1.2rem;
}

.compare-section__insight {
  margin: 0;
  color: var(--text-secondary);
  font-size: 1rem;
  line-height: 1.45;
}

.compare-section__badge {
  flex-shrink: 0;
  padding: 8px 15px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  border: 1px solid var(--border-card);
  white-space: nowrap;
}

.compare-section__badge--a {
  background: color-mix(in srgb, var(--compare-city-a) 14%, var(--bg-card));
  color: var(--compare-city-a);
  border-color: color-mix(in srgb, var(--compare-city-a) 25%, var(--border-card));
}

.compare-section__badge--b {
  background: color-mix(in srgb, var(--compare-city-b) 14%, var(--bg-card));
  color: var(--compare-city-b);
  border-color: color-mix(in srgb, var(--compare-city-b) 25%, var(--border-card));
}

.compare-section__badge--tie {
  background: color-mix(in srgb, var(--text-secondary) 10%, var(--bg-card));
  color: var(--text-primary);
}

.compare-section__badge--difference {
  background: color-mix(in srgb, #f59e0b 10%, var(--bg-card));
  color: #b45309;
}

/* ── Hero ── */
.compare-section__hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 20px;
  align-items: center;
  margin-bottom: 22px;
  padding-bottom: 20px;
  border-bottom: 1px solid color-mix(in srgb, var(--border-card) 60%, transparent);
}

.compare-section__hero-side {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.compare-section__hero-side--b {
  text-align: right;
}

.compare-section__hero-city-label,
.compare-section__hero-kicker {
  color: var(--text-secondary);
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.compare-section__hero-value {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.04em;
}

.compare-section__hero-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  min-width: 110px;
}

.compare-section__hero-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 9px 20px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 700;
}

.compare-section__hero-pill--a {
  background: color-mix(in srgb, var(--compare-city-a) 16%, var(--bg-card));
  color: var(--compare-city-a);
  border-color: color-mix(in srgb, var(--compare-city-a) 32%, var(--border-card));
}

.compare-section__hero-pill--b {
  background: color-mix(in srgb, var(--compare-city-b) 16%, var(--bg-card));
  color: var(--compare-city-b);
  border-color: color-mix(in srgb, var(--compare-city-b) 32%, var(--border-card));
}

.compare-section__hero-pill--tie {
  background: color-mix(in srgb, var(--text-secondary) 10%, var(--bg-card));
  color: var(--text-secondary);
  border-color: var(--border-card);
}

.compare-section__hero-pill--difference {
  background: color-mix(in srgb, #f59e0b 13%, var(--bg-card));
  color: #d97706;
  border-color: color-mix(in srgb, #f59e0b 28%, var(--border-card));
}

.compare-section__hero-arrow {
  font-size: 0.9rem;
}

.compare-section__hero-delta {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* ── Metrics table — bleeds to card edges ── */
.compare-section__table {
  display: flex;
  flex-direction: column;
  margin: 0 -28px;
}

/* ── Metric block ── */
.compare-section__metric-block {
  padding: 14px 28px;
  border-bottom: 1px solid color-mix(in srgb, var(--border-card) 40%, transparent);
}

.compare-section__metric-block:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

/* ── Metric row: [value_a + connector] | center | [connector + value_b] ── */
.compare-section__metric-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}

.compare-section__metric-side {
  display: flex;
  align-items: center;
  gap: 0;
}


/* Center column: label stacked above pill */
.compare-section__metric-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.compare-section__metric-name {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

/* ── Dotted connector (flex-grow inside each side) ── */
.compare-section__connector {
  flex: 1;
  min-width: 16px;
  height: 3px;
  background-image: radial-gradient(circle, color-mix(in srgb, var(--accent) 38%, transparent) 1.5px, transparent 1.5px);
  background-size: 12px 3px;
  background-repeat: repeat-x;
  background-position: center;
  mask-image: linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%);
}

/* ── Metric values ── */
.compare-section__metric-val {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  transition: color 0.15s;
}

.compare-section__metric-val--a {
  text-align: right;
}

.compare-section__metric-val--b {
  text-align: left;
}

.compare-section__metric-val--wins-a {
  color: var(--compare-city-a);
}

.compare-section__metric-val--wins-b {
  color: var(--compare-city-b);
}

.compare-section__metric-val--tie {
  color: var(--text-primary);
}

.compare-section__metric-val--dim {
  color: var(--text-secondary);
}

/* ── Center: pill only ── */
.compare-section__metric-center {
  display: flex;
  justify-content: center;
}

.compare-section__diff {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  white-space: nowrap;
  border: 1px solid transparent;
}

.compare-section__diff--a {
  background: color-mix(in srgb, var(--compare-city-a) 14%, var(--bg-card));
  color: var(--compare-city-a);
  border-color: color-mix(in srgb, var(--compare-city-a) 22%, var(--border-card));
}

.compare-section__diff--b {
  background: color-mix(in srgb, var(--compare-city-b) 14%, var(--bg-card));
  color: var(--compare-city-b);
  border-color: color-mix(in srgb, var(--compare-city-b) 22%, var(--border-card));
}

.compare-section__diff--tie {
  color: var(--text-muted);
  background: transparent;
  border-color: transparent;
  font-weight: 500;
  letter-spacing: 0;
  font-size: 0.75rem;
}

.compare-section__diff-arrow {
  font-size: 0.75rem;
}

.compare-section__diff--context {
  background: color-mix(in srgb, #f59e0b 13%, var(--bg-card));
  color: #d97706;
  border-color: color-mix(in srgb, #f59e0b 28%, var(--border-card));
  font-weight: 700;
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .compare-section__hero {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .compare-section__hero-side--b {
    text-align: left;
  }
}

@media (max-width: 640px) {
  .compare-section {
    padding: 20px 16px;
    border-radius: 20px;
  }

  .compare-section__table {
    margin: 0 -16px;
  }

  .compare-section__metric-block {
    padding: 12px 16px;
  }

  .compare-section__hero-value {
    font-size: 1.5rem;
  }

  .compare-section__metric-val {
    font-size: 1.1rem;
  }
}
</style>
