<script setup lang="ts">
import { useToast } from '../composables/useToast';

const { toasts, dismiss } = useToast();
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="`toast--${toast.type}`"
          @click="dismiss(toast.id)"
        >
          <span class="toast__icon mdi" :class="{
            'mdi-alert-circle-outline': toast.type === 'error',
            'mdi-check-circle-outline': toast.type === 'success',
            'mdi-information-outline':  toast.type === 'info',
          }"></span>
          <span class="toast__msg">{{ toast.message }}</span>
          <button class="toast__close mdi mdi-close" @click.stop="dismiss(toast.id)" />
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
/* TODO(color-tokens): This file still contains hardcoded colors outside shared CSS variables. Keep them unchanged during the token refactor. */
.toast-container {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 260px;
  max-width: 420px;
  padding: 13px 16px;
  border-radius: 14px;
  border: 1px solid transparent;
  font-size: 0.9rem;
  font-weight: 600;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  pointer-events: auto;
}

.toast--error {
  background: color-mix(in srgb, var(--danger) 12%, var(--bg-card));
  border-color: color-mix(in srgb, var(--danger) 35%, transparent);
  color: var(--danger);
}

.toast--success {
  background: color-mix(in srgb, var(--positive) 12%, var(--bg-card));
  border-color: var(--border-color);
  color: var(--accent);
}

.toast--info {
  background: color-mix(in srgb, var(--bg-card) 92%, transparent);
  border-color: var(--border-card);
  color: var(--text-secondary);
}

.toast__icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.toast__msg {
  flex: 1;
  line-height: 1.4;
}

.toast__close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: inherit;
  opacity: 0.5;
  cursor: pointer;
  font-size: 1rem;
  padding: 0;
  line-height: 1;
  transition: opacity 0.15s ease;
}

.toast__close:hover {
  opacity: 1;
}

/* Transition */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(20px) scale(0.97);
}

@media (max-width: 640px) {
  .toast-container {
    bottom: 16px;
    right: 12px;
    left: 12px;
  }

  .toast {
    max-width: 100%;
  }
}
</style>
