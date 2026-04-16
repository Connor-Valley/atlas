<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { cityLabel, slugToDisplay, type CompareSectionData } from "../lib/compare";

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

const activeMobileFace = ref<"a" | "b">("a");
const mobileFrontRef = ref<HTMLElement | null>(null);
const mobileBackRef = ref<HTMLElement | null>(null);
const mobileFlipHeight = ref<number | null>(null);

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

function toggleMobileFace() {
  activeMobileFace.value = activeMobileFace.value === "a" ? "b" : "a";
}

function setMobileFace(side: "a" | "b") {
  activeMobileFace.value = side;
}

function mobileCitySwitchLabel(side: "a" | "b") {
  return side === "a" ? slugToDisplay(props.cityA) : slugToDisplay(props.cityB);
}

function mobileFaceSummary(side: "a" | "b") {
  return side === "a" ? props.section.aSummary : props.section.bSummary;
}

function mobileMetricText(metric: CompareSectionData["metrics"][number], side: "a" | "b") {
  return side === "a" ? metric.aText : metric.bText;
}

function mobileMetricResult(metric: CompareSectionData["metrics"][number], side: "a" | "b") {
  if (metric.winner === "tie" || metric.winner === "difference") return "neutral" as const;
  return metric.winner === side ? "win" as const : "loss" as const;
}

function mobileMetricDeltaClass(metric: CompareSectionData["metrics"][number], side: "a" | "b") {
  const result = mobileMetricResult(metric, side);
  if (result === "win") return "compare-section__mobile-metric-delta--win";
  if (result === "loss") return "compare-section__mobile-metric-delta--loss";
  return "compare-section__mobile-metric-delta--neutral";
}

function mobileMetricArrowCount(metric: CompareSectionData["metrics"][number]) {
  if (metric.winner === "tie" || metric.winner === "difference") return 0;
  if (metric.aVisual == null || metric.bVisual == null) return 1;

  const gap = Math.abs(metric.aVisual - metric.bVisual);
  if (gap >= 32) return 3;
  if (gap >= 14) return 2;
  return 1;
}

async function updateMobileFlipHeight() {
  await nextTick();
  const activeHeight = activeMobileFace.value === "a"
    ? (mobileFrontRef.value?.scrollHeight ?? 0)
    : (mobileBackRef.value?.scrollHeight ?? 0);
  mobileFlipHeight.value = Math.max(activeHeight, 0);
}

onMounted(() => {
  void updateMobileFlipHeight();
  window.addEventListener("resize", updateMobileFlipHeight);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateMobileFlipHeight);
});

watch(() => props.section, () => {
  void updateMobileFlipHeight();
}, { deep: true });

watch(activeMobileFace, () => {
  void updateMobileFlipHeight();
});
</script>

<template>
  <section class="compare-section" :class="`compare-section--${section.variant}`">
    <div class="compare-section__mobile">
      <div
        class="compare-section__mobile-flip"
        :class="{ 'compare-section__mobile-flip--show-b': activeMobileFace === 'b' }"
        :style="mobileFlipHeight ? { height: `${mobileFlipHeight}px` } : undefined"
      >
        <article
          ref="mobileFrontRef"
          class="compare-section__mobile-face compare-section__mobile-face--front"
        >
          <div class="compare-section__mobile-header">
            <div class="compare-section__mobile-title-wrap">
              <span class="mdi compare-section__icon" :class="section.icon"></span>
              <div>
                <h2 class="compare-section__title">{{ section.title }}</h2>
              </div>
            </div>
          </div>
          <div class="compare-section__mobile-switcher" role="tablist" aria-label="Choose city view">
            <button
              class="compare-section__mobile-switcher-btn"
              :class="{ 'compare-section__mobile-switcher-btn--active': activeMobileFace === 'a' }"
              type="button"
              role="tab"
              :aria-selected="activeMobileFace === 'a'"
              @click="setMobileFace('a')"
            >
              <span
                class="compare-section__mobile-flip-indicator"
                :class="`compare-section__mobile-flip-indicator--a`"
              >
                A
              </span>
              <span class="compare-section__mobile-switcher-copy">{{ mobileCitySwitchLabel('a') }}</span>
            </button>
            <button
              class="compare-section__mobile-switcher-btn"
              :class="{ 'compare-section__mobile-switcher-btn--active': activeMobileFace === 'b' }"
              type="button"
              role="tab"
              :aria-selected="activeMobileFace === 'b'"
              @click="setMobileFace('b')"
            >
              <span
                class="compare-section__mobile-flip-indicator"
                :class="`compare-section__mobile-flip-indicator--b`"
              >
                B
              </span>
              <span class="compare-section__mobile-switcher-copy">{{ mobileCitySwitchLabel('b') }}</span>
            </button>
          </div>

          <div class="compare-section__mobile-summary">
            <span class="compare-section__mobile-summary-label">{{ section.summaryLabel }}</span>
            <div class="compare-section__mobile-summary-row">
              <span class="compare-section__mobile-summary-value">{{ mobileFaceSummary('a') }}</span>
              <span class="compare-section__mobile-verdict" :class="heroPillClass">{{ section.verdict }}</span>
            </div>
          </div>

          <div class="compare-section__mobile-metrics">
            <div v-for="metric in section.metrics" :key="`a-${metric.label}`" class="compare-section__mobile-metric">
              <div class="compare-section__mobile-metric-head">
                <span class="compare-section__mobile-metric-name">{{ metric.label }}</span>
              </div>
              <div class="compare-section__mobile-metric-body">
                <div class="compare-section__mobile-metric-main">
                  <span
                    class="compare-section__mobile-metric-signal"
                    :class="`compare-section__mobile-metric-signal--${mobileMetricResult(metric, 'a')}`"
                  >
                    <span
                      v-if="mobileMetricArrowCount(metric) === 0"
                      class="compare-section__mobile-signal-dot"
                    ></span>
                    <template v-else>
                      <span
                        v-for="index in mobileMetricArrowCount(metric)"
                        :key="`a-${metric.label}-${index}`"
                        class="compare-section__mobile-triangle"
                        :class="`compare-section__mobile-triangle--${mobileMetricResult(metric, 'a')}`"
                      ></span>
                    </template>
                  </span>
                  <div
                    class="compare-section__mobile-metric-value"
                    :class="`compare-section__mobile-metric-value--${mobileMetricResult(metric, 'a')}`"
                  >
                    {{ mobileMetricText(metric, 'a') }}
                  </div>
                </div>
                <div
                  class="compare-section__mobile-metric-delta"
                  :class="mobileMetricDeltaClass(metric, 'a')"
                >
                  {{ metric.centerLabel }}
                </div>
              </div>
            </div>
          </div>
        </article>

        <article
          ref="mobileBackRef"
          class="compare-section__mobile-face compare-section__mobile-face--back"
        >
          <div class="compare-section__mobile-header">
            <div class="compare-section__mobile-title-wrap">
              <span class="mdi compare-section__icon" :class="section.icon"></span>
              <div>
                <h2 class="compare-section__title">{{ section.title }}</h2>
              </div>
            </div>
          </div>
          <div class="compare-section__mobile-switcher" role="tablist" aria-label="Choose city view">
            <button
              class="compare-section__mobile-switcher-btn"
              :class="{ 'compare-section__mobile-switcher-btn--active': activeMobileFace === 'a' }"
              type="button"
              role="tab"
              :aria-selected="activeMobileFace === 'a'"
              @click="setMobileFace('a')"
            >
              <span
                class="compare-section__mobile-flip-indicator"
                :class="`compare-section__mobile-flip-indicator--a`"
              >
                A
              </span>
              <span class="compare-section__mobile-switcher-copy">{{ mobileCitySwitchLabel('a') }}</span>
            </button>
            <button
              class="compare-section__mobile-switcher-btn"
              :class="{ 'compare-section__mobile-switcher-btn--active': activeMobileFace === 'b' }"
              type="button"
              role="tab"
              :aria-selected="activeMobileFace === 'b'"
              @click="setMobileFace('b')"
            >
              <span
                class="compare-section__mobile-flip-indicator"
                :class="`compare-section__mobile-flip-indicator--b`"
              >
                B
              </span>
              <span class="compare-section__mobile-switcher-copy">{{ mobileCitySwitchLabel('b') }}</span>
            </button>
          </div>

          <div class="compare-section__mobile-summary">
            <span class="compare-section__mobile-summary-label">{{ section.summaryLabel }}</span>
            <div class="compare-section__mobile-summary-row">
              <span class="compare-section__mobile-summary-value">{{ mobileFaceSummary('b') }}</span>
              <span class="compare-section__mobile-verdict" :class="heroPillClass">{{ section.verdict }}</span>
            </div>
          </div>

          <div class="compare-section__mobile-metrics">
            <div v-for="metric in section.metrics" :key="`b-${metric.label}`" class="compare-section__mobile-metric">
              <div class="compare-section__mobile-metric-head">
                <span class="compare-section__mobile-metric-name">{{ metric.label }}</span>
              </div>
              <div class="compare-section__mobile-metric-body">
                <div class="compare-section__mobile-metric-main">
                  <span
                    class="compare-section__mobile-metric-signal"
                    :class="`compare-section__mobile-metric-signal--${mobileMetricResult(metric, 'b')}`"
                  >
                    <span
                      v-if="mobileMetricArrowCount(metric) === 0"
                      class="compare-section__mobile-signal-dot"
                    ></span>
                    <template v-else>
                      <span
                        v-for="index in mobileMetricArrowCount(metric)"
                        :key="`b-${metric.label}-${index}`"
                        class="compare-section__mobile-triangle"
                        :class="`compare-section__mobile-triangle--${mobileMetricResult(metric, 'b')}`"
                      ></span>
                    </template>
                  </span>
                  <div
                    class="compare-section__mobile-metric-value"
                    :class="`compare-section__mobile-metric-value--${mobileMetricResult(metric, 'b')}`"
                  >
                    {{ mobileMetricText(metric, 'b') }}
                  </div>
                </div>
                <div
                  class="compare-section__mobile-metric-delta"
                  :class="mobileMetricDeltaClass(metric, 'b')"
                >
                  {{ metric.centerLabel }}
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>

    <div class="compare-section__desktop">
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
            <span v-else-if="metric.winner === 'tie'" class="compare-section__diff compare-section__diff--tie">{{ metric.centerLabel }}</span>
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
    </div>
  </section>
</template>

<style scoped>
.compare-section {
  --compare-success: #22c55e;
  --compare-success-soft: color-mix(in srgb, var(--compare-success) 14%, var(--bg-card));
  --compare-success-border: color-mix(in srgb, var(--compare-success) 34%, var(--border-card));
  --compare-danger: #f87171;
  --compare-danger-soft: color-mix(in srgb, var(--compare-danger) 14%, var(--bg-card));
  --compare-danger-border: color-mix(in srgb, var(--compare-danger) 34%, var(--border-card));
}

.compare-section {
  padding: 26px 28px;
  border: 1px solid color-mix(in srgb, var(--border-card) 84%, transparent);
  border-radius: 28px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--bg-card) 96%, white 4%) 0%, var(--bg-card) 100%);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.16);
  min-width: 0;
  overflow: hidden;
}

.compare-section__mobile {
  display: none;
}

.compare-section__desktop {
  display: block;
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
  background: color-mix(in srgb, var(--text-secondary) 10%, var(--bg-card));
  color: var(--text-secondary);
  border-color: color-mix(in srgb, var(--text-secondary) 20%, var(--border-card));
  font-weight: 700;
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
  .compare-section__mobile {
    display: block;
  }

  .compare-section__desktop {
    display: none;
  }

  .compare-section {
    padding: 14px 16px 16px;
    border-radius: 20px;
  }

  .compare-section__mobile-flip {
    position: relative;
    overflow: hidden;
  }

  .compare-section__mobile-flip--show-b .compare-section__mobile-face--front {
    opacity: 0;
    pointer-events: none;
  }

  .compare-section__mobile-flip--show-b .compare-section__mobile-face--back {
    opacity: 1;
    pointer-events: auto;
  }

  .compare-section__mobile-face {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: opacity 0s linear;
  }

  .compare-section__mobile-face--front {
    opacity: 1;
    pointer-events: auto;
  }

  .compare-section__mobile-face--back {
    opacity: 0;
    pointer-events: none;
  }

  .compare-section__mobile-header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .compare-section__mobile-title-wrap {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    min-width: 0;
  }

  .compare-section__mobile-switcher {
    position: relative;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
    padding: 2px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--bg-card-subtle) 86%, transparent);
    border: 1px solid color-mix(in srgb, var(--border-card) 72%, transparent);
  }

  .compare-section__mobile-switcher::before {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: calc(50% - 2px);
    height: calc(100% - 4px);
    border-radius: 10px;
    background: color-mix(in srgb, var(--bg-card) 92%, white 8%);
    border: 1px solid color-mix(in srgb, var(--border-card) 88%, transparent);
    box-sizing: border-box;
    transform: translateX(0);
    transition: transform 0.68s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
  }

  .compare-section__mobile-flip--show-b .compare-section__mobile-switcher::before {
    transform: translateX(100%);
  }

  .compare-section__mobile-switcher-btn {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 0;
    height: 34px;
    padding: 0 8px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-secondary);
    transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
  }

  .compare-section__mobile-switcher-btn--active {
    color: var(--text-primary);
  }

  .compare-section__mobile-switcher-copy {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .compare-section__mobile-flip-indicator {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border-radius: 999px;
    border: 1px solid currentColor;
    font-size: 0.56rem;
    font-weight: 800;
    line-height: 1;
    flex-shrink: 0;
  }

  .compare-section__mobile-flip-indicator--a {
    color: var(--compare-city-a);
  }

  .compare-section__mobile-flip-indicator--b {
    color: var(--compare-city-b);
  }

  .compare-section__mobile-summary {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 14px;
    border-radius: 18px;
    background: color-mix(in srgb, var(--bg-card-subtle) 86%, transparent);
    border: 1px solid color-mix(in srgb, var(--border-card) 72%, transparent);
  }

  .compare-section__mobile-summary,
  .compare-section__mobile-metrics {
    transition: transform 0.68s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.52s ease;
    will-change: transform, opacity;
  }

  .compare-section__mobile-face--front .compare-section__mobile-summary,
  .compare-section__mobile-face--front .compare-section__mobile-metrics {
    transform: translateX(0);
    opacity: 1;
  }

  .compare-section__mobile-face--back .compare-section__mobile-summary,
  .compare-section__mobile-face--back .compare-section__mobile-metrics {
    transform: translateX(28px);
    opacity: 0.08;
  }

  .compare-section__mobile-flip--show-b .compare-section__mobile-face--front .compare-section__mobile-summary,
  .compare-section__mobile-flip--show-b .compare-section__mobile-face--front .compare-section__mobile-metrics {
    transform: translateX(-28px);
    opacity: 0.08;
  }

  .compare-section__mobile-flip--show-b .compare-section__mobile-face--back .compare-section__mobile-summary,
  .compare-section__mobile-flip--show-b .compare-section__mobile-face--back .compare-section__mobile-metrics {
    transform: translateX(0);
    opacity: 1;
  }

  .compare-section__mobile-summary-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
  }

  .compare-section__mobile-summary-label {
    font-size: clamp(0.68rem, 2.2vw, 0.72rem);
    font-weight: 700;
    color: var(--text-muted);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .compare-section__mobile-summary-value {
    font-size: clamp(1.48rem, 5.4vw, 1.72rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--text-primary);
    min-width: 0;
  }

  .compare-section__mobile-verdict {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 7px 12px;
    border-radius: 999px;
    border: 1px solid transparent;
    font-size: clamp(0.72rem, 2.5vw, 0.78rem);
    font-weight: 700;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .compare-section__mobile-metrics {
    display: grid;
    gap: 10px;
  }

  .compare-section__mobile-metric {
    padding: 14px;
    border-radius: 18px;
    border: 1px solid color-mix(in srgb, var(--border-card) 72%, transparent);
    background: color-mix(in srgb, var(--bg-card-subtle) 74%, transparent);
  }

  .compare-section__mobile-metric-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  .compare-section__mobile-metric-name {
    font-size: clamp(0.68rem, 2.25vw, 0.72rem);
    font-weight: 700;
    color: var(--text-muted);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .compare-section__mobile-metric-body {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .compare-section__mobile-metric-main {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1;
  }

  .compare-section__mobile-metric-signal {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-width: 10px;
    flex-shrink: 0;
  }

  .compare-section__mobile-triangle {
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
  }

  .compare-section__mobile-signal-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--text-secondary) 78%, transparent);
  }

  .compare-section__mobile-triangle--win {
    border-bottom: 8px solid var(--compare-success);
  }

  .compare-section__mobile-triangle--loss {
    border-top: 8px solid var(--compare-danger);
  }

  .compare-section__mobile-metric-value {
    font-size: clamp(1.22rem, 4.9vw, 1.48rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-primary);
    word-break: break-word;
    min-width: 0;
  }

  .compare-section__mobile-metric-value--win {
    color: var(--compare-success);
  }

  .compare-section__mobile-metric-value--loss {
    color: var(--compare-danger);
  }

  .compare-section__mobile-metric-value--neutral {
    color: var(--text-primary);
  }

  .compare-section__mobile-metric-delta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--border-card) 75%, transparent);
    background: color-mix(in srgb, var(--bg-card) 78%, transparent);
    color: var(--text-secondary);
    font-size: clamp(0.7rem, 2.35vw, 0.77rem);
    font-weight: 700;
    line-height: 1.2;
    text-align: center;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .compare-section__mobile-metric-delta--win {
    border-color: var(--compare-success-border);
    background: var(--compare-success-soft);
    color: var(--compare-success);
  }

  .compare-section__mobile-metric-delta--loss {
    border-color: var(--compare-danger-border);
    background: var(--compare-danger-soft);
    color: var(--compare-danger);
  }

  .compare-section__mobile-metric-delta--neutral {
    color: var(--text-secondary);
  }

  .compare-section__mobile-metric-delta--neutral,
  .compare-section__mobile-metric-signal--neutral {
    border-color: color-mix(in srgb, var(--text-secondary) 25%, var(--border-card));
  }
}
</style>
