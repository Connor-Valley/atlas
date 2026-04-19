<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { getCitiesForState, getStates, type StateOption } from "../../api/states";
import { slugToDisplay } from "../../lib/compare";

const props = defineProps<{
  stateA: string;
  cityA: string;
  stateB: string;
  cityB: string;
}>();

const emit = defineEmits<{
  updateA: [payload: { city: string; state: string }];
  updateB: [payload: { city: string; state: string }];
  swap: [];
}>();

// Shared states list
const states = ref<StateOption[]>([]);

onMounted(async () => {
  try {
    states.value = await getStates();
    syncFromProps();
  } catch {}
  document.addEventListener("click", onDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener("click", onDocumentClick);
});

// ── Panel state factory ──────────────────────────────────────────────────────
type Panel = ReturnType<typeof makePanel>;

function makePanel(toneKey: "A" | "B") {
  const stateCode = ref("");
  const stateLabel = ref("");
  const stateQuery = ref("");
  const showStateDrop = ref(false);
  const highlightedState = ref(-1);

  const cityDisplay = ref("");
  const cityQuery = ref("");
  const showCityDrop = ref(false);
  const highlightedCity = ref(-1);
  const cities = ref<{ name: string; slug: string }[]>([]);

  const stateInputRef = ref<HTMLInputElement | null>(null);
  const cityInputRef = ref<HTMLInputElement | null>(null);
  const rootRef = ref<HTMLElement | null>(null);

  const filteredStates = computed(() => {
    const q = stateQuery.value.trim().toLowerCase();
    if (!q) return states.value;
    return states.value
      .filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().startsWith(q))
      .sort((a, b) => {
        const aE = a.code.toLowerCase() === q;
        const bE = b.code.toLowerCase() === q;
        if (aE && !bE) return -1;
        if (bE && !aE) return 1;
        return a.name.localeCompare(b.name);
      });
  });

  const filteredCities = computed(() => {
    const q = cityQuery.value.trim().toLowerCase();
    const list = q.length < 2 ? cities.value : cities.value.filter((c) => c.name.toLowerCase().includes(q));
    return list.slice(0, 10);
  });

  async function loadCities(code: string) {
    if (!code) { cities.value = []; return; }
    try { cities.value = await getCitiesForState(code); } catch { cities.value = []; }
  }

  function selectState(s: StateOption) {
    stateCode.value = s.code;
    stateLabel.value = s.name;
    stateQuery.value = s.code; // show abbreviation in the compact input
    showStateDrop.value = false;
    highlightedState.value = -1;
    cityDisplay.value = "";
    cityQuery.value = "";
    void loadCities(s.code);
    void nextTick(() => {
      cityInputRef.value?.focus();
    });
  }

  function selectCity(c: { name: string; slug: string }) {
    cityDisplay.value = c.name;
    cityQuery.value = c.name;
    showCityDrop.value = false;
    highlightedCity.value = -1;
    submit();
  }

  function submit() {
    if (!cityDisplay.value || !stateCode.value) return;
    const slug = cityDisplay.value.trim().toLowerCase().replace(/\s+/g, "-");
    const payload = { city: slug, state: stateCode.value };
    if (toneKey === "A") emit("updateA", payload);
    else emit("updateB", payload);
  }

  // State input handlers
  function onStateInput() {
    stateCode.value = "";
    showStateDrop.value = true;
    highlightedState.value = -1;
  }

  function onStateFocus() {
    showStateDrop.value = true;
  }

  function onStateBlur() {
    setTimeout(() => {
      showStateDrop.value = false;
      if (!stateCode.value && stateQuery.value) {
        const q = stateQuery.value.trim().toLowerCase();
        const match = states.value.find((s) => s.name.toLowerCase() === q || s.code.toLowerCase() === q)
          ?? filteredStates.value[0];
        if (match) selectState(match);
        else stateQuery.value = stateLabel.value || "";
      }
    }, 150);
  }

  function onStateKeydown(e: KeyboardEvent) {
    const list = filteredStates.value;
    if (e.key === "ArrowDown") { e.preventDefault(); highlightedState.value = Math.min(highlightedState.value + 1, list.length - 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); highlightedState.value = Math.max(highlightedState.value - 1, -1); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const exactMatch = states.value.find((s) => {
        const q = stateQuery.value.trim().toLowerCase();
        return s.name.toLowerCase() === q || s.code.toLowerCase() === q;
      });
      const target = list[highlightedState.value] ?? exactMatch ?? list[0];
      if (target) {
        selectState(target);
      } else if (stateCode.value) {
        showStateDrop.value = false;
        highlightedState.value = -1;
        void nextTick(() => {
          cityInputRef.value?.focus();
        });
      }
    }
  }

  // City input handlers
  function onCityInput() {
    cityQuery.value = cityDisplay.value;
    showCityDrop.value = true;
    highlightedCity.value = -1;
  }

  function onCityFocus() { showCityDrop.value = true; }

  function onCityBlur() {
    setTimeout(() => {
      if (showCityDrop.value && filteredCities.value.length > 0) {
        selectCity(filteredCities.value[highlightedCity.value] ?? filteredCities.value[0]);
      }
      showCityDrop.value = false;
    }, 150);
  }

  function onCityKeydown(e: KeyboardEvent) {
    const list = filteredCities.value;
    if (e.key === "ArrowDown") { e.preventDefault(); highlightedCity.value = Math.min(highlightedCity.value + 1, list.length - 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); highlightedCity.value = Math.max(highlightedCity.value - 1, -1); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (!showCityDrop.value || list.length === 0) {
        submit();
        return;
      }
      const typedQuery = cityDisplay.value.trim().toLowerCase();
      const exactMatch = list.find((c) => c.name.toLowerCase() === typedQuery);
      const target = list[highlightedCity.value] ?? exactMatch ?? list[0];
      if (target) selectCity(target);
      else submit();
    }
  }

  function closeDrops() {
    showStateDrop.value = false;
    showCityDrop.value = false;
  }

  function isOpen() {
    return showStateDrop.value || showCityDrop.value;
  }

  return {
    stateCode, stateLabel, stateQuery, showStateDrop, highlightedState, filteredStates,
    cityDisplay, cityQuery, showCityDrop, highlightedCity, filteredCities,
    stateInputRef, cityInputRef, rootRef,
    selectState, selectCity, loadCities,
    onStateInput, onStateFocus, onStateBlur, onStateKeydown,
    onCityInput, onCityFocus, onCityBlur, onCityKeydown,
    closeDrops, isOpen,
  };
}

const panelA = makePanel("A");
const panelB = makePanel("B");
const canSwap = computed(() => Boolean(props.stateB && props.cityB));

function syncFromProps() {
  // Sync A
  if (props.stateA) {
    const match = states.value.find((s) => s.code === props.stateA);
    if (match) {
      panelA.stateCode.value = match.code;
      panelA.stateLabel.value = match.name;
      panelA.stateQuery.value = match.code;
      void panelA.loadCities(match.code);
    }
  }
  if (props.cityA) {
    panelA.cityDisplay.value = slugToDisplay(props.cityA);
    panelA.cityQuery.value = slugToDisplay(props.cityA);
  }
  // Sync B
  if (props.stateB) {
    const match = states.value.find((s) => s.code === props.stateB);
    if (match) {
      panelB.stateCode.value = match.code;
      panelB.stateLabel.value = match.name;
      panelB.stateQuery.value = match.code;
      void panelB.loadCities(match.code);
    }
  }
  if (props.cityB) {
    panelB.cityDisplay.value = slugToDisplay(props.cityB);
    panelB.cityQuery.value = slugToDisplay(props.cityB);
  }
}

watch(() => [props.stateA, props.cityA, props.stateB, props.cityB], () => {
  if (states.value.length) syncFromProps();
});

// Close dropdowns when clicking outside
const rootRef = ref<HTMLElement | null>(null);
function onDocumentClick(e: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    panelA.closeDrops();
    panelB.closeDrops();
  }
}

function handleSwap() {
  if (!canSwap.value) return;
  emit("swap");
}
</script>

<template>
  <div ref="rootRef" class="csh">
    <!-- City A panel -->
    <div class="csh__panel csh__panel--a">
      <div class="csh__panel-header">
        <span class="csh__panel-label">CITY A</span>
        <span class="csh__panel-search-label">SEARCH</span>
      </div>
      <div class="csh__fields">
        <!-- State field -->
        <div class="csh__field csh__field--state">
          <input
            :ref="(el) => (panelA.stateInputRef.value = el as HTMLInputElement | null)"
            v-model="panelA.stateQuery.value"
            class="csh__input"
            placeholder="State"
            autocomplete="off"
            @input="panelA.onStateInput"
            @focus="panelA.onStateFocus"
            @blur="panelA.onStateBlur"
            @keydown="panelA.onStateKeydown"
          />
          <ul v-if="panelA.showStateDrop.value && panelA.filteredStates.value.length > 0" class="csh__drop">
            <li
              v-for="(s, i) in panelA.filteredStates.value"
              :key="s.code"
              class="csh__drop-item"
              :class="{ 'csh__drop-item--active': i === panelA.highlightedState.value }"
              @mousedown.prevent="panelA.selectState(s)"
            >
              <span>{{ s.name }}</span>
              <span class="csh__drop-code">{{ s.code }}</span>
            </li>
          </ul>
        </div>

        <div class="csh__field-sep"></div>

        <!-- City field -->
        <div class="csh__field csh__field--city">
          <input
            :ref="(el) => (panelA.cityInputRef.value = el as HTMLInputElement | null)"
            v-model="panelA.cityDisplay.value"
            class="csh__input"
            placeholder="City"
            autocomplete="off"
            :disabled="!panelA.stateCode.value"
            @input="panelA.onCityInput"
            @focus="panelA.onCityFocus"
            @blur="panelA.onCityBlur"
            @keydown="panelA.onCityKeydown"
          />
          <ul v-if="panelA.showCityDrop.value && panelA.filteredCities.value.length > 0" class="csh__drop">
            <li
              v-for="(c, i) in panelA.filteredCities.value"
              :key="c.slug"
              class="csh__drop-item"
              :class="{ 'csh__drop-item--active': i === panelA.highlightedCity.value }"
              @mousedown.prevent="panelA.selectCity(c)"
            >
              {{ c.name }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Swap button -->
    <button class="csh__swap" :title="'Swap cities'" :disabled="!canSwap" @click="handleSwap">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 1L13 4L10 7" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M1 4H13" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
        <path d="M4 13L1 10L4 7" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M13 10H1" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
      </svg>
    </button>

    <!-- City B panel -->
    <div class="csh__panel csh__panel--b">
      <div class="csh__panel-header">
        <span class="csh__panel-label">CITY B</span>
        <span class="csh__panel-search-label">SEARCH</span>
      </div>
      <div class="csh__fields">
        <!-- State field -->
        <div class="csh__field csh__field--state">
          <input
            :ref="(el) => (panelB.stateInputRef.value = el as HTMLInputElement | null)"
            v-model="panelB.stateQuery.value"
            class="csh__input"
            placeholder="State"
            autocomplete="off"
            @input="panelB.onStateInput"
            @focus="panelB.onStateFocus"
            @blur="panelB.onStateBlur"
            @keydown="panelB.onStateKeydown"
          />
          <ul v-if="panelB.showStateDrop.value && panelB.filteredStates.value.length > 0" class="csh__drop">
            <li
              v-for="(s, i) in panelB.filteredStates.value"
              :key="s.code"
              class="csh__drop-item"
              :class="{ 'csh__drop-item--active': i === panelB.highlightedState.value }"
              @mousedown.prevent="panelB.selectState(s)"
            >
              <span>{{ s.name }}</span>
              <span class="csh__drop-code">{{ s.code }}</span>
            </li>
          </ul>
        </div>

        <div class="csh__field-sep"></div>

        <!-- City field -->
        <div class="csh__field csh__field--city">
          <input
            :ref="(el) => (panelB.cityInputRef.value = el as HTMLInputElement | null)"
            v-model="panelB.cityDisplay.value"
            class="csh__input"
            placeholder="City"
            autocomplete="off"
            :disabled="!panelB.stateCode.value"
            @input="panelB.onCityInput"
            @focus="panelB.onCityFocus"
            @blur="panelB.onCityBlur"
            @keydown="panelB.onCityKeydown"
          />
          <ul v-if="panelB.showCityDrop.value && panelB.filteredCities.value.length > 0" class="csh__drop">
            <li
              v-for="(c, i) in panelB.filteredCities.value"
              :key="c.slug"
              class="csh__drop-item"
              :class="{ 'csh__drop-item--active': i === panelB.highlightedCity.value }"
              @mousedown.prevent="panelB.selectCity(c)"
            >
              {{ c.name }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.csh {
  display: flex;
  align-items: center;
  gap: 0;
  background: transparent;
  overflow: visible;
  flex: 0 0 50%;
  max-width: 50%;
}

.csh__panel {
  flex: 1;
  min-width: 0;
  position: relative;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-card);
}

.csh__panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px 6px;
  border-bottom: 1px solid var(--border-color);
}

.csh__panel-label {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.csh__panel--a .csh__panel-label { color: var(--city-a); }
.csh__panel--b .csh__panel-label { color: var(--city-b); }

.csh__panel-search-label {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  opacity: 0.5;
}

.csh__fields {
  display: flex;
  align-items: center;
}

.csh__field {
  position: relative;
  flex: 1;
}

.csh__field--state {
  flex: 0 0 auto;
  width: 90px;
}

.csh__field--city {
  flex: 1;
}

.csh__field-sep {
  width: 1px;
  height: 20px;
  background: var(--border-color);
  flex-shrink: 0;
}

.csh__input {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  padding: 12px 12px;
  font-size: 0.9375rem;
  color: var(--text-primary);
  font-family: inherit;
  min-width: 0;
  box-sizing: border-box;
}

.csh__input::placeholder {
  color: var(--text-muted);
  opacity: 0.6;
}

.csh__input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.csh__drop {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 200px;
  max-height: 240px;
  overflow-y: auto;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  box-shadow: var(--card-shadow-md);
  z-index: 100;
  list-style: none;
  margin: 0;
  padding: 4px 0;
  scrollbar-width: thin;
}

.csh__drop-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 12px;
  font-size: 0.8125rem;
  color: var(--text-primary);
  cursor: pointer;
  gap: 12px;
}

.csh__drop-item:hover,
.csh__drop-item--active {
  background: var(--bg-card-inner);
  color: var(--text-primary);
}

.csh__drop-code {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  flex-shrink: 0;
}

.csh__swap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  cursor: pointer;
  color: var(--text-muted);
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
  padding: 0;
  margin: 0 8px;
  z-index: 1;
}

.csh__swap:hover {
  background: var(--bg-card-inner);
  color: var(--text-primary);
  border-color: var(--text-muted);
}

.csh__swap:disabled {
  background: var(--bg-card);
  color: color-mix(in srgb, var(--text-muted) 58%, transparent);
  border-color: color-mix(in srgb, var(--border-color) 82%, transparent);
  cursor: default;
  opacity: 0.72;
}

.csh__swap:disabled:hover {
  background: var(--bg-card);
  color: color-mix(in srgb, var(--text-muted) 58%, transparent);
  border-color: color-mix(in srgb, var(--border-color) 82%, transparent);
}
</style>
