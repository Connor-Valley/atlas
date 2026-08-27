<script setup lang="ts">
import { useRouter } from 'vue-router';
import DashboardHeader from '../components/DashboardHeader.vue';
import { useRecentSearches } from '../composables/useRecentSearches';

const router = useRouter();
const { recordRecentSearch } = useRecentSearches();

function onHeaderSearch(payload: { city: string; state: string }) {
  void recordRecentSearch(payload.city, payload.state);
  router.push(`/city/${payload.state}/${payload.city}`);
}
</script>

<template>
  <div class="not-found">
    <div class="container container--header-only">
      <DashboardHeader page-label="Not Found" @logo-click="router.push({ name: 'search' })" @search="onHeaderSearch" />
    </div>
    <div class="not-found__body">
      <svg class="not-found__scene" viewBox="0 -200 1440 760" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <!-- left city silhouette -->
        <path class="not-found__skyline" d="M20 420 L20 360 L45 360 L45 300 L65 300 L65 400 L90 400 L90 250 L100 250 L100 220 L110 220 L110 250 L120 250 L120 380 L155 380 L155 310 L175 310 L175 180 L185 180 L185 160 L195 160 L195 180 L205 180 L205 340 L240 340 L240 380 L275 380 L275 420 Z" />

        <!-- right city silhouette, with a domed rotunda and an antenna spire -->
        <path class="not-found__skyline" d="M1165 420 L1165 370 L1190 370 L1190 320 L1210 320 L1210 400 L1235 400 L1235 380 L1235 340 A20 20 0 0 1 1275 340 L1275 380 L1300 380 L1300 380 L1305 300 L1320 300 L1320 260 L1330 260 L1330 300 L1345 300 L1345 380 L1360 380 L1360 250 L1365 250 L1365 200 L1370 200 L1370 250 L1375 250 L1375 380 L1410 380 L1410 420 Z" />

        <!-- dashed trail swirling up and over the card, skyline to skyline -->
        <path class="not-found__trail" d="M 140 210 C 260 60, 380 -60, 480 -110 C 540 -140, 560 -170, 530 -185 C 500 -198, 470 -180, 485 -155 C 500 -132, 545 -125, 600 -140 C 700 -165, 800 -160, 900 -120 C 1050 -60, 1180 60, 1300 210" />
        <circle class="not-found__waypoint" cx="140" cy="210" r="6" />
        <circle class="not-found__waypoint" cx="480" cy="-110" r="5" />
        <circle class="not-found__waypoint" cx="900" cy="-120" r="5" />
        <circle class="not-found__waypoint" cx="1300" cy="210" r="6" />

        <!-- dashed trail dipping under the card, skyline to skyline -->
        <path class="not-found__trail" d="M 170 360 C 290 410, 400 450, 480 470 C 540 485, 560 510, 530 522 C 500 533, 470 518, 485 495 C 500 475, 545 470, 600 478 C 700 492, 800 488, 900 460 C 1040 425, 1180 390, 1330 360" />
        <circle class="not-found__waypoint" cx="170" cy="360" r="6" />
        <circle class="not-found__waypoint" cx="480" cy="470" r="5" />
        <circle class="not-found__waypoint" cx="900" cy="460" r="5" />
        <circle class="not-found__waypoint" cx="1330" cy="360" r="6" />

        <!-- decorative doodle swirls -->
        <path class="not-found__swirl" transform="translate(150, 120) scale(1.4)" d="M0,0 C 9,-9 18,-6 18,3 C 18,12 8,14 1,9 C -5,5 -3,-3 5,-4 C 10,-4.6 14,-1 13,4" />
        <path class="not-found__swirl" transform="translate(1290, 90) scale(1.1) rotate(20)" d="M0,0 C 9,-9 18,-6 18,3 C 18,12 8,14 1,9 C -5,5 -3,-3 5,-4 C 10,-4.6 14,-1 13,4" />
        <path class="not-found__swirl" transform="translate(400, 420) scale(0.9) rotate(-15)" d="M0,0 C 9,-9 18,-6 18,3 C 18,12 8,14 1,9 C -5,5 -3,-3 5,-4 C 10,-4.6 14,-1 13,4" />
        <path class="not-found__swirl" transform="translate(1040, 440) scale(1.2) rotate(10)" d="M0,0 C 9,-9 18,-6 18,3 C 18,12 8,14 1,9 C -5,5 -3,-3 5,-4 C 10,-4.6 14,-1 13,4" />
      </svg>
      <div class="not-found__card">
        <p class="not-found__fox" aria-hidden="true">🦊</p>
        <h1 class="not-found__code">404</h1>
        <p class="not-found__title">Looks like this spot isn't on the map.</p>
        <p class="not-found__subtitle">The page you're looking for doesn't exist, or it moved somewhere new.</p>
        <div class="not-found__actions">
          <button class="not-found__btn not-found__btn--primary" @click="router.push('/')">Take me home</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 100vh;
  background: var(--bg-main);
}

.not-found__body {
  position: relative;
  min-height: calc(100vh - 60px);
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 32px 64px;
  overflow: hidden;
}

.not-found__scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.not-found__skyline {
  fill: var(--accent-soft);
  opacity: 0.4;
}

.not-found__trail {
  fill: none;
  stroke: var(--border-color);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 2 14;
  opacity: 0.65;
}

.not-found__waypoint {
  fill: var(--accent-soft);
  opacity: 0.55;
}

.not-found__swirl {
  fill: none;
  stroke: var(--border-color);
  stroke-width: 2.5;
  stroke-linecap: round;
  opacity: 0.4;
}

.not-found__card {
  position: relative;
  z-index: 1;
  max-width: 440px;
  width: 100%;
  text-align: center;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 20px;
  padding: 48px 36px;
  box-shadow: var(--card-shadow-md);
}

.not-found__fox {
  font-size: 2.75rem;
  margin: 0 0 8px;
  display: inline-block;
  animation: not-found-wobble 3.5s ease-in-out infinite;
}

@keyframes not-found-wobble {
  0%, 100% { transform: rotate(-8deg); }
  50% { transform: rotate(8deg); }
}

.not-found__code {
  font-family: var(--font-display);
  font-size: 4rem;
  line-height: 1;
  margin: 0 0 12px;
  color: var(--accent);
  letter-spacing: -0.02em;
}

.not-found__title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.not-found__subtitle {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin: 0 0 28px;
  line-height: 1.5;
}

.not-found__actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.not-found__btn {
  border: 1px solid var(--border-color);
  background: var(--bg-card-inner);
  color: var(--text-primary);
  font-size: 0.95rem;
  font-weight: 600;
  padding: 12px 20px;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.not-found__btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--card-shadow);
}

.not-found__btn--primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.not-found__btn--primary:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
}
</style>
