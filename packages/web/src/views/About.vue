<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import DashboardHeader from '../components/DashboardHeader.vue';
import { fetchCityPhoto } from '../lib/cityPhotos';

const router = useRouter();

function onHeaderSearch(payload: { city: string; state: string }) {
  router.push(`/city/${payload.state}/${payload.city}`);
}

type Shot = { url: string; label: string };

const CANDIDATES: { state: string; city: string; label: string }[] = [
  { state: 'tx', city: 'austin', label: 'Austin, TX' },
  { state: 'or', city: 'portland', label: 'Portland, OR' },
  { state: 'tn', city: 'nashville', label: 'Nashville, TN' },
  { state: 'wa', city: 'seattle', label: 'Seattle, WA' },
  { state: 'nc', city: 'charlotte', label: 'Charlotte, NC' },
];

const shots = ref<Shot[]>([]);

onMounted(async () => {
  const results = await Promise.all(
    CANDIDATES.map(async (c) => {
      const url = await fetchCityPhoto(c.state, c.city);
      return url ? { url, label: c.label } : null;
    })
  );
  shots.value = results.filter((r): r is Shot => r !== null);
});
</script>

<template>
  <div class="container">
    <DashboardHeader page-label="About" @logo-click="router.push({ name: 'home' })" @search="onHeaderSearch" />

    <article class="story">
      <header class="story__masthead">
        <span class="story__eyebrow">About Atlas</span>
        <h1 class="story__headline">Find where you actually want to live.</h1>
        <p class="story__dek">
          A field guide to picking a city, built from the same public records everyone
          already has access to — just finally put in one place.
        </p>
      </header>

      <div class="story__collage" v-if="shots.length">
        <figure
          v-for="(shot, i) in shots.slice(0, 3)"
          :key="shot.label"
          class="story__collage-item"
          :class="`story__collage-item--${i + 1}`"
        >
          <img :src="shot.url" :alt="shot.label" loading="lazy" />
          <figcaption>{{ shot.label }}</figcaption>
        </figure>
      </div>

      <div class="story__body">
        <p>
          I kept doing the same search over and over: open a new tab, look up rent in one
          city, cost of living in another, then try to remember which one had the better
          job market. A spreadsheet helped for about a week. Eventually I got tired of
          rebuilding it every time and turned it into Atlas instead.
        </p>
        <p>
          The idea is simple. Every number that matters when you're deciding where to
          live — rent, home prices, income, taxes, air quality, how the weather actually
          feels in July — already exists in some public dataset. It's just scattered
          across a dozen government agencies and buried in PDFs nobody wants to open.
          Atlas pulls it into one place and lines two cities up side by side.
        </p>

        <blockquote class="story__pullquote">
          "Everything you'd need to decide where to live already exists.
          It's just never in the same place."
        </blockquote>

        <figure class="story__photo" v-if="shots[3]">
          <img :src="shots[3].url" :alt="shots[3].label" loading="lazy" />
          <figcaption>{{ shots[3].label }}</figcaption>
        </figure>

        <h2 class="story__subhead">Where the numbers come from</h2>
        <p>
          Housing, income, and demographic data comes from the U.S. Census Bureau's
          American Community Survey. Home price trends come from the Federal Housing
          Finance Agency's House Price Index. Air quality comes from the EPA. None of it
          is proprietary or scraped — it's the same data a city planner or a mortgage
          underwriter would pull, just translated into something you can actually read
          in a few minutes. See the
          <router-link :to="{ name: 'data-sources' }">full list of data sources</router-link>
          for exactly what feeds each section.
        </p>
        <p>
          From there, Atlas builds a score for each city across eight things people
          actually weigh when they're deciding where to plant themselves — affordability,
          job market, climate, safety, and a handful of others — and lets you tune how
          much each one matters to you. Two people searching the same city can walk away
          with two different scores, because they should.
        </p>

        <h2 class="story__subhead">Still being built</h2>
        <p>
          Atlas is a solo project and very much a work in progress. New sections get
          added as I track down better data — crime, schools, and neighborhood-level
          detail are all on the list. If something looks wrong or missing, that's less
          "known limitation" and more "not built yet."
        </p>
      </div>

      <footer class="story__footer">
        <p>
          Found a bug, or a city that doesn't look right? <a href="mailto:developer.atlas.help@gmail.com">Send a note</a>
          — I read everything.
        </p>
      </footer>
    </article>
  </div>
</template>

<style scoped>
.story {
  max-width: 720px;
  margin: 0 auto;
  padding: 12px 0 72px;
}

.story__masthead {
  padding: 24px 0 8px;
}

.story__eyebrow {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 18px;
}

.story__headline {
  font-family: var(--font-display-serif);
  font-size: clamp(2.1rem, 4.5vw, 3.1rem);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: var(--text-primary);
  margin: 0 0 18px;
}

.story__dek {
  font-size: 1.08rem;
  line-height: 1.55;
  color: var(--text-secondary);
  max-width: 54ch;
  margin: 0;
}

/* ── Staggered photo collage ── */
.story__collage {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin: 40px 0 8px;
}

.story__collage-item {
  margin: 0;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  background: var(--bg-card-inner);
  box-shadow: var(--card-shadow);
}

.story__collage-item--1 { transform: translateY(0); aspect-ratio: 4 / 5; }
.story__collage-item--2 { transform: translateY(28px); aspect-ratio: 4 / 5; }
.story__collage-item--3 { transform: translateY(-8px); aspect-ratio: 4 / 5; }

.story__collage-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: sepia(28%) saturate(130%) hue-rotate(-6deg) brightness(0.94);
  transition: filter 0.35s ease, transform 0.35s ease;
}

.story__collage-item:hover img {
  filter: sepia(0%) saturate(105%) hue-rotate(0deg) brightness(1);
  transform: scale(1.03);
}

.story__collage-item figcaption {
  position: absolute;
  left: 10px;
  bottom: 8px;
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.04em;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
}

/* ── Narrative body ── */
.story__body {
  margin-top: 56px;
}

.story__body p {
  font-size: 1.02rem;
  line-height: 1.75;
  color: var(--text-primary);
  margin: 0 0 22px;
  max-width: 66ch;
}

.story__body p a {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.story__subhead {
  font-family: var(--font-display-serif);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 48px 0 18px;
}

.story__pullquote {
  font-family: var(--font-display-serif);
  font-style: italic;
  font-size: 1.6rem;
  line-height: 1.4;
  color: var(--accent);
  border: none;
  margin: 44px 0 44px -8px;
  padding: 0 0 0 24px;
  border-left: 3px solid var(--accent);
  max-width: 52ch;
}

.story__photo {
  margin: 40px 0 40px -8px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--card-shadow-md);
}

.story__photo img {
  width: calc(100% + 16px);
  max-height: 380px;
  object-fit: cover;
  display: block;
  filter: sepia(20%) saturate(120%) brightness(0.96);
}

.story__photo figcaption {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  padding: 10px 4px 0;
}

.story__footer {
  margin-top: 56px;
  padding-top: 24px;
  border-top: 1px solid var(--border-subtle);
}

.story__footer p {
  font-size: 0.92rem;
  color: var(--text-secondary);
  margin: 0;
}

.story__footer a {
  color: var(--accent);
}

@media (max-width: 720px) {
  .story__collage {
    grid-template-columns: repeat(2, 1fr);
  }

  .story__collage-item--3 {
    grid-column: span 2;
    aspect-ratio: 16 / 9;
  }

  .story__collage-item--1,
  .story__collage-item--2 {
    transform: none;
  }

  .story__pullquote,
  .story__photo {
    margin-left: 0;
  }
}

@media (max-width: 480px) {
  .story__collage {
    grid-template-columns: 1fr;
  }

  .story__collage-item--3 {
    grid-column: span 1;
  }
}
</style>
