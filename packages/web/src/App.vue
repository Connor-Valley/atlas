<script setup lang="ts">
import { onMounted } from 'vue';
import { useTheme } from './composables/useTheme';
import { useAuthModal } from './composables/useAuthModal';
import { useBackendHealth } from './composables/useBackendHealth';
import ToastContainer from './components/ToastContainer.vue';
import SiteFooter from './components/SiteFooter.vue';
import { footerHidden } from './composables/useFooterVisibility';
import AuthModal from './components/AuthModal.vue';
import BackendWakingUp from './components/BackendWakingUp.vue';

const { init } = useTheme();
const { showAuthModal, authModalMode, closeAuthModal } = useAuthModal();
const { isAwake, isChecking } = useBackendHealth();

onMounted(() => {
  init();

  document.addEventListener('mousemove', (e) => {
    const card = (e.target as Element).closest('.data-card') as HTMLElement | null;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  });
});
</script>

<template>
  <div class="app">
    <div class="app-safe-top" aria-hidden="true"></div>
    <BackendWakingUp v-if="!isAwake && !isChecking" />
    <template v-else-if="isAwake">
      <router-view />
      <SiteFooter v-if="!footerHidden" />
      <ToastContainer />
      <AuthModal v-if="showAuthModal" :mode="authModalMode" @close="closeAuthModal" />
    </template>
  </div>
</template>

<style>
@media (max-width: 640px) {
  .app-safe-top {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: calc(env(safe-area-inset-top, 0px) + 8px);
    background: var(--bg-main);
    z-index: 500;
    pointer-events: none;
  }
}
</style>
