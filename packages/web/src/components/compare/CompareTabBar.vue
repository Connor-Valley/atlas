<script setup lang="ts">
defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [tab: string] }>();

const tabs = [
  { id: 'cartographer', label: 'Cartographer', num: '01' },
  { id: 'matchup', label: 'Matchup', num: '02' },
  { id: 'dossier', label: 'Dossier', num: '03' },
];
</script>

<template>
  <nav class="compare-tab-bar" aria-label="Comparison views">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="compare-tab-bar__tab"
      :class="{ 'compare-tab-bar__tab--active': modelValue === tab.id }"
      :aria-current="modelValue === tab.id ? 'page' : undefined"
      @click="emit('update:modelValue', tab.id)"
    >
      {{ tab.label }}<span class="compare-tab-bar__num">{{ tab.num }}</span>
    </button>
  </nav>
</template>
