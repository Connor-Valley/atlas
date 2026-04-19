<script setup lang="ts">
import { computed } from "vue";
import type { ComparedCity } from "../../lib/compare";

const props = defineProps<{
  cityA: ComparedCity;
  cityB: ComparedCity;
}>();

// Overall score: weighted average of 4 axes
const overallA = computed(() =>
  Math.round((props.cityA.scores.income + props.cityA.scores.housing + props.cityA.scores.affordability + props.cityA.scores.people) / 4)
);
const overallB = computed(() =>
  Math.round((props.cityB.scores.income + props.cityB.scores.housing + props.cityB.scores.affordability + props.cityB.scores.people) / 4)
);

// Radar chart
const svgSize = 300;
const center = svgSize / 2;
const maxRadius = 88;
const axes = ["Housing", "People", "Affordability", "Income"];
const numAxes = axes.length;

function axisPoint(i: number, r: number): { x: number; y: number } {
  const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
  return {
    x: center + r * Math.cos(angle),
    y: center + r * Math.sin(angle),
  };
}

function axisLabelPoint(i: number): { x: number; y: number } {
  const labelRadiusByAxis = [106, 132, 106, 132];
  return axisPoint(i, labelRadiusByAxis[i] ?? 116);
}

function scoreToRadius(score: number): number {
  return (score / 100) * maxRadius;
}

function buildPolygon(scores: number[]): string {
  return scores
    .map((s, i) => {
      const pt = axisPoint(i, scoreToRadius(s));
      return `${pt.x},${pt.y}`;
    })
    .join(" ");
}

const gridRings = [25, 50, 75, 100];
const scoresA = computed(() => [
  props.cityA.scores.housing,
  props.cityA.scores.people,
  props.cityA.scores.affordability,
  props.cityA.scores.income,
]);
const scoresB = computed(() => [
  props.cityB.scores.housing,
  props.cityB.scores.people,
  props.cityB.scores.affordability,
  props.cityB.scores.income,
]);

const polygonA = computed(() => buildPolygon(scoresA.value));
const polygonB = computed(() => buildPolygon(scoresB.value));

// Divergence bars
const divergenceMetrics = computed(() => {
  const a = props.cityA;
  const b = props.cityB;
  const items = [
    {
      label: "Median Rent",
      aVal: a.housing.housing.medianRent ?? 0,
      bVal: b.housing.housing.medianRent ?? 0,
      format: (v: number) => `$${Math.round(v).toLocaleString()}`,
      direction: "lower" as const,
    },
    {
      label: "Home Value",
      aVal: a.housing.housing.medianHomeValue ?? 0,
      bVal: b.housing.housing.medianHomeValue ?? 0,
      format: (v: number) => `$${Math.round(v).toLocaleString()}`,
      direction: "lower" as const,
    },
    {
      label: "HH Income",
      aVal: a.income.medianHouseholdIncome ?? 0,
      bVal: b.income.medianHouseholdIncome ?? 0,
      format: (v: number) => `$${Math.round(v).toLocaleString()}`,
      direction: "higher" as const,
    },
    {
      label: "Rent / Income",
      aVal: (a.affordability.rentToIncomeRatio ?? 0) * 100,
      bVal: (b.affordability.rentToIncomeRatio ?? 0) * 100,
      format: (v: number) => `${v.toFixed(1)}%`,
      direction: "lower" as const,
    },
    {
      label: "Poverty Rate",
      aVal: a.income.povertyRate ?? 0,
      bVal: b.income.povertyRate ?? 0,
      format: (v: number) => `${v.toFixed(1)}%`,
      direction: "lower" as const,
    },
  ];

  // Compute normalized divergence (0-100)
  const maxDelta = Math.max(...items.map(m => Math.abs(m.aVal - m.bVal)), 1);
  return items.map(m => {
    const delta = Math.abs(m.aVal - m.bVal);
    const normalizedWidth = (delta / maxDelta) * 100;
    // winner: for "lower" direction, lower value wins; for "higher", higher wins
    const winner: "a" | "b" | "tie" = delta < 0.01 ? "tie"
      : m.direction === "lower"
        ? (m.aVal < m.bVal ? "a" : "b")
        : (m.aVal > m.bVal ? "a" : "b");
    return {
      ...m,
      delta,
      normalizedWidth,
      winner,
      aFormatted: m.format(m.aVal),
      bFormatted: m.format(m.bVal),
    };
  }).sort((x, y) => y.normalizedWidth - x.normalizedWidth);
});

const stateA = computed(() => props.cityA.state?.toUpperCase() ?? "—");
const stateB = computed(() => props.cityB.state?.toUpperCase() ?? "—");

function panelTitle(label: string): string {
  if (label.startsWith("OVERALL PROFILE")) return "Shape of each city";
  if (label.startsWith("HEADLINE DELTAS")) return "Where they diverge";
  return label;
}

function divergenceBarStyle(normalizedWidth: number, winner: "a" | "b" | "tie", side: "a" | "b"): Record<string, string> {
  const width = `${Math.min(48, Math.max(4, normalizedWidth * 0.48))}%`;
  if (winner !== side) return { width: "0%" };
  return side === "a"
    ? { width, right: "50%" }
    : { width, left: "50%" };
}
</script>

<template>
  <div class="ed-section">
    <!-- Head-to-head scores -->
    <div class="matchup-head">
      <div class="matchup-head__city matchup-head__city--a">
        <span class="matchup-head__eyebrow">
          <span>CITY A</span>
          <span class="matchup-head__eyebrow-dot">•</span>
          <span>{{ stateA }}</span>
        </span>
        <span class="matchup-head__city-name matchup-head__city-name--a">{{ cityA.cityInfo.name }}</span>
        <span class="matchup-head__score">
          <span class="matchup-head__score-label">OVERALL</span>
          <span class="matchup-head__score-value matchup-head__score-value--a">{{ overallA }}</span>
          <span class="matchup-head__score-scale">/100</span>
        </span>
      </div>
      <div class="matchup-head__center">
        <span class="matchup-head__kicker">MATCHUP</span>
        <span class="matchup-head__vs">vs</span>
      </div>
      <div class="matchup-head__city matchup-head__city--b">
        <span class="matchup-head__eyebrow">
          <span>CITY B</span>
          <span class="matchup-head__eyebrow-dot">•</span>
          <span>{{ stateB }}</span>
        </span>
        <span class="matchup-head__city-name matchup-head__city-name--b">{{ cityB.cityInfo.name }}</span>
        <span class="matchup-head__score">
          <span class="matchup-head__score-label">OVERALL</span>
          <span class="matchup-head__score-value matchup-head__score-value--b">{{ overallB }}</span>
          <span class="matchup-head__score-scale">/100</span>
        </span>
      </div>
    </div>

    <div class="matchup-overview">
      <!-- Radar chart panel -->
      <div class="matchup-overview__panel">
        <div class="matchup-overview__panel-header">
          <div class="matchup-overview__panel-label">OVERALL PROFILE</div>
          <h3 class="matchup-overview__panel-title">{{ panelTitle("OVERALL PROFILE") }}</h3>
        </div>
        <div class="radar-chart">
          <svg :width="svgSize" :height="svgSize" :viewBox="`0 0 ${svgSize} ${svgSize}`">
            <!-- Grid rings -->
            <g>
              <polygon
                v-for="pct in gridRings"
                :key="pct"
                :points="[0,1,2,3].map(i => {
                  const pt = axisPoint(i, (pct / 100) * maxRadius);
                  return `${pt.x},${pt.y}`;
                }).join(' ')"
                fill="none"
                stroke="var(--border-color)"
                stroke-width="0.75"
              />
            </g>
            <!-- Axis lines -->
            <g>
              <line
                v-for="(_, i) in axes"
                :key="i"
                :x1="center"
                :y1="center"
                :x2="axisPoint(i, maxRadius).x"
                :y2="axisPoint(i, maxRadius).y"
                stroke="var(--border-color)"
                stroke-width="0.75"
              />
            </g>
            <!-- City B polygon -->
            <polygon
              :points="polygonB"
              :fill="`color-mix(in srgb, var(--city-b) 25%, transparent)`"
              :stroke="`var(--city-b)`"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
            <!-- City A polygon -->
            <polygon
              :points="polygonA"
              :fill="`color-mix(in srgb, var(--city-a) 20%, transparent)`"
              :stroke="`var(--city-a)`"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
            <!-- Axis labels -->
            <text
              v-for="(axis, i) in axes"
              :key="axis"
              :x="axisLabelPoint(i).x"
              :y="axisLabelPoint(i).y"
              text-anchor="middle"
              dominant-baseline="middle"
              font-family="var(--font-mono)"
              font-size="12"
              fill="var(--text-muted)"
              letter-spacing="2"
            >{{ axis.toUpperCase() }}</text>
          </svg>
        </div>
        <div class="matchup-overview__legend">
          <div class="matchup-overview__legend-item matchup-overview__legend-item--a">
            <span class="matchup-overview__legend-swatch"></span>
            <span class="matchup-overview__legend-name">{{ cityA.cityInfo.name }}</span>
          </div>
          <div class="matchup-overview__legend-item matchup-overview__legend-item--b">
            <span class="matchup-overview__legend-swatch"></span>
            <span class="matchup-overview__legend-name">{{ cityB.cityInfo.name }}</span>
          </div>
        </div>
      </div>

      <!-- Divergence bars panel -->
      <div class="matchup-overview__panel">
        <div class="matchup-overview__panel-header">
          <div class="matchup-overview__panel-label">HEADLINE DELTAS</div>
          <h3 class="matchup-overview__panel-title">{{ panelTitle("HEADLINE DELTAS") }}</h3>
        </div>
        <div class="divergence-list">
          <div v-for="bar in divergenceMetrics" :key="bar.label" class="divergence-bar-row">
            <div class="divergence-bar__label-row">
              <div class="divergence-bar__label">{{ bar.label }}</div>
            </div>

            <div
              class="divergence-bar__value divergence-bar__value--a"
              :class="{ 'divergence-bar__value--wins-a': bar.winner === 'a' }"
            >
              {{ bar.aFormatted }}
            </div>

            <div class="divergence-bar__track-wrap">
              <div class="divergence-bar__track"></div>
              <div class="divergence-bar__spine"></div>
              <div
                class="divergence-bar__rect divergence-bar__rect--a"
                :style="divergenceBarStyle(bar.normalizedWidth, bar.winner, 'a')"
              ></div>
              <div
                class="divergence-bar__rect divergence-bar__rect--b"
                :style="divergenceBarStyle(bar.normalizedWidth, bar.winner, 'b')"
              ></div>
            </div>

            <div
              class="divergence-bar__value divergence-bar__value--b"
              :class="{ 'divergence-bar__value--wins-b': bar.winner === 'b' }"
            >
              {{ bar.bFormatted }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
