<script setup lang="ts">
defineProps<{
  state: string;
  city: string;
}>();
</script>

<template>
  <div class="container">
    <h1>Housing Details</h1>
    <h2>{{ city }}, {{ state }}</h2>

    <div class="hero">
      <p>Placeholder Housing page</p>
    </div>
  </div>
</template>

