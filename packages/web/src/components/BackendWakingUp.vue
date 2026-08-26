<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const facts = [
  "Fun fact: this server takes a nap after 15 minutes of nobody visiting. You just woke it up.",
  "The free-tier server is stretching, yawning, and finding its socks.",
  "Somewhere, a tiny server is booting up Node, loading Census data, and pouring coffee.",
  "Did you know? Atlas pulls its numbers straight from the US Census ACS 5-year survey.",
  "This usually takes 30-60 seconds — about as long as it takes to boil an egg.",
  "Cold starts are the price of a free server. Thanks for your patience!",
  "Reticulating splines, warming caches, and definitely not procrastinating.",
];

const factIndex = ref(0);
const elapsed = ref(0);
let factTimer: ReturnType<typeof setInterval> | undefined;
let clockTimer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  factTimer = setInterval(() => {
    factIndex.value = (factIndex.value + 1) % facts.length;
  }, 4800);
  clockTimer = setInterval(() => {
    elapsed.value += 1;
  }, 1000);
});

onUnmounted(() => {
  clearInterval(factTimer);
  clearInterval(clockTimer);
});
</script>

<template>
  <div class="waking-up">
    <div class="waking-up__scene" aria-hidden="true">
      <div class="waking-up__sun"></div>
      <div class="waking-up__skyline">
        <span class="building b1"></span>
        <span class="building b2"></span>
        <span class="building b3"></span>
        <span class="building b4"></span>
        <span class="building b5"></span>
      </div>
      <div class="waking-up__zzz">
        <span>z</span><span>z</span><span>Z</span>
      </div>
    </div>

    <h1 class="waking-up__title">Waking up the server&hellip;</h1>
    <p class="waking-up__subtitle">
      Our backend runs on a free tier that falls asleep when idle. It's booting back up now.
    </p>

    <div class="waking-up__progress" role="status" aria-live="polite">
      <div class="waking-up__progress-fill"></div>
    </div>

    <p class="waking-up__elapsed">{{ elapsed }}s elapsed</p>

    <transition name="fact-fade" mode="out-in">
      <p class="waking-up__fact" :key="factIndex">{{ facts[factIndex] }}</p>
    </transition>
  </div>
</template>

<style scoped>
.waking-up {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.4rem;
  padding: 2rem 1.5rem;
  text-align: center;
  background: var(--bg-main);
  color: var(--text-primary);
  font-family: var(--font-sans);
}

.waking-up__scene {
  position: relative;
  width: 280px;
  height: 180px;
  margin-bottom: 0.5rem;
  overflow: hidden;
  border-radius: 18px;
  background: linear-gradient(180deg, var(--accent-light) 0%, var(--bg-card-subtle) 100%);
}

.waking-up__sun {
  position: absolute;
  left: 50%;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 30px 8px var(--accent-light);
  transform: translateX(-50%);
  animation: rise 4s ease-in-out infinite;
}

@keyframes rise {
  0% { top: 142px; opacity: 0.3; }
  50% { top: 36px; opacity: 1; }
  100% { top: 142px; opacity: 0.3; }
}

.waking-up__skyline {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 78px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;
}

.building {
  display: block;
  width: 28px;
  background: var(--accent-soft);
  border-radius: 4px 4px 0 0;
  opacity: 0.85;
}

.b1 { height: 44px; }
.b2 { height: 68px; }
.b3 { height: 52px; }
.b4 { height: 78px; }
.b5 { height: 38px; }

.waking-up__zzz {
  position: absolute;
  top: 10px;
  right: 18px;
  font-family: var(--font-display);
  color: var(--accent);
  font-size: 1.1rem;
}

.waking-up__zzz span {
  display: inline-block;
  opacity: 0;
  animation: float-z 4s ease-in infinite;
}

.waking-up__zzz span:nth-child(1) { animation-delay: 0s; }
.waking-up__zzz span:nth-child(2) { animation-delay: 0.5s; font-size: 1.35rem; }
.waking-up__zzz span:nth-child(3) { animation-delay: 1s; font-size: 1.6rem; }

@keyframes float-z {
  0% { opacity: 0; transform: translate(0, 8px); }
  20% { opacity: 0.9; }
  80% { opacity: 0; transform: translate(8px, -22px); }
  100% { opacity: 0; }
}

.waking-up__title {
  font-family: var(--font-display);
  font-size: 1.9rem;
  margin: 0;
}

.waking-up__subtitle {
  max-width: 38ch;
  margin: 0;
  color: var(--text-secondary);
  font-size: 1.1rem;
  line-height: 1.5;
}

.waking-up__progress {
  width: 280px;
  height: 8px;
  border-radius: 999px;
  background: var(--progress-bg);
  overflow: hidden;
}

.waking-up__progress-fill {
  height: 100%;
  width: 18%;
  border-radius: 999px;
  background: var(--accent);
  animation: bounce 2s ease-in-out infinite alternate;
}

@keyframes bounce {
  0% { transform: translateX(0%); }
  100% { transform: translateX(455%); }
}

.waking-up__elapsed {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.95rem;
  color: var(--text-muted);
}

.waking-up__fact {
  max-width: 46ch;
  min-height: 2.8em;
  margin: 0.25rem 0 0;
  font-size: 1.05rem;
  color: var(--text-secondary);
  font-style: italic;
}

.fact-fade-enter-active,
.fact-fade-leave-active {
  transition: opacity 0.5s ease;
}
.fact-fade-enter-from,
.fact-fade-leave-to {
  opacity: 0;
}
</style>
