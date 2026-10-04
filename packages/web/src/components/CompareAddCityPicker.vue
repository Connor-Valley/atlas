<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import CitySearch from "./CitySearch.vue";

const emit = defineEmits<{ select: [{ state: string; city: string }]; close: [] }>();

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  document.body.style.overflow = "hidden";
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = "";
});

function onSearch(payload: { city: string; state: string }) {
  emit("select", payload);
}
</script>

<template>
  <Teleport to="body">
    <div class="cmp-picker-backdrop" @click.self="emit('close')">
      <div class="cmp-picker" role="dialog" aria-modal="true" aria-label="Add a city">
        <div class="cmp-picker__header">
          <span class="cmp-picker__title">Add a city</span>
          <button class="cmp-picker__close" type="button" aria-label="Close" @click="emit('close')">
            <span class="mdi mdi-close"></span>
          </button>
        </div>

        <div class="cmp-picker__body">
          <CitySearch @search="onSearch" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cmp-picker-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.cmp-picker {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 18px;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.45), 0 6px 18px rgba(0, 0, 0, 0.25);
  overflow: visible;
}

.cmp-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border-subtle);
}

.cmp-picker__title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.cmp-picker__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.95rem;
  cursor: pointer;
}

.cmp-picker__close:hover {
  background: color-mix(in srgb, var(--text-primary) 8%, transparent);
  color: var(--text-primary);
}

.cmp-picker__body {
  padding: 20px;
}

.cmp-picker__body :deep(.search-bar) {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  padding: 0;
  margin-bottom: 0;
  background: none;
  border: none;
  box-shadow: none;
}

.cmp-picker__body :deep(.search-bar__submit) {
  width: 100%;
  height: 46px;
}

@media (max-width: 640px) {
  .cmp-picker-backdrop {
    padding: 0;
    align-items: flex-end;
  }

  .cmp-picker {
    max-width: none;
    border-radius: 18px 18px 0 0;
  }
}
</style>
