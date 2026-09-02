<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAuth } from '../composables/useAuth';
import {
  usePreferences, DEFAULT_PREFERENCES, hasRealPreferences, type UserPreferences,
  isDealbreakerDim, withDealbreakerToggled, type DealbreakerDim,
  MULTI_SELECT_KEYS, toggleMultiSelectValue,
} from '../composables/usePreferences';

const props = defineProps<{ flat?: boolean }>();
const emit = defineEmits<{ (e: 'saved'): void }>();

const { user, loading: authLoading } = useAuth();
const { preferences, loaded, fetchPreferences, savePreferences } = usePreferences();

// Wait for auth to finish restoring the session before treating `user.value === null` as
// "not logged in" — on a fresh page load it starts null while the Supabase session is still
// being read from storage, and firing fetchPreferences() on that transient null permanently
// locks preferences to defaults before the real session (and real user) ever resolves.
watch([user, authLoading], ([, isAuthLoading]) => {
  if (!isAuthLoading) fetchPreferences();
}, { immediate: true });

// ── Quiz step definitions ─────────────────────────────────────────────────────

type QuizOption<T extends string> = {
  value: T;
  label: string;
  icon: string;
  description: string;
  tooltip?: string;
};

type QuizStep = {
  key: keyof UserPreferences;
  title: string;
  shortTitle: string;
  subtitle: string;
  options: QuizOption<string>[];
  // Which dimensions get a separate "how much should this count" dial, and what the dial's
  // three tiers translate to — these write straight into the existing weight_* columns, so
  // there's no separate "importance" field to persist. Air quality (its own options already ARE
  // an importance dial) and political lean don't have one.
  importanceKey?: keyof UserPreferences;
  importanceScale?: Record<'low' | 'medium' | 'high', number>;
  // Deal breaker is fully independent of the importance dial above — see DEALBREAKER_DIMS in
  // usePreferences.ts. Political lean is handled separately (its own weight_safety flag), not
  // through this bitmask.
  dealbreakerDim?: DealbreakerDim;
};

const IMPORTANCE_LEVELS: Array<{ value: 'low' | 'medium' | 'high'; label: string }> = [
  { value: 'low',    label: 'Not very important' },
  { value: 'medium', label: 'Somewhat important' },
  { value: 'high',   label: 'Very important' },
];

const STEPS: QuizStep[] = [
  {
    key: 'climate_preference',
    title: 'What kind of climate do you prefer?',
    shortTitle: 'Climate',
    subtitle: 'This shapes how weather data factors into your score.',
    importanceKey: 'weight_climate',
    importanceScale: { low: 8, medium: 18, high: 80 },
    dealbreakerDim: 'climate',
    // Ordered hot → cold by the average annual temp of each type's example cities (Desert Heat's
    // Phoenix ~74°F down to Mountain Snow's Denver ~50°F), not alphabetically — climate is the
    // one dimension where a temperature-ordered list is more scannable than an arbitrary one.
    options: [
      { value: 'hot_dry',       icon: 'mdi-sun-thermometer-outline', label: 'Desert Heat',    description: 'Arid heat with low humidity — desert and inland climates', tooltip: 'e.g. Arizona' },
      { value: 'hot_humid',     icon: 'mdi-weather-sunny',           label: 'Tropical Heat',  description: 'Warm and muggy year-round — Gulf Coast and Southeast heat', tooltip: 'e.g. Miami, Houston' },
      { value: 'humid_coast',   icon: 'mdi-waves',                   label: 'Humid Coast',    description: 'Warm, not hot, and humid — mild winters with barely any frost', tooltip: 'e.g. Charleston' },
      { value: 'sunny_mild',    icon: 'mdi-white-balance-sunny',     label: 'Endless Summer', description: 'Dry, comfortable temps with abundant sunshine — rarely extreme', tooltip: 'e.g. Los Angeles, San Diego' },
      { value: 'mild_seasons',  icon: 'mdi-leaf-maple',              label: 'Warm Winters',   description: 'A real seasonal swing, but winters that rarely see hard freezes or snow', tooltip: 'e.g. Atlanta, Charlotte' },
      { value: 'misty',         icon: 'mdi-weather-fog',             label: 'Foggy Coast',    description: 'Cool and steady with coastal fog — barely any seasonal swing', tooltip: 'e.g. San Francisco' },
      { value: 'cool_wet',      icon: 'mdi-weather-rainy',           label: 'Rainy & Cool',   description: 'Cool with real rain and some snow — a noticeable winter chill', tooltip: 'e.g. Seattle' },
      { value: 'four_seasons',  icon: 'mdi-leaf',                    label: 'Four seasons',   description: 'Distinct spring, summer, fall, and winter, with real snow and cold', tooltip: 'e.g. New York, Chicago' },
      { value: 'mountain_snow', icon: 'mdi-image-filter-hdr',        label: 'Mountain Snow',  description: 'Cold, dry, and snowy, but lots of sun — real winter without the gray', tooltip: 'e.g. Denver, Salt Lake City' },
      { value: 'any',           icon: 'mdi-earth',                   label: 'No preference',  description: 'Climate won\'t heavily influence my score' },
    ],
  },
  {
    key: 'affordability_preference',
    title: 'How much does cost of living matter to you?',
    shortTitle: 'Cost of Living',
    subtitle: 'Cheaper always scores higher — this sets how heavily that pulls on your total score.',
    dealbreakerDim: 'affordability',
    options: [
      { value: 'cost_low',    icon: 'mdi-minus-circle-outline', label: 'Not very important', description: "Cost won't heavily influence my score" },
      { value: 'cost_medium', icon: 'mdi-scale-balance',        label: 'Somewhat important',  description: "I care, but it won't make or break a city" },
      { value: 'cost_high',   icon: 'mdi-piggy-bank-outline',   label: 'Very important',      description: 'A big factor in how I choose a city' },
    ],
  },
  {
    key: 'job_market_preference',
    title: 'What matters most about the job market?',
    shortTitle: 'Job Market',
    subtitle: 'Changes how regional job availability, unemployment, and growth data are weighted.',
    importanceKey: 'weight_job_market',
    importanceScale: { low: 8, medium: 18, high: 80 },
    dealbreakerDim: 'job_market',
    options: [
      { value: 'high_earning', icon: 'mdi-trending-up',      label: 'High-earning market',  description: 'I want access to a large regional job market with strong earning potential' },
      { value: 'stable',       icon: 'mdi-shield-check-outline', label: 'Stable & secure',   description: 'Low unemployment and a steady local economy' },
      { value: 'growth',       icon: 'mdi-sprout-outline',   label: 'Growth potential',     description: 'Fast-growing job markets and expanding industries' },
      { value: 'remote',       icon: 'mdi-laptop',           label: 'I work remotely',      description: 'Local job market is less critical for me' },
      { value: 'any',          icon: 'mdi-equal-box',        label: 'No strong preference', description: 'All job market signals weighted equally' },
    ],
  },
  {
    key: 'lifestyle_preference',
    title: 'How do you like to spend your time?',
    shortTitle: 'Lifestyle',
    subtitle: 'Adjusts how restaurants, arts, commute, and transit factor in.',
    importanceKey: 'weight_lifestyle_vibrancy',
    importanceScale: { low: 8, medium: 18, high: 80 },
    dealbreakerDim: 'lifestyle_vibrancy',
    options: [
      { value: 'urban',      icon: 'mdi-city-variant-outline', label: 'City energy',        description: 'Walkable, vibrant — restaurants, bars, arts, transit' },
      { value: 'urban_edge', icon: 'mdi-home-city-outline',   label: 'Urban edge',         description: 'Close to the city core, walkable but not fully downtown' },
      { value: 'suburban',   icon: 'mdi-home-outline',        label: 'Quiet & suburban',   description: 'Short commutes, space, and a calmer pace' },
      { value: 'nature',   icon: 'mdi-hiking',               label: 'Outdoors & nature', description: 'Access to parks, trails, and open space' },
    ],
  },
  {
    key: 'opportunity_preference',
    title: 'What industry are you in?',
    shortTitle: 'Opportunity',
    subtitle: "A bonus when a city's dominant industry matches your field — never a penalty if it doesn't.",
    importanceKey: 'weight_opportunity',
    importanceScale: { low: 4, medium: 10, high: 18 },
    dealbreakerDim: 'opportunity',
    options: [
      { value: 'tech_media_pro',           icon: 'mdi-laptop',                    label: 'Tech, Media & Professional Services', description: 'Software, engineering, consulting, publishing, telecom' },
      { value: 'corporate_finance',        icon: 'mdi-domain',                    label: 'Corporate & Finance',                 description: 'Banking, real estate, corporate HQ & management' },
      { value: 'manufacturing',            icon: 'mdi-factory',                   label: 'Manufacturing & Industrial',          description: 'Production, assembly, and industrial work' },
      { value: 'construction_trades',      icon: 'mdi-hammer-wrench',             label: 'Construction & Trades',               description: 'Skilled trades and contracting' },
      { value: 'transportation_logistics', icon: 'mdi-truck-outline',             label: 'Transportation, Logistics & Distribution', description: 'Trucking, warehousing, wholesale' },
      { value: 'education_healthcare',     icon: 'mdi-hospital-box-outline',      label: 'Education & Healthcare',              description: 'Schools, hospitals, and social services' },
      { value: 'government_services',      icon: 'mdi-bank-outline',              label: 'Government & Public Services',        description: 'Government agencies, public administration & support services' },
      { value: 'retail',                   icon: 'mdi-cart-outline',              label: 'Retail & Consumer Services',          description: 'Consumer-facing retail and sales' },
      { value: 'hospitality_arts',         icon: 'mdi-palette-outline',           label: 'Hospitality, Arts & Entertainment',   description: 'Food service, arts, recreation, tourism' },
      { value: 'agriculture',              icon: 'mdi-tractor-variant',           label: 'Agriculture & Natural Resources',     description: 'Farming, forestry, mining' },
      { value: 'nonprofit',                icon: 'mdi-hand-heart-outline',        label: 'Nonprofit & Community Organizations', description: 'Nonprofits, religious orgs, foundations & civic groups' },
      { value: 'any',                      icon: 'mdi-equal-box',                 label: "Doesn't matter to me",                description: 'Open to any industry — no bonus applied' },
    ],
  },
  {
    key: 'air_quality_priority',
    title: 'How much does air quality matter to you?',
    shortTitle: 'Air Quality',
    subtitle: 'Sets the weight of EPA AQI data in your overall score.',
    dealbreakerDim: 'air_quality',
    options: [
      { value: 'low',    icon: 'mdi-minus-circle-outline', label: 'Not very important', description: "Air quality won't heavily influence my score" },
      { value: 'medium', icon: 'mdi-leaf-circle-outline',  label: 'Somewhat important',  description: "I care, but it won't make or break a city" },
      { value: 'high',   icon: 'mdi-air-filter',           label: 'Very important',      description: 'A big factor in how I choose a city' },
    ],
  },
  {
    key: 'connectivity_preference',
    title: 'How do you get around?',
    shortTitle: 'Getting Around',
    subtitle: 'Weights transit, walkability, and airport access accordingly.',
    importanceKey: 'weight_connectivity',
    importanceScale: { low: 8, medium: 18, high: 80 },
    dealbreakerDim: 'connectivity',
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
    shortTitle: 'Political Lean',
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
const saveError = ref<string | null>(null);
const initialized = ref(false);
const touchedKeys = ref<Set<keyof UserPreferences>>(new Set());

const QUIZ_KEYS = STEPS.map(s => s.key);

// Must wait for `loaded` (set only once the async Supabase fetch actually resolves), not just
// react to the first emission of `preferences` — that ref starts at DEFAULT_PREFERENCES and
// `fetchPreferences()` hasn't necessarily completed yet by the time this watcher's `immediate`
// call fires, so watching `preferences` directly could permanently lock `draft` (and
// `initialized`) onto the default snapshot before the real saved values ever arrive.
// Flat-mode display state: 'cover' (nothing saved yet — show a "Make your preferences"
// prompt), 'saved' (a real saved row exists and isn't currently being edited — show a
// read-only, grayed-out summary with just an Edit button), or 'editing' (the interactive
// quiz grid with Save/Randomize, whether entered via "Start" from cover or "Edit" from saved).
const mode = ref<'cover' | 'editing' | 'saved'>('cover');
const hasSavedPreferences = ref(false);

watch(loaded, (isLoaded) => {
  if (isLoaded && !initialized.value) {
    const p = preferences.value;
    draft.value = { ...p };
    initialized.value = true;
    const hasExisting = hasRealPreferences(p);
    if (hasExisting) {
      touchedKeys.value = new Set(QUIZ_KEYS);
    }
    hasSavedPreferences.value = hasExisting;
    mode.value = hasExisting ? 'saved' : 'cover';
  }
}, { immediate: true });

const totalSteps = STEPS.length;

// Multi-select fields (see MULTI_SELECT_KEYS) toggle `value` in/out of the stored array instead
// of overwriting it — checking a second option keeps the first, rather than replacing it.
function selectOption(key: keyof UserPreferences, value: string | number) {
  if (MULTI_SELECT_KEYS.has(key)) {
    (draft.value as any)[key] = toggleMultiSelectValue((draft.value as any)[key], value as string);
  } else {
    (draft.value as any)[key] = value;
  }
  touchedKeys.value.add(key);
}

function isSelected(key: keyof UserPreferences, value: string | number): boolean {
  const current = (draft.value as any)[key];
  return MULTI_SELECT_KEYS.has(key) ? (current as string[]).includes(value as string) : current === value;
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
  saveError.value = null;
  const result = await savePreferences(draft.value);
  saving.value = false;
  if (!result.success) {
    // Never claim success on a failed write — the old code always showed "Saved!" and switched
    // to the read-only view regardless of the actual result, which reads as data loss on the
    // next visit when the failed write never actually persisted anything.
    saveError.value = result.error ?? 'Something went wrong saving your preferences.';
    return;
  }
  saved.value = true;
  hasSavedPreferences.value = true;
  mode.value = 'saved';
  emit('saved');
  setTimeout(() => { saved.value = false; }, 2500);
}

function startEditing() {
  mode.value = 'editing';
}

// ── Flat mode popup state ─────────────────────────────────────────────────────

const activeCategory = ref<keyof UserPreferences | null>(null);

const activeCategoryStep = computed(() =>
  activeCategory.value ? (STEPS.find(s => s.key === activeCategory.value) ?? null) : null
);

function openCategory(key: keyof UserPreferences) {
  activeCategory.value = key;
}

function closeCategory() {
  activeCategory.value = null;
}

function selectFlatOption(key: keyof UserPreferences, value: string) {
  selectOption(key, value);
  // Multi-select fields never auto-close on a single pick — the popup should stay open so the
  // user can check additional options. It still closes once they set the importance dial (see
  // selectFlatImportance below), same as today's "everything's been picked" close condition.
  if (!MULTI_SELECT_KEYS.has(key)) maybeCloseCategory();
}

function selectFlatImportance(key: keyof UserPreferences, value: number) {
  selectOption(key, value);
  maybeCloseCategory();
}

// Closes the popup once everything for this category has been picked — the main option, and
// (for steps that have one) the importance dial too. Picking the option first no longer closes
// it out from under you before you've had a chance to also set how much it matters.
function maybeCloseCategory() {
  const step = activeCategoryStep.value;
  if (!step) return;
  const mainSet = touchedKeys.value.has(step.key);
  const importanceSet = !step.importanceKey || touchedKeys.value.has(step.importanceKey);
  if (mainSet && importanceSet) closeCategory();
}

const hasAnyPreference = computed(() => touchedKeys.value.size > 0);

function resetPreferences() {
  draft.value = { ...DEFAULT_PREFERENCES };
  touchedKeys.value = new Set();
}

function randomizePreferences() {
  for (const step of STEPS) {
    const random = step.options[Math.floor(Math.random() * step.options.length)];
    (draft.value as any)[step.key] = MULTI_SELECT_KEYS.has(step.key) ? [random.value] : random.value;
    touchedKeys.value.add(step.key);
  }
}

// Multi-select steps can have more than one selected option — this returns all of them (in
// option-list order) so the flat card can join their labels ("City energy + Urban edge").
function getSelectedOptions(step: QuizStep): QuizOption<string>[] {
  if (!touchedKeys.value.has(step.key)) return [];
  const raw = (draft.value as any)[step.key];
  const values: string[] = MULTI_SELECT_KEYS.has(step.key) ? (raw as string[]) : [raw as string];
  return step.options.filter(o => values.includes(o.value));
}

function getSelectedOption(step: QuizStep): QuizOption<string> | null {
  return getSelectedOptions(step)[0] ?? null;
}

// "Deal breaker" is stored independently of the importance dial — picking "Very important" does
// NOT mark something a deal breaker on its own. But marking something a deal breaker DOES bump
// its importance dial to "high" (see toggleDealbreaker) — a deal breaker that still visually read
// "Not very important" was confusing, since under the hood it already scores at DEALBREAKER_WEIGHT
// regardless of the dial. Unmarking a deal breaker leaves the dial where it is rather than pulling
// it back down, since the user may have deliberately raised it separately. A one-tap shortcut from
// the card face either way, and any number of dimensions can be a deal breaker at once — nothing
// here caps it. Political lean is handled separately (weight_safety, a fully dead column
// otherwise) since it has no importance dial to begin with — the flag itself already forces
// DEALBREAKER_WEIGHT when set (see atlasScore.ts). Every other dimension uses the shared bitmask
// in usePreferences.ts (DEALBREAKER_DIMS / isDealbreakerDim / withDealbreakerToggled).
function supportsDealbreaker(step: QuizStep): boolean {
  return !!step.dealbreakerDim || step.key === 'political_lean_preference';
}

function isDealbreaker(step: QuizStep): boolean {
  if (step.dealbreakerDim) return isDealbreakerDim(draft.value, step.dealbreakerDim);
  if (step.key === 'political_lean_preference') return draft.value.weight_safety > 0;
  return false;
}

function toggleDealbreaker(step: QuizStep) {
  if (step.dealbreakerDim) {
    const turningOn = !isDealbreaker(step);
    draft.value = withDealbreakerToggled(draft.value, step.dealbreakerDim);
    touchedKeys.value.add('weight_education');
    if (turningOn) {
      if (step.importanceKey && step.importanceScale) {
        // Dimensions with a separate dial (climate, job market, lifestyle, opportunity,
        // connectivity) — snap it to the "high" tier.
        (draft.value as any)[step.importanceKey] = step.importanceScale.high;
        touchedKeys.value.add(step.importanceKey);
      } else if (step.key === 'affordability_preference') {
        // Affordability's own answer IS its importance dial (cost_low/medium/high) — see the
        // comment on UserPreferences in usePreferences.ts.
        draft.value.affordability_preference = 'cost_high';
        touchedKeys.value.add('affordability_preference');
      } else if (step.key === 'air_quality_priority') {
        draft.value.air_quality_priority = 'high';
        touchedKeys.value.add('air_quality_priority');
      }
    }
  } else if (step.key === 'political_lean_preference') {
    selectOption('weight_safety', isDealbreaker(step) ? 0 : 90);
  }
}

// Deal breaker now actually fails a city that matches none of the selected options (see
// applyDealbreaker in atlasScore.ts) rather than just weighing the dimension heavily — spell that
// out once more than one option is checked, so "Deal breaker" doesn't read as "must match my
// single pick" when it really means "must match at least one of these."
function dealbreakerLabel(step: QuizStep): string {
  return getSelectedOptions(step).length > 1 ? 'Must match one of your picks' : 'Deal breaker';
}

defineExpose({ save, saving, saved });
</script>

<template>
  <!-- ── Flat inline mode (Profile page) ─────────────────────────────────── -->
  <template v-if="props.flat">
    <div v-if="loaded" class="quiz quiz--flat">

      <!-- Nothing saved yet -->
      <div v-if="mode === 'cover'" class="quiz__flat-cover">
        <span class="mdi mdi-map-marker-star-outline quiz__flat-cover-icon"></span>
        <h3 class="quiz__flat-cover-title">Make your preferences</h3>
        <p class="quiz__flat-cover-desc">Tell us what you're looking for so every city shows a score tailored to you.</p>
        <button class="quiz__flat-save quiz__flat-cover-start" @click="startEditing">
          <span class="mdi mdi-arrow-right"></span>
          Start
        </button>
      </div>

      <!-- Editing or read-only saved summary -->
      <template v-else>
        <div class="quiz__flat-grid">
          <div
            v-for="step in STEPS"
            :key="step.key"
            class="quiz__flat-card"
            :class="{ 'quiz__flat-card--readonly': mode === 'saved', 'quiz__flat-card--dealbreaker': isDealbreaker(step) }"
            role="button"
            :tabindex="mode === 'saved' ? -1 : 0"
            @click="mode !== 'saved' && openCategory(step.key)"
            @keydown.enter="mode !== 'saved' && openCategory(step.key)"
          >
            <div
              v-if="mode === 'editing' && supportsDealbreaker(step)"
              class="quiz__flat-card-dealbreaker-wrap"
            >
              <span v-if="isDealbreaker(step)" class="quiz__flat-card-dealbreaker-label">Deal breaker</span>
              <label
                class="quiz__flat-card-dealbreaker-toggle"
                :class="{ 'quiz__flat-card-dealbreaker-toggle--active': isDealbreaker(step) }"
                :title="isDealbreaker(step) ? `${dealbreakerLabel(step)} — click to unmark` : 'Mark as deal breaker'"
                @click.stop
              >
                <input type="checkbox" :checked="isDealbreaker(step)" @change="toggleDealbreaker(step)">
                <span class="quiz__flat-card-dealbreaker-slider"></span>
              </label>
            </div>
            <span v-else-if="isDealbreaker(step)" class="quiz__flat-card-dealbreaker-badge" :title="dealbreakerLabel(step)"></span>

            <div class="quiz__flat-card-top">
              <span
                class="mdi quiz__flat-card-icon"
                :class="getSelectedOption(step)?.icon ?? 'mdi-dots-horizontal-circle-outline'"
                :style="getSelectedOption(step) ? {} : { opacity: '0.35' }"
              ></span>
            </div>
            <span class="quiz__flat-card-label">{{ step.shortTitle }}</span>
            <span
              class="quiz__flat-card-value"
              :class="{ 'quiz__flat-card-value--unset': !getSelectedOptions(step).length }"
            >{{ getSelectedOptions(step).map(o => o.label).join(' + ') || 'No preference set' }}</span>
            <span class="quiz__flat-card-desc">{{ getSelectedOptions(step).length > 1 ? `${getSelectedOptions(step).length} options selected` : (getSelectedOption(step)?.description ?? 'Tap to set your preference') }}</span>
          </div>
        </div>
        <p v-if="saveError" class="quiz__flat-save-error">
          <span class="mdi mdi-alert-circle-outline"></span> Couldn't save: {{ saveError }} — your changes are still here, try again.
        </p>
        <div class="quiz__flat-footer">
          <template v-if="mode === 'editing'">
            <button
              class="quiz__flat-reset"
              :class="{ 'quiz__flat-reset--randomize': !hasAnyPreference }"
              @click="hasAnyPreference ? resetPreferences() : randomizePreferences()"
            >
              <span class="mdi" :class="hasAnyPreference ? 'mdi-refresh' : 'mdi-shuffle-variant'"></span>
              {{ hasAnyPreference ? 'Reset all preferences' : 'Randomize' }}
            </button>
            <button class="quiz__flat-save" :disabled="saving" @click="save">
              <span v-if="saving" class="mdi mdi-loading quiz__spin"></span>
              <span v-else-if="saved" class="mdi mdi-check"></span>
              {{ saved ? 'Saved!' : saving ? 'Saving…' : 'Save preferences' }}
            </button>
          </template>
          <button v-else class="quiz__flat-edit" @click="startEditing">
            <span class="mdi mdi-pencil-outline"></span>
            Edit preferences
          </button>
        </div>
      </template>
    </div>
    <div v-else class="quiz__loading">
      <span class="mdi mdi-loading quiz__spin"></span>
    </div>

    <!-- Category popup -->
    <Teleport to="body">
      <Transition name="flat-popup">
        <div
          v-if="activeCategory && activeCategoryStep"
          class="quiz__flat-backdrop"
          @click.self="closeCategory"
        >
          <div class="quiz__flat-popup">
            <div class="quiz__flat-popup-header">
              <div class="quiz__flat-popup-heading">
                <p class="quiz__flat-popup-eyebrow">Preference</p>
                <h3 class="quiz__flat-popup-title">{{ activeCategoryStep.shortTitle }}</h3>
              </div>
              <button class="quiz__flat-popup-close" @click="closeCategory">
                <span class="mdi mdi-close"></span>
              </button>
            </div>
            <p class="quiz__flat-popup-subtitle">{{ activeCategoryStep.subtitle }}</p>
            <div
              class="quiz__options"
              :class="`quiz__options--count-${activeCategoryStep.options.length}`"
            >
              <button
                v-for="opt in activeCategoryStep.options"
                :key="opt.value"
                class="quiz__option"
                :class="{ 'quiz__option--selected': isSelected(activeCategoryStep.key, opt.value) }"
                @click="selectFlatOption(activeCategoryStep.key, opt.value)"
              >
                <span class="mdi quiz__option-icon" :class="opt.icon"></span>
                <span v-if="opt.tooltip" class="quiz__option-example">{{ opt.tooltip }}</span>
                <span class="quiz__option-label-row">
                  <span class="quiz__option-label">{{ opt.label }}</span>
                </span>
                <span class="quiz__option-desc">{{ opt.description }}</span>
              </button>
            </div>

            <div v-if="activeCategoryStep.importanceKey" class="quiz__importance">
              <p class="quiz__importance-label">How much should this matter?</p>
              <div class="quiz__importance-options">
                <button
                  v-for="level in IMPORTANCE_LEVELS"
                  :key="level.value"
                  class="quiz__importance-btn"
                  :class="{ 'quiz__importance-btn--selected': isSelected(activeCategoryStep.importanceKey, activeCategoryStep.importanceScale![level.value]) }"
                  @click="selectFlatImportance(activeCategoryStep.importanceKey, activeCategoryStep.importanceScale![level.value])"
                >
                  {{ level.label }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </template>

  <!-- ── Stepped modal mode (default) ─────────────────────────────────────── -->
  <template v-else>
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
            <span class="quiz__option-label-row">
              <span class="quiz__option-label">{{ opt.label }}</span>
              <span v-if="opt.tooltip" class="quiz__option-tip" @click.stop>
                ?
                <span class="quiz__option-tip-bubble">{{ opt.tooltip }}</span>
              </span>
            </span>
            <span class="quiz__option-desc">{{ opt.description }}</span>
          </button>
        </div>

        <div v-if="STEPS[currentStep].importanceKey" class="quiz__importance">
          <p class="quiz__importance-label">How much should this matter?</p>
          <div class="quiz__importance-options">
            <button
              v-for="level in IMPORTANCE_LEVELS"
              :key="level.value"
              class="quiz__importance-btn"
              :class="{ 'quiz__importance-btn--selected': isSelected(STEPS[currentStep].importanceKey, STEPS[currentStep].importanceScale![level.value]) }"
              @click="selectOption(STEPS[currentStep].importanceKey, STEPS[currentStep].importanceScale![level.value])"
            >
              {{ level.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <p v-if="saveError" class="quiz__flat-save-error" style="padding: 0 28px;">
        <span class="mdi mdi-alert-circle-outline"></span> Couldn't save: {{ saveError }} — your changes are still here, try again.
      </p>

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
  width: 100%;
}

.quiz__options--count-3 {
  grid-template-columns: 1fr 1fr 1fr;
}

.quiz__options--count-5 {
  grid-template-columns: 1fr 1fr;
}

.quiz__options--count-5 .quiz__option:last-child {
  grid-column: 1 / -1;
}

.quiz__options--count-12 {
  grid-template-columns: repeat(4, 1fr);
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
  min-width: 0;
  position: relative;
  overflow: hidden;
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

.quiz__option-label-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  width: 100%;
}

.quiz__option-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.25;
  white-space: normal;
  overflow-wrap: break-word;
}

.quiz__option-example {
  position: absolute;
  top: 11px;
  right: 13px;
  font-size: 0.67rem;
  font-style: italic;
  color: var(--text-muted);
  opacity: 0.45;
  white-space: nowrap;
  pointer-events: none;
}

.quiz__option-desc {
  font-size: 0.71rem;
  color: var(--text-muted);
  line-height: 1.4;
  width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

/* ── Importance dial ── */
.quiz__importance {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border-card);
}

.quiz__importance-label {
  margin: 0 0 8px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.quiz__importance-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.quiz__importance-btn {
  padding: 8px 6px;
  background: var(--bg-card-inner);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  text-align: center;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.quiz__importance-btn:hover {
  background: var(--bg-card-subtle);
}

.quiz__importance-btn--selected {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--bg-card-inner));
  color: var(--text-primary);
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

/* ── Flat mode ── */
.quiz--flat {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.quiz__flat-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 10px;
  padding: 14px 16px 10px;
}

.quiz__flat-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 15px 13px;
  border: 1px solid color-mix(in srgb, var(--border-card) 90%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-card) 70%, var(--bg-card-inner) 30%);
  cursor: pointer;
  text-align: left;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}

.quiz__flat-card:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border-card));
  background: color-mix(in srgb, var(--accent) 5%, var(--bg-card-inner));
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0,0,0,0.12);
}

.quiz__flat-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.quiz__flat-card-icon {
  font-size: 1.5rem;
  color: var(--accent);
  opacity: 0.9;
}

.quiz__flat-card-label {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.quiz__flat-card-value {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quiz__flat-card-value--unset {
  color: var(--text-muted);
  font-weight: 500;
  font-style: italic;
}

.quiz__flat-card-desc {
  font-size: 0.72rem;
  color: var(--text-muted);
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

/* ── Deal breaker ── */
.quiz__flat-card--dealbreaker {
  border-color: color-mix(in srgb, var(--danger) 45%, var(--border-card));
  background: color-mix(in srgb, var(--danger) 6%, var(--bg-card-inner));
}

.quiz__flat-card-dealbreaker-wrap {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 1;
}

.quiz__flat-card-dealbreaker-label {
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--danger);
  white-space: nowrap;
}

.quiz__flat-card-dealbreaker-toggle {
  position: relative;
  display: block;
  width: 32px;
  height: 18px;
  cursor: pointer;
  flex-shrink: 0;
}

.quiz__flat-card-dealbreaker-toggle input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.quiz__flat-card-dealbreaker-slider {
  position: absolute;
  inset: 0;
  display: block;
  background: color-mix(in srgb, var(--border-card) 60%, transparent);
  border: 1px solid var(--border-card);
  border-radius: 20px;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.quiz__flat-card-dealbreaker-slider::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: transform 0.2s ease, background 0.2s ease;
}

.quiz__flat-card-dealbreaker-toggle--active .quiz__flat-card-dealbreaker-slider {
  background: color-mix(in srgb, var(--danger) 40%, transparent);
  border-color: var(--danger);
}

.quiz__flat-card-dealbreaker-toggle--active .quiz__flat-card-dealbreaker-slider::before {
  transform: translate(14px, -50%);
  background: var(--danger);
}

.quiz__flat-card-dealbreaker-badge {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--danger);
}

.quiz__flat-footer {
  padding: 8px 14px 14px;
  border-top: 1px solid color-mix(in srgb, var(--accent) 10%, var(--border-card));
  flex-shrink: 0;
  display: flex;
  gap: 8px;
}

.quiz__flat-save-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 8px 14px 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--danger);
  flex-shrink: 0;
}

.quiz__flat-reset {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--danger, #f87171) 35%, var(--border-card));
  background: color-mix(in srgb, var(--danger, #f87171) 8%, transparent);
  color: color-mix(in srgb, var(--danger, #f87171) 80%, var(--text-secondary));
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.quiz__flat-reset:hover {
  background: color-mix(in srgb, var(--danger, #f87171) 14%, transparent);
  border-color: color-mix(in srgb, var(--danger, #f87171) 55%, var(--border-card));
  transform: translateY(-1px);
}

.quiz__flat-reset--randomize {
  border-color: color-mix(in srgb, var(--accent) 35%, var(--border-card));
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: color-mix(in srgb, var(--accent) 80%, var(--text-secondary));
}

.quiz__flat-reset--randomize:hover {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  border-color: color-mix(in srgb, var(--accent) 55%, var(--border-card));
}

.quiz__flat-save {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 20px;
  border-radius: 10px;
  border: none;
  background: var(--accent);
  color: #fff;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.15s ease;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 30%, transparent);
}

html:not(.dark) .quiz__flat-save {
  color: var(--bg-main);
}

.quiz__flat-save:not(:disabled):hover {
  opacity: 0.88;
  transform: translateY(-1px);
}

.quiz__flat-save:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* ── Cover (no saved preferences yet) ── */

.quiz__flat-cover {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 6px;
  padding: 28px 24px;
}

.quiz__flat-cover-icon {
  font-size: 2.1rem;
  color: var(--accent);
  opacity: 0.85;
  margin-bottom: 4px;
}

.quiz__flat-cover-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.quiz__flat-cover-desc {
  font-size: 0.82rem;
  color: var(--text-muted);
  max-width: 320px;
  line-height: 1.45;
  margin: 0 0 10px;
}

.quiz__flat-cover-start {
  flex: 0 0 auto;
  padding: 10px 28px;
}

/* ── Read-only saved summary ── */

.quiz__flat-card--readonly {
  cursor: default;
  opacity: 0.6;
  filter: grayscale(0.4);
}

.quiz__flat-card--readonly:hover {
  border-color: color-mix(in srgb, var(--border-card) 90%, transparent);
  background: color-mix(in srgb, var(--bg-card) 70%, var(--bg-card-inner) 30%);
  transform: none;
  box-shadow: none;
}

.quiz__flat-edit {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 20px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--border-card));
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: color-mix(in srgb, var(--accent) 85%, var(--text-secondary));
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.quiz__flat-edit:hover {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  border-color: color-mix(in srgb, var(--accent) 55%, var(--border-card));
  transform: translateY(-1px);
}

/* ── Category popup ── */
.quiz__flat-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 24px;
}

.quiz__flat-popup {
  width: min(960px, calc(100vw - 48px));
  background: var(--bg-card);
  border-radius: 20px;
  border: 1px solid color-mix(in srgb, var(--accent) 20%, var(--border-card));
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
  padding: 22px 22px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.quiz__flat-popup-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.quiz__flat-popup-heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.quiz__flat-popup-eyebrow {
  margin: 0;
  font-size: 0.67rem;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--accent) 80%, var(--text-muted));
}

.quiz__flat-popup-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.quiz__flat-popup-close {
  background: none;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.95rem;
  flex-shrink: 0;
  transition: color 0.15s, border-color 0.15s;
}

.quiz__flat-popup-close:hover {
  color: var(--text-primary);
  border-color: var(--border-color);
}

.quiz__flat-popup-subtitle {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.5;
}

/* Popup enter/leave transitions */
.flat-popup-enter-active,
.flat-popup-leave-active {
  transition: opacity 0.18s ease;
}
.flat-popup-enter-active .quiz__flat-popup,
.flat-popup-leave-active .quiz__flat-popup {
  transition: opacity 0.18s ease, transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}
.flat-popup-enter-from,
.flat-popup-leave-to {
  opacity: 0;
}
.flat-popup-enter-from .quiz__flat-popup,
.flat-popup-leave-to .quiz__flat-popup {
  opacity: 0;
  transform: scale(0.95) translateY(8px);
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
  .quiz__options--count-5,
  .quiz__options--count-12 {
    grid-template-columns: 1fr;
  }
}
</style>
