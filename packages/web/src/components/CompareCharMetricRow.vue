<script setup lang="ts">
import type { CompareCharRow } from "../lib/compare";

defineProps<{
  row: CompareCharRow;
}>();

// Display-only abbreviations for the compare table's char cells — the full phrases
// (e.g. "Solid regional job market") are the canonical labels used elsewhere (persona
// setup, AtlasScoreCard cubes) and stay untouched; this just keeps the 4-column table
// from getting text-heavy.
const SHORTHAND: Record<string, string> = {
  "Major metro job market": "Major metro market",
  "Large regional job market": "Large job market",
  "Solid regional job market": "Solid job market",
  "Small regional job market": "Small job market",
  "Limited regional job market": "Limited job market",
  "Agriculture & Natural Resources": "Agriculture",
  "Construction & Trades": "Construction",
  "Wholesale & Distribution": "Wholesale",
  "Transportation & Logistics": "Transport & Logistics",
  "Tech & Professional Services": "Tech & Pro Services",
  "Administrative & Support Services": "Admin & Support",
  "Education & Healthcare": "Education & Health",
  "Hospitality & Entertainment": "Hospitality",
  "Government & Public Sector": "Government",
  "Moderate air quality": "Moderate AQI",
  "Balanced & accessible": "Balanced access",
  "Suburban & drivable": "Suburban & car",
};

function shorten(char: string | null): string {
  if (!char) return "—";
  return SHORTHAND[char] ?? char;
}
</script>

<template>
  <div class="cmp-char-row">
    <div class="cmp-char-row__label-col">
      <span class="cmp-char-row__label">{{ row.label }}</span>
    </div>
    <div v-for="(cell, i) in row.cells" :key="i" class="cmp-char-cell">
      <span
        v-if="cell.tier"
        class="cmp-char-cell__dot"
        :class="`cmp-char-cell__dot--${cell.tier}`"
      ></span>
      <span class="cmp-char-cell__text" :title="cell.char ?? undefined">{{ shorten(cell.char) }}</span>
    </div>
  </div>
</template>

<style scoped>
.cmp-char-row {
  display: flex;
  border-top: 1px solid var(--border-subtle);
}

.cmp-char-row:hover {
  background: color-mix(in srgb, var(--text-primary) 3%, transparent);
}

.cmp-char-row__label-col {
  width: 260px;
  flex: none;
  padding: 17px 16px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  text-align: right;
}

.cmp-char-row__label {
  font-size: 1rem;
  color: var(--text-primary);
}

.cmp-char-cell {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 17px 16px;
  min-width: 0;
  border-left: 1px solid var(--border-subtle);
}

.cmp-char-cell__dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.cmp-char-cell__dot--good {
  background: var(--positive);
}

.cmp-char-cell__dot--average {
  background: var(--caution);
}

.cmp-char-cell__dot--below {
  background: var(--warning);
}

.cmp-char-cell__text {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-primary);
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
