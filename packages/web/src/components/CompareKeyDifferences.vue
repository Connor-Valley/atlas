<script setup lang="ts">
import type { KeyDifference } from "../lib/compare";

defineProps<{ items: KeyDifference[] }>();
</script>

<template>
  <section class="cmp-diff" aria-label="Key differences">
    <div class="cmp-diff__header">
      <span class="cmp-diff__eyebrow">KEY DIFFERENCES</span>
    </div>
    <div class="cmp-diff__items">
      <template v-for="(item, i) in items" :key="item.label">
        <div v-if="i > 0" class="cmp-diff__divider"></div>
        <div class="cmp-diff__item">
          <div class="cmp-diff__label">{{ item.label }}</div>
          <p class="cmp-diff__text">{{ item.text }}</p>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.cmp-diff {
  border: 1px solid var(--border-card);
  border-left: 3px solid var(--accent);
  border-radius: 16px;
  background: var(--bg-card);
  padding: 18px 22px;
  margin-bottom: 16px;
}

.cmp-diff__header {
  margin-bottom: 14px;
}

.cmp-diff__eyebrow {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  color: var(--accent);
}

.cmp-diff__items {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}

.cmp-diff__item {
  flex: 1 1 220px;
  padding: 0 20px;
}

.cmp-diff__divider {
  width: 1px;
  align-self: stretch;
  background: var(--border-subtle);
}

.cmp-diff__label {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.cmp-diff__text {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.45;
  color: var(--text-secondary);
}

@media (max-width: 640px) {
  .cmp-diff__item {
    flex: 1 1 100%;
    padding: 10px 0;
  }

  .cmp-diff__divider {
    display: none;
  }
}
</style>
