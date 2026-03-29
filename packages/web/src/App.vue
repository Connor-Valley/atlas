<script setup lang="ts">
import { onMounted } from 'vue';
import { useTheme } from './composables/useTheme';
import ThemeToggle from './components/ThemeToggle.vue';

const { init } = useTheme();

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
    <ThemeToggle />
    <router-view />
  </div>
</template>
