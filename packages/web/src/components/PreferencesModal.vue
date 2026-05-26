<script setup lang="ts">
import PreferencesSetup from './PreferencesSetup.vue';

defineEmits<{ (e: 'close'): void }>();
</script>

<template>
  <Teleport to="body">
    <Transition name="prefs-modal">
      <div class="prefs-modal-backdrop" @click.self="$emit('close')">
        <div class="prefs-modal-panel">
          <div class="prefs-modal-header">
            <span class="prefs-modal-title">
              <span class="mdi mdi-map-marker-star-outline prefs-modal-title__icon"></span>
              Atlas Score Preferences
            </span>
            <button class="prefs-modal-close" @click="$emit('close')">
              <span class="mdi mdi-close"></span>
            </button>
          </div>
          <PreferencesSetup @saved="$emit('close')" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
.prefs-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.prefs-modal-panel {
  width: min(1100px, calc(100vw - 48px));
  max-height: 92vh;
  overflow-y: auto;
  overflow-x: clip;
  background: var(--bg-card);
  border-radius: 20px;
  border: 1px solid color-mix(in srgb, var(--accent) 20%, var(--border-card));
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
}

.prefs-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.prefs-modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.prefs-modal-title__icon {
  color: var(--accent);
  font-size: 1.15rem;
}

.prefs-modal-close {
  background: none;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.95rem;
  transition: color 0.15s, border-color 0.15s;
  flex-shrink: 0;
}

.prefs-modal-close:hover {
  color: var(--text-primary);
  border-color: var(--border-color);
}

/* Transition */
.prefs-modal-enter-active,
.prefs-modal-leave-active {
  transition: opacity 0.2s ease;
}
.prefs-modal-enter-active .prefs-modal-panel,
.prefs-modal-leave-active .prefs-modal-panel {
  transition: opacity 0.2s ease, transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}
.prefs-modal-enter-from,
.prefs-modal-leave-to {
  opacity: 0;
}
.prefs-modal-enter-from .prefs-modal-panel,
.prefs-modal-leave-to .prefs-modal-panel {
  opacity: 0;
  transform: scale(0.96) translateY(10px);
}

@media (max-width: 600px) {
  .prefs-modal-backdrop {
    padding: 0;
    align-items: flex-end;
  }

  .prefs-modal-panel {
    width: 100%;
    max-height: 92vh;
    border-radius: 20px 20px 0 0;
  }
}
</style>
