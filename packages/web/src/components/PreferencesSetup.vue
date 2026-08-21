<script setup lang="ts">
import { ref, watch } from 'vue';
import { useAuth } from '../composables/useAuth';
import { usePreferences, DEFAULT_PREFERENCES, type UserPreferences } from '../composables/usePreferences';

const emit = defineEmits<{ (e: 'saved'): void }>();

const { user } = useAuth();
const { preferences, loaded, fetchPreferences, savePreferences } = usePreferences();

watch(() => user.value, () => fetchPreferences(), { immediate: true });

// ── Quiz step definitions ─────────────────────────────────────────────────────

type QuizOption<T extends string> = {
  value: T;
  label: string;
  icon: string;
  description: string;
};

type QuizStep = {
  key: keyof UserPreferences;
  title: string;
  subtitle: string;
  options: QuizOption<string>[];
};

const STEPS: QuizStep[] = [
  {
    key: 'climate_preference',
    title: 'What kind of climate do you prefer?',
    subtitle: 'This shapes how weather data factors into your score.',
    options: [
      { value: 'warm',         icon: 'mdi-weather-sunny',         label: 'Warm & sunny',       description: 'Hot summers, mild winters, lots of sun' },
      { value: 'cool',         icon: 'mdi-snowflake',             label: 'Cool & crisp',        description: 'Cold winters, mild summers, refreshing air' },
      { value: 'mild',         icon: 'mdi-weather-partly-cloudy', label: 'Mild year-round',     description: 'Comfortable temps with minimal extremes' },
      { value: 'four_seasons', icon: 'mdi-leaf',                  label: 'Four seasons',        description: 'Distinct spring, summer, fall, and winter' },
      { value: 'any',          icon: 'mdi-earth',                 label: 'No preference',       description: 'Climate won\'t heavily influence my score' },
    ],
  },
  {
    key: 'affordability_preference',
    title: 'How important is cost of living?',
    subtitle: 'Affects how much rent, expenses, and cost trends influence your score.',
    options: [
      { value: 'budget',   icon: 'mdi-piggy-bank-outline',  label: 'Affordability is a must',   description: 'Keeping rent and daily costs low is a priority' },
      { value: 'value',    icon: 'mdi-scale-balance',        label: 'Reasonable is enough',      description: 'Not the cheapest, but shouldn\'t feel expensive' },
      { value: 'flexible', icon: 'mdi-credit-card-outline',  label: 'I\'ll pay for the right city', description: 'Cost won\'t hold me back from the right fit' },
    ],
  },
  {
    key: 'job_market_preference',
    title: 'What matters most about the job market?',
    subtitle: 'Changes how income, employment, and growth data are weighted.',
    options: [
      { value: 'high_earning', icon: 'mdi-trending-up',      label: 'High-earning market',  description: 'I want cities with strong median incomes' },
      { value: 'stable',       icon: 'mdi-shield-check-outline', label: 'Stable & secure',   description: 'Low unemployment and a steady local economy' },
      { value: 'growth',       icon: 'mdi-sprout-outline',   label: 'Growth potential',     description: 'Fast-growing job markets and expanding industries' },
      { value: 'remote',       icon: 'mdi-laptop',           label: 'I work remotely',      description: 'Local job market is less critical for me' },
    ],
  },
  {
    key: 'lifestyle_preference',
    title: 'How do you like to spend your time?',
    subtitle: 'Adjusts how restaurants, arts, commute, and transit factor in.',
    options: [
      { value: 'urban',    icon: 'mdi-city-variant-outline', label: 'City energy',      description: 'Walkable, vibrant — restaurants, bars, arts, transit' },
      { value: 'suburban', icon: 'mdi-home-outline',         label: 'Quiet & suburban', description: 'Short commutes, space, and a calmer pace' },
      { value: 'nature',   icon: 'mdi-hiking',               label: 'Outdoors & nature', description: 'Access to parks, trails, and open space' },
    ],
  },
  {
    key: 'opportunity_preference',
    title: 'What kind of opportunity are you looking for?',
    subtitle: 'Shapes how education, mobility, and economic data are scored.',
    options: [
      { value: 'education', icon: 'mdi-school-outline',        label: 'Knowledge economy',   description: 'Educated workforce, universities, research hubs' },
      { value: 'growth',    icon: 'mdi-chart-line',            label: 'Fast-growing market',  description: 'Strong job growth and expanding local economy' },
      { value: 'diverse',   icon: 'mdi-view-grid-outline',     label: 'Diverse economy',      description: 'Not dependent on one industry — resilient and varied' },
      { value: 'mobility',  icon: 'mdi-stairs-up',             label: 'Economic mobility',    description: 'Low poverty, strong middle class, upward movement' },
      { value: 'any',       icon: 'mdi-equal-box',             label: 'No strong preference', description: 'All opportunity signals weighted equally' },
    ],
  },
  {
    key: 'air_quality_priority',
    title: 'How much does air quality matter to you?',
    subtitle: 'Sets the weight of EPA AQI data in your overall score.',
    options: [
      { value: 'high',   icon: 'mdi-air-filter',          label: 'Very important',       description: 'Clean air is a dealbreaker for me' },
      { value: 'medium', icon: 'mdi-leaf-circle-outline',  label: 'Somewhat important',   description: 'I care, but it won\'t make or break a city' },
      { value: 'low',    icon: 'mdi-minus-circle-outline', label: 'Not a priority',        description: 'Air quality won\'t heavily influence my score' },
    ],
  },
  {
    key: 'connectivity_preference',
    title: 'How do you get around?',
    subtitle: 'Weights transit, walkability, and airport access accordingly.',
    options: [
      { value: 'walkable', icon: 'mdi-walk',             label: 'Dense & walkable',       description: 'I want to walk or take transit everywhere' },
      { value: 'balanced', icon: 'mdi-map-marker-radius-outline', label: 'Balanced & accessible', description: 'Good airport, some transit, still drivable' },
      { value: 'car',      icon: 'mdi-car-outline',      label: 'Suburban & drivable',    description: 'Car-dependent is fine — highways and parking matter' },
      { value: 'airport',  icon: 'mdi-airplane',         label: 'Airport proximity',      description: 'I travel frequently — being near a major hub is key' },
    ],
  },
  {
    key: 'political_lean_preference',
    title: 'Does political lean matter to you?',
    subtitle: 'Scores cities based on how closely their political climate matches yours.',
    options: [
      { value: 'progressive',  icon: 'mdi-alpha-d-circle-outline', label: 'Progressive-leaning cities', description: 'I strongly prefer cities that lean progressive' },
      { value: 'conservative', icon: 'mdi-alpha-r-circle-outline', label: 'Conservative-leaning cities', description: 'I strongly prefer cities that lean conservative' },
      { value: 'open',         icon: 'mdi-approximately-equal',    label: 'Open to either',              description: 'Political lean is a mild preference, not a dealbreaker' },
      { value: 'not_a_factor', icon: 'mdi-close-circle-outline',   label: 'Not a factor',               description: 'Political climate won\'t affect my score at all' },
    ],
  },
];

// ── State ─────────────────────────────────────────────────────────────────────

const draft = ref<UserPreferences>({ ...DEFAULT_PREFERENCES });
const currentStep = ref(0);
const saving = ref(false);
const saved = ref(false);
const initialized = ref(false);

watch(preferences, (p) => {
  if (!initialized.value) {
    draft.value = { ...p };
    initialized.value = true;
  }
}, { immediate: true });

const totalSteps = STEPS.length;

function selectOption(key: keyof UserPreferences, value: string) {
  (draft.value as any)[key] = value;
}

function isSelected(key: keyof UserPreferences, value: string): boolean {
  return (draft.value as any)[key] === value;
}

function next() {
  if (currentStep.value < totalSteps - 1) currentStep.value++;
}

function prev() {
  if (currentStep.value > 0) currentStep.value--;
}

function goToStep(i: number) {
  currentStep.value = i;
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

defineExpose({ save, saving, saved });
</script>

<template>
  <div v-if="loaded" class="quiz">

    <!-- Progress bar -->
    <div class="quiz__progress">
      <div
        class="quiz__progress-fill"
        :style="{ width: `${((currentStep + 1) / totalSteps) * 100}%` }"
      ></div>
    </div>

    <!-- Step dots -->
    <div class="quiz__dots">
      <button
        v-for="(step, i) in STEPS"
        :key="step.key"
        class="quiz__dot"
        :class="{
          'quiz__dot--active': i === currentStep,
          'quiz__dot--done': i < currentStep,
        }"
        :aria-label="`Go to step ${i + 1}`"
        @click="goToStep(i)"
      ></button>
    </div>

    <!-- Step content -->
    <div class="quiz__body">
      <div class="quiz__step-header">
        <p class="quiz__step-count">Step {{ currentStep + 1 }} of {{ totalSteps }}</p>
        <h3 class="quiz__title">{{ STEPS[currentStep].title }}</h3>
        <p class="quiz__subtitle">{{ STEPS[currentStep].subtitle }}</p>
      </div>

      <div
        class="quiz__options"
        :class="`quiz__options--count-${STEPS[currentStep].options.length}`"
      >
        <button
          v-for="opt in STEPS[currentStep].options"
          :key="opt.value"
          class="quiz__option"
          :class="{ 'quiz__option--selected': isSelected(STEPS[currentStep].key, opt.value) }"
          @click="selectOption(STEPS[currentStep].key, opt.value)"
        >
          <span class="mdi quiz__option-icon" :class="opt.icon"></span>
          <span class="quiz__option-label">{{ opt.label }}</span>
          <span class="quiz__option-desc">{{ opt.description }}</span>
        </button>
      </div>
    </div>

    <!-- Navigation -->
    <div class="quiz__nav">
      <button
        class="quiz__nav-btn quiz__nav-btn--prev"
        :disabled="currentStep === 0"
        @click="prev"
      >
        <span class="mdi mdi-arrow-left"></span>
        Back
      </button>

      <button
        v-if="currentStep < totalSteps - 1"
        class="quiz__nav-btn quiz__nav-btn--next"
        @click="next"
      >
        Next
        <span class="mdi mdi-arrow-right"></span>
      </button>

      <button
        v-else
        class="quiz__nav-btn quiz__nav-btn--save"
        :disabled="saving"
        @click="save"
      >
        <span v-if="saving" class="mdi mdi-loading quiz__spin"></span>
        <span v-else-if="saved" class="mdi mdi-check"></span>
        {{ saved ? 'Saved!' : saving ? 'Saving…' : 'Save preferences' }}
      </button>
    </div>

  </div>

  <div v-else class="quiz__loading">
    <span class="mdi mdi-loading quiz__spin"></span>
  </div>
</template>

<style scoped>
.quiz {
  display: flex;
  flex-direction: column;
  gap: 0;
  height: 100%;
  min-height: 0;
}

/* ── Progress bar ── */
.quiz__progress {
  height: 3px;
  background: color-mix(in srgb, var(--accent) 15%, var(--border-card));
  border-radius: 2px;
  overflow: hidden;
  margin: 0 28px;
  flex-shrink: 0;
}

.quiz__progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ── Step dots ── */
.quiz__dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 14px 0 0;
  flex-shrink: 0;
}

.quiz__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  border: none;
  background: color-mix(in srgb, var(--accent) 20%, var(--border-card));
  cursor: pointer;
  padding: 0;
  transition: background 0.2s ease, transform 0.2s ease, width 0.2s ease;
}

.quiz__dot--active {
  background: var(--accent);
  width: 18px;
  border-radius: 3px;
}

.quiz__dot--done {
  background: color-mix(in srgb, var(--accent) 55%, var(--border-card));
}

/* ── Body ── */
.quiz__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 28px 12px;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--accent) 30%, transparent) transparent;
}

.quiz__body::-webkit-scrollbar { width: 3px; }
.quiz__body::-webkit-scrollbar-track { background: transparent; }
.quiz__body::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--accent) 30%, transparent);
  border-radius: 2px;
}

/* ── Step header ── */
.quiz__step-header {
  margin-bottom: 18px;
}

.quiz__step-count {
  margin: 0 0 6px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--accent);
}

.quiz__title {
  margin: 0 0 6px;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.35;
}

.quiz__subtitle {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.5;
}

/* ── Options grid ── */
.quiz__options {
  display: grid;
  gap: 8px;
  grid-template-columns: 1fr 1fr;
}

.quiz__options--count-3 {
  grid-template-columns: 1fr 1fr 1fr;
}

.quiz__options--count-5 {
  grid-template-columns: 1fr 1fr;
}

.quiz__option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 14px 13px;
  background: var(--bg-card-inner);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
  width: 100%;
}

.quiz__option:hover {
  background: var(--bg-card-subtle);
  transform: translateY(-1px);
}

.quiz__option--selected {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--bg-card-inner));
}

.quiz__option-icon {
  font-size: 1.4rem;
  color: var(--accent);
  margin-bottom: 2px;
  opacity: 0.85;
}

.quiz__option--selected .quiz__option-icon {
  opacity: 1;
}

.quiz__option-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.quiz__option-desc {
  font-size: 0.71rem;
  color: var(--text-muted);
  line-height: 1.4;
}

/* ── Navigation ── */
.quiz__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 28px 20px;
  border-top: 1px solid color-mix(in srgb, var(--accent) 10%, var(--border-card));
  flex-shrink: 0;
  gap: 10px;
}

.quiz__nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s ease, transform 0.15s ease, opacity 0.15s ease;
  border: none;
}

.quiz__nav-btn--prev {
  background: var(--bg-card-inner);
  color: var(--text-secondary);
  border: 1px solid var(--border-card);
}

.quiz__nav-btn--prev:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.quiz__nav-btn--prev:not(:disabled):hover {
  filter: brightness(1.05);
}

.quiz__nav-btn--next {
  background: var(--bg-card-inner);
  color: var(--text-primary);
  border: 1px solid var(--border-card);
  margin-left: auto;
}

.quiz__nav-btn--next:hover {
  background: var(--bg-card-subtle);
  transform: translateX(1px);
}

.quiz__nav-btn--save {
  background: var(--accent);
  color: #fff;
  margin-left: auto;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 30%, transparent);
}

.quiz__nav-btn--save:not(:disabled):hover {
  filter: brightness(1.06);
  transform: translateY(-1px);
}

.quiz__nav-btn--save:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* ── Loading ── */
.quiz__loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: var(--text-muted);
}

@keyframes spin { to { transform: rotate(360deg); } }
.quiz__spin {
  display: inline-block;
  animation: spin 0.8s linear infinite;
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .quiz__progress {
    margin: 0 16px;
  }

  .quiz__body {
    padding: 16px 16px 8px;
  }

  .quiz__nav {
    padding: 12px 16px 16px;
  }

  .quiz__options,
  .quiz__options--count-3,
  .quiz__options--count-5 {
    grid-template-columns: 1fr;
  }
}
</style>
