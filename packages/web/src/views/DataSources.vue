<script setup lang="ts">
import { useRouter } from 'vue-router';
import DashboardHeader from '../components/DashboardHeader.vue';

const router = useRouter();

function onHeaderSearch(payload: { city: string; state: string }) {
  router.push(`/city/${payload.state}/${payload.city}`);
}

type Source = { name: string; note: string; url: string };
type Group = { label: string; sources: Source[] };

const groups: Group[] = [
  {
    label: 'People & housing',
    sources: [
      {
        name: 'U.S. Census Bureau — American Community Survey (5-Year Estimates)',
        note: 'Income, rent, home values, education, demographics — the backbone of most numbers on Atlas.',
        url: 'https://www.census.gov/data/developers/data-sets/acs-5year.2010.html',
      },
      {
        name: 'Federal Housing Finance Agency — House Price Index',
        note: 'Home price trends over time, at the metro and state level.',
        url: 'https://www.fhfa.gov/data/hpi',
      },
    ],
  },
  {
    label: 'Money',
    sources: [
      {
        name: 'U.S. Bureau of Economic Analysis — Regional Price Parities',
        note: 'How far a dollar goes in one place versus another, used for cost-of-living comparisons.',
        url: 'https://apps.bea.gov/iTable/?reqid=70&step=1&acrdn=8',
      },
      {
        name: 'U.S. Department of Labor',
        note: 'State minimum wage figures.',
        url: 'https://www.dol.gov/agencies/whd/minimum-wage/state',
      },
      {
        name: 'Official state & local tax authorities',
        note: 'Income, sales, and property tax rates, pulled per state.',
        url: '#',
      },
    ],
  },
  {
    label: 'Climate & environment',
    sources: [
      {
        name: 'Open-Meteo Historical Weather Archive (ERA5)',
        note: 'Daily temperature and precipitation history, used to build a real sense of what the seasons feel like.',
        url: 'https://open-meteo.com/en/docs/historical-weather-api',
      },
      {
        name: 'U.S. EPA — Air Quality System (AQS)',
        note: 'Monitored air quality index readings by county.',
        url: 'https://aqs.epa.gov/aqsweb/airdata/download_files.html',
      },
      {
        name: 'FEMA — National Risk Index',
        note: 'County-level exposure to natural hazards.',
        url: 'https://hazards.fema.gov/nri/',
      },
    ],
  },
  {
    label: 'Getting around & daily life',
    sources: [
      {
        name: 'U.S. Census Bureau — County Business Patterns',
        note: 'Restaurants, bars, and arts venues per capita, for the Lifestyle & Connectivity score.',
        url: 'https://www.census.gov/programs-surveys/cbp.html',
      },
      {
        name: 'FAA Airport Data',
        note: 'Nearest major airport and how busy it is.',
        url: 'https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/Airport_Data/',
      },
      {
        name: 'Federal Transit Administration — National Transit Database',
        note: 'Public transit availability and ridership.',
        url: 'https://www.transit.dot.gov/ntd/ntd-data',
      },
      {
        name: 'MIT Election Data and Science Lab (Harvard Dataverse)',
        note: '2020 county-level presidential results, shown only if you opt in to political lean.',
        url: 'https://doi.org/10.7910/DVN/VOQCHQ',
      },
    ],
  },
];
</script>

<template>
  <div class="container">
    <DashboardHeader page-label="Data Sources" @logo-click="router.push({ name: 'home' })" @search="onHeaderSearch" />

    <article class="sources">
      <header class="sources__masthead">
        <span class="sources__eyebrow">Data &amp; Methodology</span>
        <h1 class="sources__headline">Where the numbers come from.</h1>
        <p class="sources__dek">
          Every figure on Atlas traces back to a public dataset — no scraping, no proprietary
          blends. Below is the full list, grouped by what they feed into.
        </p>
      </header>

      <section v-for="group in groups" :key="group.label" class="sources__group">
        <h2 class="sources__group-label">{{ group.label }}</h2>
        <ul class="sources__list">
          <li v-for="source in group.sources" :key="source.name" class="sources__item">
            <div class="sources__item-text">
              <span class="sources__item-name">{{ source.name }}</span>
              <span class="sources__item-note">{{ source.note }}</span>
            </div>
            <a
              v-if="source.url !== '#'"
              :href="source.url"
              target="_blank"
              rel="noopener noreferrer"
              class="sources__item-link"
            >
              Source ↗
            </a>
          </li>
        </ul>
      </section>

      <footer class="sources__footer">
        <p>
          Crime and school-quality data are on the way — official crime figures are held back
          until we have a reliable city/county join, so nothing gets shown half-right.
        </p>
        <router-link :to="{ name: 'about' }" class="sources__back">&larr; Back to About Atlas</router-link>
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

.sources__item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 24px;
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

.sources__item-link {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 0.76rem;
  color: var(--accent);
  text-decoration: none;
  white-space: nowrap;
}

.sources__item-link:hover {
  text-decoration: underline;
}

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

.sources__back {
  font-size: 0.88rem;
  color: var(--accent);
  text-decoration: none;
  width: fit-content;
}

.sources__back:hover {
  text-decoration: underline;
}

@media (max-width: 560px) {
  .sources__item {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>
