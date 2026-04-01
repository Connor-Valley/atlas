<script setup lang="ts">
const emit = defineEmits<{ (e: "close"): void }>();
</script>

<template>
  <div class="housing-exp">
    <section class="data-card progress-state-card">
      <div class="progress-state-card__icon-wrap">
        <span class="mdi mdi-hammer-wrench progress-state-card__icon"></span>
      </div>
      <h2 class="progress-state-card__title">Affordability details are in progress</h2>
      <p class="progress-state-card__body">
        This section is still under construction. Use the back button to return to the city dashboard.
      </p>
      <button class="progress-state-card__action" @click="emit('close')">Back to Dashboard</button>
    </section>
  </div>
</template>
