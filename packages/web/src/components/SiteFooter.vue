<script setup lang="ts">
import { ref } from 'vue';
import AuthModal from './AuthModal.vue';

const showAuthModal = ref(false);
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer__inner">
      <div class="site-footer__top">
        <div class="site-footer__brand">
          <span class="site-footer__logo">Atlas</span>
          <p class="site-footer__tagline">
            Find the city that actually fits how you want to live, built on real Census,
            housing, and climate data instead of guesswork.
          </p>
        </div>

        <nav class="site-footer__col" aria-label="Product">
          <span class="site-footer__heading">Product</span>
          <router-link :to="{ name: 'search' }" class="site-footer__link">City Search</router-link>
          <router-link :to="{ name: 'compare-empty' }" class="site-footer__link">Compare Cities</router-link>
          <button type="button" class="site-footer__link site-footer__link--button" @click="showAuthModal = true">Sign Up</button>
        </nav>

        <nav class="site-footer__col" aria-label="Data & Methodology">
          <span class="site-footer__heading">Data &amp; Methodology</span>
          <router-link :to="{ name: 'data-sources' }" class="site-footer__link">Data Sources</router-link>
          <router-link :to="{ name: 'how-scoring-works' }" class="site-footer__link">How Scoring Works</router-link>
        </nav>

        <nav class="site-footer__col" aria-label="About">
          <span class="site-footer__heading">About</span>
          <router-link :to="{ name: 'about' }" class="site-footer__link">About Atlas</router-link>
          <router-link :to="{ name: 'contact' }" class="site-footer__link">Contact Us</router-link>
        </nav>
      </div>
    </div>

    <AuthModal v-if="showAuthModal" mode="register" @close="showAuthModal = false" />
  </footer>
</template>
