<script setup lang="ts">
import { useTheme } from '../composables/useTheme';
const { isDark, toggle } = useTheme();
</script>

<template>
  <label
    class="theme-toggle theme-toggle--switch"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
  >
    <input :checked="isDark" type="checkbox" @change="toggle">
    <span class="slider"></span>
  </label>

  <button
    type="button"
    class="theme-toggle-mobile"
    :class="isDark ? 'theme-toggle-mobile--dark' : 'theme-toggle-mobile--light'"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    :aria-pressed="isDark"
    @click="toggle"
  >
    <span
      class="theme-toggle-mobile__icon mdi"
      :class="isDark ? 'mdi-moon-waxing-crescent' : 'mdi-white-balance-sunny'"
      aria-hidden="true"
    ></span>
  </button>
</template>
