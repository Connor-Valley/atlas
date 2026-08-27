<script setup lang="ts">
import { useRouter } from 'vue-router';
import DashboardHeader from '../components/DashboardHeader.vue';

const router = useRouter();

function onHeaderSearch(payload: { city: string; state: string }) {
  router.push(`/city/${payload.state}/${payload.city}`);
}

const dimensions = [
  { icon: 'mdi-weather-partly-cloudy', label: 'Climate', note: 'Year-round weather quality: sunny days, mild temps, and low hazard risk.' },
  { icon: 'mdi-credit-card-outline', label: 'Cost of Living', note: 'How far income stretches relative to local rent and cost of living.' },
  { icon: 'mdi-trending-up', label: 'Job Market', note: 'Size of the labor market actually reachable within 25 miles, plus unemployment and growth trends.' },
  { icon: 'mdi-home-city-outline', label: 'Lifestyle', note: 'Day-to-day quality of life including restaurants, arts, and walkability.' },
  { icon: 'mdi-chart-line', label: 'Opportunity', note: "The area's dominant job industry, based on what residents actually work in." },
  { icon: 'mdi-leaf-circle-outline', label: 'Air Quality', note: 'Air cleanliness based on EPA AQI data: good days vs. unhealthy days.' },
  { icon: 'mdi-map-marker-radius-outline', label: 'Getting Around', note: 'Access to transportation options including airports and public transit.' },
  { icon: 'mdi-vote-outline', label: 'Political Lean', note: 'County or, where we have it, precinct-level presidential results. Opt-in only, and off by default.' },
];

const tiers = [
  { range: '80–100', label: 'Excellent', tier: 'excellent' },
  { range: '65–79', label: 'Good', tier: 'good' },
  { range: '45–64', label: 'Average', tier: 'average' },
  { range: '30–44', label: 'Below Average', tier: 'below' },
  { range: '0–29', label: 'Poor', tier: 'poor' },
];
</script>

<template>
  <div class="container">
    <DashboardHeader page-label="How Scoring Works" @logo-click="router.push({ name: 'home' })" @search="onHeaderSearch" />

    <article class="sources">
      <header class="sources__masthead">
        <span class="sources__eyebrow">Data &amp; Methodology</span>
        <h1 class="sources__headline">How the Atlas Score works.</h1>
        <p class="sources__dek">
          There's no single formula. The score changes depending on whether you've told Atlas
          what you're looking for, and this page walks through the actual mechanism behind it.
        </p>
      </header>

      <section class="sources__group">
        <h2 class="sources__group-label">Scored against what you want, not a fixed formula</h2>
        <p class="sources__note sources__note--lead">
          A short quiz asks what you want out of each dimension, like "budget-friendly" for cost
          of living or "warm &amp; sunny" for climate. Every city then gets scored on how well it
          actually matches what you picked: a close match scores near 100, a clean mismatch
          scores 25–35, with shades in between for partial matches.
        </p>
        <p class="sources__note">
          Without an account, there's no quiz answer to match against yet, so there's nothing to
          score a city on. That's why you'll just see a prompt to personalize instead of a score
          card. An objective, one-size-fits-all score for that case is on the roadmap, but isn't
          live today.
        </p>
      </section>

      <section class="sources__group">
        <h2 class="sources__group-label">The dimensions it scores</h2>
        <ul class="sources__list sources__list--grid">
          <li v-for="dim in dimensions" :key="dim.label" class="sources__item sources__item--dim">
            <span :class="`mdi ${dim.icon}`" class="sources__item-icon"></span>
            <div class="sources__item-text">
              <span class="sources__item-name">{{ dim.label }}</span>
              <span class="sources__item-note">{{ dim.note }}</span>
            </div>
          </li>
        </ul>
        <p class="sources__note">
          A ninth dimension, Safety, has a reserved slot in the score but isn't factored in yet.
          It's held back for the same reason crime figures are missing from the
          <router-link :to="{ name: 'data-sources' }">data sources page</router-link>: no reliable
          city/county join yet, so nothing gets shown, or scored, half-right.
        </p>
      </section>

      <section class="sources__group">
        <h2 class="sources__group-label">How much each dimension counts</h2>
        <p class="sources__note sources__note--lead">
          There's no slider for "how much do you care about climate." Instead, the specific
          answer you pick sets that dimension's weight automatically. Someone who picks
          "budget-friendly" for cost of living is telling Atlas that dimension matters a lot, so
          it's weighted heavily; someone who picks "flexible" is telling Atlas it barely matters,
          so it's weighted lightly. Every dimension's weighted match score is then averaged into
          the single number you see. Political Lean, when turned on, is weighted lower than the
          rest when it's only backed by a county-wide result (a poor stand-in for one specific
          city) and weighted normally wherever we've sourced real precinct-level results instead.
        </p>
      </section>

      <section class="sources__group">
        <h2 class="sources__group-label">Reading the score</h2>
        <ul class="sources__list sources__list--tiers">
          <li v-for="t in tiers" :key="t.label" class="sources__tier" :data-tier="t.tier">
            <span class="sources__tier-range">{{ t.range }}</span>
            <span class="sources__tier-label">{{ t.label }}</span>
          </li>
        </ul>
      </section>

      <footer class="sources__footer">
        <p>
          Want to see your own score instead of the generic version? Answer a few questions on
          your <router-link :to="{ name: 'profile' }">profile</router-link> and every city page
          will score against them from then on.
        </p>
      </footer>
    </article>
  </div>
</template>

<style scoped>
.sources {
  max-width: 720px;
  margin: 0 auto;
  padding: 12px 0 72px;
}

.sources__masthead {
  padding: 24px 0 40px;
  border-bottom: 1px solid var(--border-subtle);
}

.sources__eyebrow {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 18px;
}

.sources__headline {
  font-family: var(--font-display-serif);
  font-size: clamp(1.9rem, 4vw, 2.6rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: var(--text-primary);
  margin: 0 0 16px;
}

.sources__dek {
  font-size: 1.02rem;
  line-height: 1.55;
  color: var(--text-secondary);
  max-width: 58ch;
  margin: 0;
}

.sources__group {
  padding: 36px 0;
  border-bottom: 1px solid var(--border-subtle);
}

.sources__group-label {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 0 0 20px;
}

.sources__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.sources__item--stack {
  display: block;
}

.sources__item-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.sources__item-name {
  font-family: var(--font-display-serif);
  font-size: 1.08rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.35;
}

.sources__item-note {
  font-size: 0.88rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.sources__note {
  font-size: 0.88rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 20px 0 0;
  max-width: 62ch;
}

.sources__note--lead {
  margin-top: 0;
  max-width: 66ch;
}

.sources__note a,
.sources__footer a {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Dimension grid */
.sources__list--grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px 28px;
}

.sources__item--dim {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.sources__item-icon {
  font-size: 1.15rem;
  color: var(--accent);
  margin-top: 2px;
  flex-shrink: 0;
}

/* Tier legend */
.sources__list--tiers {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 10px;
}

.sources__tier {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--bg-card-inner);
  border: 1px solid var(--border-card);
  font-size: 0.82rem;
}

.sources__tier-range {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--text-muted);
}

.sources__tier-label {
  font-weight: 700;
}

.sources__tier[data-tier="excellent"] .sources__tier-label,
.sources__tier[data-tier="good"] .sources__tier-label { color: var(--positive); }
.sources__tier[data-tier="average"] .sources__tier-label { color: var(--caution); }
.sources__tier[data-tier="below"] .sources__tier-label { color: var(--warning); }
.sources__tier[data-tier="poor"] .sources__tier-label { color: var(--danger); }

.sources__footer {
  padding-top: 36px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sources__footer p {
  font-size: 0.92rem;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0;
  max-width: 60ch;
}

@media (max-width: 560px) {
  .sources__list--grid {
    grid-template-columns: 1fr;
  }
}
</style>
