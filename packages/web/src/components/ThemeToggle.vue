<script setup lang="ts">
import { useTheme } from '../composables/useTheme';
const { isDark, toggle } = useTheme();
</script>

<template>
  <label
    class="theme-toggle switch"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
  >
    <input :checked="isDark" type="checkbox" @change="toggle">
    <span class="slider"></span>
  </label>
</template>
