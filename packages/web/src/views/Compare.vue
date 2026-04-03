<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import SiteHeader from "../components/SiteHeader.vue";

const props = defineProps<{
  state: string;
  city: string;
}>();

const router = useRouter();

const cityDisplayName = computed(() =>
  props.city
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
);

function goBack() {
  router.push({
    name: "city",
    params: {
      state: props.state,
      city: props.city,
    },
  });
}

function resetToHome() {
  router.push({ name: "home" });
}
</script>

<template>
  <div class="container compare-view">
    <SiteHeader
      :show-theme-toggle="true"
      @logo-click="resetToHome"
    />

    <div class="compare-view__topbar">
      <button class="breadcrumb compare-view__back" @click="goBack">
        <span class="breadcrumb__arr breadcrumb__arr--1 mdi mdi-arrow-left"></span>
        <span class="breadcrumb__text">Back</span>
        <span class="breadcrumb__arr breadcrumb__arr--2 mdi mdi-arrow-left"></span>
        <span class="breadcrumb__circle"></span>
      </button>
    </div>

    <section class="compare-placeholder">
      <div class="compare-placeholder__eyebrow">
        <span class="mdi mdi-compare-horizontal compare-placeholder__eyebrow-icon"></span>
        Comparison view
      </div>
      <h1 class="compare-placeholder__title">City comparison is under construction</h1>
      <p class="compare-placeholder__body">
        This is where Atlas will compare <strong>{{ cityDisplayName }}, {{ state.toUpperCase() }}</strong>
        against another city across the dashboard metrics.
      </p>
      <div class="compare-placeholder__status">
        <span class="compare-placeholder__status-dot"></span>
        Placeholder page is live and ready for the next step.
      </div>
    </section>
  </div>
</template>
