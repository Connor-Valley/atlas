<script setup lang="ts">
import { ref } from "vue";

defineProps<{ title: string }>();
const open = ref(false);
</script>

<template>
  <div class="section">
    <button class="section-header" @click="open = !open">
      {{ title }}
      <span>{{ open ? "▲" : "▼" }}</span>
    </button>

    <div v-if="open" class="section-content">
      <slot />
    </div>
  </div>
</template>
