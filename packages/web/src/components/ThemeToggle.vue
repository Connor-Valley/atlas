<script setup lang="ts">
import { useTheme } from '../composables/useTheme';
const { isDark, toggle } = useTheme();
</script>

<template>
  <button
    class="theme-toggle"
    :class="{ 'theme-toggle--dark': isDark }"
    @click="toggle"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
  >
    <span class="theme-toggle__icon theme-toggle__icon--sun">☀️</span>
    <span class="theme-toggle__track">
      <span class="theme-toggle__thumb" />
    </span>
    <span class="theme-toggle__icon theme-toggle__icon--moon">🌙</span>
  </button>
</template>
