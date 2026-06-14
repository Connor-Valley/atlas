<script setup lang="ts">
import { ref, watch } from 'vue';
import { useAuth } from '../composables/useAuth';
import { usePreferences, type UserPreferences } from '../composables/usePreferences';

const emit = defineEmits<{ (e: 'saved'): void }>();

const { user } = useAuth();
const { preferences, loaded, fetchPreferences, savePreferences } = usePreferences();

watch(() => user.value, () => fetchPreferences(), { immediate: true });

type PersonaWeights = Pick<UserPreferences,
  'weight_affordability' | 'weight_job_market' | 'weight_climate' |
  'weight_opportunity' | 'weight_lifestyle_vibrancy' | 'weight_air_quality' |
  'weight_safety' | 'weight_connectivity'
>;

type Persona = {
  id: string;
  label: string;
  icon: string;
  description: string;
  weights: PersonaWeights;
  climate_preference: UserPreferences['climate_preference'];
};

const PERSONAS: Persona[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    icon: 'mdi-scale-balance',
    description: 'Equal weight across all factors',
    weights: { weight_affordability: 15, weight_job_market: 15, weight_climate: 15, weight_opportunity: 15, weight_lifestyle_vibrancy: 15, weight_air_quality: 10, weight_safety: 0, weight_connectivity: 15 },
    climate_preference: 'any',
  },
  {
    id: 'young_professional',
    label: 'Young Professional',
    icon: 'mdi-briefcase-outline',
    description: 'Career growth, city energy, strong connections',
    weights: { weight_affordability: 15, weight_job_market: 30, weight_climate: 10, weight_opportunity: 15, weight_lifestyle_vibrancy: 25, weight_air_quality: 5, weight_safety: 0, weight_connectivity: 20 },
    climate_preference: 'any',
  },
  {
    id: 'remote_worker',
    label: 'Remote Worker',
    icon: 'mdi-laptop',
    description: 'Affordable, livable, and great weather',
    weights: { weight_affordability: 30, weight_job_market: 5, weight_climate: 25, weight_opportunity: 10, weight_lifestyle_vibrancy: 20, weight_air_quality: 10, weight_safety: 0, weight_connectivity: 10 },
    climate_preference: 'warm',
  },
  {
    id: 'growing_family',
    label: 'Growing Family',
    icon: 'mdi-home-heart',
    description: 'Good schools, safe neighborhoods, clean air',
    weights: { weight_affordability: 20, weight_job_market: 15, weight_climate: 10, weight_opportunity: 25, weight_lifestyle_vibrancy: 10, weight_air_quality: 20, weight_safety: 25, weight_connectivity: 5 },
    climate_preference: 'mild',
  },
  {
    id: 'career_climber',
    label: 'Career Climber',
    icon: 'mdi-trending-up',
    description: 'High-earning markets with opportunity density',
    weights: { weight_affordability: 10, weight_job_market: 35, weight_climate: 5, weight_opportunity: 25, weight_lifestyle_vibrancy: 10, weight_air_quality: 5, weight_safety: 0, weight_connectivity: 25 },
    climate_preference: 'any',
  },
  {
    id: 'retiree',
    label: 'Retiree',
    icon: 'mdi-weather-sunny-alert',
    description: 'Warm climate, low cost of living, clean and safe',
    weights: { weight_affordability: 25, weight_job_market: 0, weight_climate: 30, weight_opportunity: 10, weight_lifestyle_vibrancy: 15, weight_air_quality: 15, weight_safety: 20, weight_connectivity: 5 },
    climate_preference: 'warm',
  },
  {
    id: 'urban_enthusiast',
    label: 'Urban Enthusiast',
    icon: 'mdi-city-variant-outline',
    description: 'Walkable, vibrant, transit-rich city life',
    weights: { weight_affordability: 10, weight_job_market: 20, weight_climate: 5, weight_opportunity: 10, weight_lifestyle_vibrancy: 35, weight_air_quality: 5, weight_safety: 5, weight_connectivity: 25 },
    climate_preference: 'mild',
  },
  {
    id: 'nature_outdoors',
    label: 'Nature / Outdoors',
    icon: 'mdi-hiking',
    description: 'Clean air, mild weather, natural surroundings',
    weights: { weight_affordability: 15, weight_job_market: 15, weight_climate: 35, weight_opportunity: 10, weight_lifestyle_vibrancy: 10, weight_air_quality: 20, weight_safety: 0, weight_connectivity: 5 },
    climate_preference: 'mild',
  },
];

const DIMS: Array<{ key: keyof PersonaWeights; label: string; icon: string; comingSoon?: boolean }> = [
  { key: 'weight_affordability',      label: 'Affordability',        icon: 'mdi-home-city-outline' },
  { key: 'weight_job_market',         label: 'Job Market',           icon: 'mdi-briefcase-outline' },
  { key: 'weight_climate',            label: 'Climate',              icon: 'mdi-weather-sunny' },
  { key: 'weight_opportunity',        label: 'Opportunity',          icon: 'mdi-school-outline' },
  { key: 'weight_lifestyle_vibrancy', label: 'Lifestyle & Vibrancy', icon: 'mdi-city-variant-outline' },
  { key: 'weight_air_quality',        label: 'Air Quality',          icon: 'mdi-air-filter' },
  { key: 'weight_safety',             label: 'Safety',               icon: 'mdi-shield-check-outline', comingSoon: true },
  { key: 'weight_connectivity',       label: 'Connectivity',         icon: 'mdi-train-car' },
];

const CLIMATE_OPTIONS: Array<{ value: UserPreferences['climate_preference']; label: string; icon: string }> = [
  { value: 'any',          label: 'No preference',  icon: 'mdi-minus-circle-outline' },
  { value: 'warm',         label: 'Warm',           icon: 'mdi-weather-sunny' },
  { value: 'mild',         label: 'Mild',           icon: 'mdi-weather-partly-cloudy' },
  { value: 'four_seasons', label: 'Four seasons',   icon: 'mdi-weather-snowy-rainy' },
  { value: 'cool',         label: 'Cool',           icon: 'mdi-snowflake' },
];

const draft = ref<UserPreferences>({ ...preferences.value });
const saving = ref(false);
const saved = ref(false);
const initialized = ref(false);

// Only sync draft from preferences once — preserve unsaved changes across re-fetches
watch(preferences, (p) => {
  if (!initialized.value) {
    draft.value = { ...p };
    initialized.value = true;
  }
}, { immediate: true });

function resetToPersonaDefaults() {
  const persona = PERSONAS.find(p => p.id === draft.value.persona_id) ?? PERSONAS[0];
  draft.value = {
    ...draft.value,
    ...persona.weights,
    climate_preference: persona.climate_preference,
    political_preference_enabled: false,
  };
}

function selectPersona(p: Persona) {
  draft.value = {
    ...draft.value,
    persona_id: p.id,
    ...p.weights,
    climate_preference: p.climate_preference,
    political_preference_enabled: false, // personas never activate political matching
  };
}

function sliderTrackStyle(value: number): string {
  const pct = `${value}%`;
  return `background: linear-gradient(to right, var(--accent) ${pct}, color-mix(in srgb, var(--accent) 22%, var(--bg-card-inner)) ${pct})`;
}

async function save() {
  saving.value = true;
  saved.value = false;
  await savePreferences(draft.value);
  saving.value = false;
  saved.value = true;
  emit('saved');
  setTimeout(() => { saved.value = false; }, 2500);
}

defineExpose({ save, resetToPersonaDefaults, saving, saved });
</script>

<template>
  <div v-if="loaded" class="prefs">
    <div class="prefs__body">
      <!-- Left: persona picker -->
      <div class="prefs__left">
        <p class="prefs__section-label">Choose your profile</p>
        <div class="prefs__persona-grid">
          <button
            v-for="p in PERSONAS"
            :key="p.id"
            class="prefs__persona-card"
            :class="{ 'prefs__persona-card--active': draft.persona_id === p.id }"
            @click="selectPersona(p)"
          >
            <span class="mdi prefs__persona-icon" :class="p.icon"></span>
            <span class="prefs__persona-label">{{ p.label }}</span>
            <span class="prefs__persona-desc">{{ p.description }}</span>
          </button>
        </div>
      </div>

      <!-- Divider -->
      <div class="prefs__divider"></div>

      <!-- Right: controls + save -->
      <div class="prefs__right-wrap">
      <div class="prefs__right">
        <!-- Climate preference -->
        <div class="prefs__subsection">
          <p class="prefs__section-label">Climate preference</p>
          <div class="prefs__climate-pills">
            <button
              v-for="opt in CLIMATE_OPTIONS"
              :key="opt.value"
              class="prefs__pill"
              :class="{ 'prefs__pill--active': draft.climate_preference === opt.value }"
              @click="draft.climate_preference = opt.value"
            >
              <span class="mdi" :class="opt.icon"></span>
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Weight sliders -->
        <div class="prefs__subsection">
          <p class="prefs__section-label">Fine-tune weights</p>
          <div class="prefs__sliders">
            <div
              v-for="dim in DIMS"
              :key="dim.key"
              class="prefs__slider-row"
              :class="{ 'prefs__slider-row--disabled': dim.comingSoon }"
            >
              <div class="prefs__slider-meta">
                <span class="mdi prefs__slider-icon" :class="dim.icon"></span>
                <span class="prefs__slider-label">{{ dim.label }}</span>
                <span v-if="dim.comingSoon" class="prefs__coming-soon">soon</span>
                <span v-else class="prefs__slider-value">{{ draft[dim.key] }}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                :value="draft[dim.key]"
                class="prefs__range"
                :class="{ 'prefs__range--disabled': dim.comingSoon }"
                :disabled="dim.comingSoon"
                :style="dim.comingSoon ? '' : sliderTrackStyle(draft[dim.key])"
                @input="draft[dim.key] = +($event.target as HTMLInputElement).value"
              />
            </div>
          </div>
        </div>

        <!-- Political lean (opt-in) -->
        <div class="prefs__subsection prefs__political" :class="{ 'prefs__political--off': !draft.political_preference_enabled }">
          <label class="prefs__political-toggle">
            <input
              type="checkbox"
              v-model="draft.political_preference_enabled"
              class="prefs__checkbox"
            />
            <span class="prefs__political-toggle-label">Factor in political lean</span>
            <span class="prefs__optional">optional</span>
          </label>
          <div class="prefs__political-slider">
            <div class="prefs__political-labels">
              <span>Progressive</span>
              <span>Conservative</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="5"
              :value="draft.political_preference"
              class="prefs__range"
              :disabled="!draft.political_preference_enabled"
              :style="sliderTrackStyle((draft.political_preference + 100) / 2)"
              @input="draft.political_preference = +($event.target as HTMLInputElement).value"
            />
            <p class="prefs__political-neutral">
              <template v-if="!draft.political_preference_enabled">Not affecting score</template>
              <template v-else-if="draft.political_preference === 0">Centered — matches all cities equally</template>
              <template v-else>Prefers {{ draft.political_preference < 0 ? 'progressive' : 'conservative' }}-leaning cities</template>
            </p>
          </div>
        </div>

      </div>
      <div class="prefs__right-fade" aria-hidden="true"></div>
      </div>
    </div>
  </div>

  <div v-else class="prefs__loading">
    <span class="mdi mdi-loading prefs__spin"></span>
  </div>
</template>

<style scoped>
.prefs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.prefs__body {
  display: grid;
  grid-template-columns: 1fr auto 360px;
  gap: 0;
  padding: 24px 28px 0;
  flex: 1;
  min-height: 0;
}

.prefs__left {
  padding-right: 28px;
  padding-bottom: 28px;
  min-width: 0;
  overflow: visible;
  display: flex;
  flex-direction: column;
}

.prefs__right {
  height: 100%;
  padding-left: 28px;
  padding-right: 24px;
  padding-bottom: 28px;
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--accent) 40%, transparent) transparent;
}

.prefs__right::-webkit-scrollbar {
  width: 3px;
}

.prefs__right::-webkit-scrollbar-track {
  background: transparent;
}

.prefs__right::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--accent) 40%, transparent);
  border-radius: 2px;
}

.prefs__right-wrap {
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.prefs__right-fade {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: linear-gradient(to bottom, transparent, var(--bg-card));
  pointer-events: none;
}

.prefs__divider {
  width: 1px;
  background: color-mix(in srgb, var(--accent) 12%, var(--border-card));
  align-self: stretch;
  flex-shrink: 0;
}

.prefs__section-label {
  margin: 0 0 12px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.prefs__subsection {
  margin-bottom: 20px;
}

.prefs__persona-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: 1fr;
  gap: 10px;
  flex: 1;
}

.prefs__persona-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  padding: 14px 13px;
  background: var(--bg-card-inner);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
}

.prefs__persona-card:hover {
  background: var(--bg-card-subtle);
}

.prefs__persona-card--active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--bg-card-inner));
}

.prefs__persona-icon {
  font-size: 1.4rem;
  color: var(--accent);
  margin-bottom: 2px;
}

.prefs__persona-label {
  font-size: 0.83rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.prefs__persona-desc {
  font-size: 0.72rem;
  color: var(--text-muted);
  line-height: 1.4;
  word-break: normal;
  overflow-wrap: break-word;
  white-space: normal;
}

/* Climate pills */
.prefs__climate-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.prefs__pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  background: var(--bg-card-inner);
  border: 1.5px solid transparent;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.prefs__pill:hover {
  background: var(--bg-card-subtle);
}

.prefs__pill--active {
  border-color: var(--accent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--bg-card-inner));
}

.prefs__pill .mdi {
  font-size: 0.9rem;
}

/* Sliders */
.prefs__sliders {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.prefs__slider-row {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.prefs__slider-row--disabled {
  opacity: 0.45;
}

.prefs__slider-meta {
  display: flex;
  align-items: center;
  gap: 7px;
}

.prefs__slider-icon {
  font-size: 0.9rem;
  color: var(--accent);
  opacity: 0.75;
  width: 16px;
  text-align: center;
  flex-shrink: 0;
}

.prefs__slider-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  flex: 1;
}

.prefs__slider-value {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--accent);
  min-width: 28px;
  text-align: right;
}

.prefs__coming-soon {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  background: var(--bg-card-inner);
  border: 1px solid var(--border-card);
  border-radius: 4px;
  padding: 1px 5px;
}

.prefs__range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: transparent;
  cursor: pointer;
  padding: 0;
}

.prefs__range::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 3px;
}

.prefs__range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent);
  margin-top: -5px;
  cursor: pointer;
}

.prefs__range::-moz-range-track {
  height: 6px;
  border-radius: 3px;
}

.prefs__range::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent);
  border: none;
  cursor: pointer;
}

.prefs__range:disabled {
  cursor: not-allowed;
  opacity: 1;
}

.prefs__range:disabled::-webkit-slider-thumb {
  background: color-mix(in srgb, var(--accent) 40%, var(--bg-card-inner));
}

.prefs__range:disabled::-moz-range-thumb {
  background: color-mix(in srgb, var(--accent) 40%, var(--bg-card-inner));
}

/* Political section */
.prefs__political {
  border-top: 1px solid color-mix(in srgb, var(--accent) 12%, var(--border-card));
  padding-top: 16px;
}

.prefs__political-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin-bottom: 4px;
}

.prefs__checkbox {
  accent-color: var(--accent);
  width: 15px;
  height: 15px;
  cursor: pointer;
  flex-shrink: 0;
}

.prefs__political-toggle-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.prefs__optional {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-left: 2px;
}

.prefs__political-slider {
  margin-top: 12px;
}

.prefs__political-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.prefs__political-neutral {
  margin: 6px 0 0;
  font-size: 0.72rem;
  color: var(--text-muted);
  font-style: italic;
}

.prefs__political--off .prefs__political-slider {
  opacity: 0.4;
  pointer-events: none;
}


.prefs__loading {
  display: flex;
  justify-content: center;
  padding: 40px;
  color: var(--text-muted);
}

@keyframes spin { to { transform: rotate(360deg); } }
.prefs__spin { display: inline-block; animation: spin 0.8s linear infinite; }

/* Responsive */
@media (max-width: 640px) {
  .prefs__body {
    grid-template-columns: 1fr;
    padding: 0 16px 20px;
  }

  .prefs__left {
    padding-right: 0;
    padding-bottom: 20px;
  }

  .prefs__right {
    padding-left: 0;
    padding-top: 20px;
  }

  .prefs__divider {
    width: 100%;
    height: 1px;
  }

  .prefs__persona-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
