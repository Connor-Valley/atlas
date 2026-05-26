<script setup lang="ts">
import { ref, watch } from 'vue';
import { useAuth } from '../composables/useAuth';
import { usePreferences, type UserPreferences } from '../composables/usePreferences';

const emit = defineEmits<{ (e: 'saved'): void }>();

const { user } = useAuth();
const { preferences, loaded, fetchPreferences, savePreferences } = usePreferences();

watch(() => user.value, () => fetchPreferences(), { immediate: true });

type Persona = {
  id: string;
  label: string;
  icon: string;
  description: string;
  weights: Pick<UserPreferences, 'weight_affordability' | 'weight_job_market' | 'weight_opportunity' | 'weight_connectivity' | 'weight_lifestyle'>;
};

const PERSONAS: Persona[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    icon: 'mdi-scale-balance',
    description: 'Equal weight across all factors',
    weights: { weight_affordability: 20, weight_job_market: 20, weight_opportunity: 20, weight_connectivity: 20, weight_lifestyle: 20 },
  },
  {
    id: 'young_professional',
    label: 'Young Professional',
    icon: 'mdi-briefcase-outline',
    description: 'Career growth with a cost-effective lifestyle',
    weights: { weight_affordability: 20, weight_job_market: 35, weight_opportunity: 25, weight_connectivity: 10, weight_lifestyle: 10 },
  },
  {
    id: 'family_buying',
    label: 'Family Buying',
    icon: 'mdi-home-heart',
    description: 'Safe neighborhoods and long-term value',
    weights: { weight_affordability: 35, weight_job_market: 15, weight_opportunity: 25, weight_connectivity: 5, weight_lifestyle: 20 },
  },
  {
    id: 'remote_worker',
    label: 'Remote Worker',
    icon: 'mdi-laptop',
    description: 'Low cost of living, high quality of life',
    weights: { weight_affordability: 35, weight_job_market: 5, weight_opportunity: 15, weight_connectivity: 15, weight_lifestyle: 30 },
  },
  {
    id: 'career_climber',
    label: 'Career Climber',
    icon: 'mdi-trending-up',
    description: 'Opportunity-dense, high-earning cities',
    weights: { weight_affordability: 10, weight_job_market: 40, weight_opportunity: 30, weight_connectivity: 15, weight_lifestyle: 5 },
  },
  {
    id: 'tight_budget',
    label: 'Tight Budget',
    icon: 'mdi-piggy-bank-outline',
    description: 'Stretching every dollar as far as it goes',
    weights: { weight_affordability: 50, weight_job_market: 20, weight_opportunity: 20, weight_connectivity: 5, weight_lifestyle: 5 },
  },
];

const DIMS = [
  { key: 'weight_affordability' as const, label: 'Affordability',    icon: 'mdi-home-city-outline' },
  { key: 'weight_job_market'    as const, label: 'Job Market',        icon: 'mdi-briefcase-outline' },
  { key: 'weight_opportunity'   as const, label: 'Opportunity',       icon: 'mdi-chart-line' },
  { key: 'weight_connectivity'  as const, label: 'Transportation',    icon: 'mdi-train-car' },
  { key: 'weight_lifestyle'     as const, label: 'Quality of Life',   icon: 'mdi-heart-outline' },
];

const draft = ref<UserPreferences>({ ...preferences.value });
const saving = ref(false);
const saved = ref(false);

watch(preferences, (p) => { draft.value = { ...p }; }, { immediate: true });

function selectPersona(p: Persona) {
  draft.value = { ...draft.value, persona_id: p.id, ...p.weights };
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

      <!-- Right: weight sliders + save -->
      <div class="prefs__right">
        <p class="prefs__section-label">Fine-tune weights</p>
        <div class="prefs__sliders">
          <div v-for="dim in DIMS" :key="dim.key" class="prefs__slider-row">
            <div class="prefs__slider-meta">
              <span class="mdi prefs__slider-icon" :class="dim.icon"></span>
              <span class="prefs__slider-label">{{ dim.label }}</span>
              <span class="prefs__slider-value">{{ draft[dim.key] }}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              :value="draft[dim.key]"
              class="prefs__range"
              @input="draft[dim.key] = +($event.target as HTMLInputElement).value"
            />
          </div>
        </div>

        <div class="prefs__footer">
          <p class="prefs__footer-hint">Weights are relative — they don't need to sum to 100.</p>
          <button class="prefs__save-btn" :disabled="saving" @click="save">
            <span v-if="saving" class="mdi mdi-loading prefs__spin"></span>
            <span v-else-if="saved" class="mdi mdi-check"></span>
            {{ saving ? 'Saving…' : saved ? 'Saved!' : 'Save preferences' }}
          </button>
        </div>
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
}

.prefs__body {
  display: grid;
  grid-template-columns: 1fr auto 340px;
  gap: 0;
  padding: 0 28px 28px;
}

.prefs__left {
  padding-right: 28px;
  min-width: 0;
  overflow: visible;
}

.prefs__right {
  padding-left: 28px;
  display: flex;
  flex-direction: column;
}

.prefs__divider {
  width: 1px;
  background: color-mix(in srgb, var(--accent) 12%, var(--border-card));
  align-self: stretch;
}

.prefs__section-label {
  margin: 0 0 14px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.prefs__persona-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  align-items: start;
}

.prefs__persona-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 16px 15px;
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
  font-size: 1.5rem;
  color: var(--accent);
  margin-bottom: 2px;
}

.prefs__persona-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.prefs__persona-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.4;
  word-break: normal;
  overflow-wrap: break-word;
  white-space: normal;
}

/* Sliders */
.prefs__sliders {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.prefs__slider-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
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

.prefs__range {
  width: 100%;
  accent-color: var(--accent);
  height: 4px;
  cursor: pointer;
}

/* Footer */
.prefs__footer {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.prefs__footer-hint {
  margin: 0;
  font-size: 0.72rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.prefs__save-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;
  width: 100%;
}

html:not(.dark) .prefs__save-btn {
  color: var(--bg-main);
}

.prefs__save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.prefs__loading {
  display: flex;
  justify-content: center;
  padding: 40px;
  color: var(--text-muted);
}

@keyframes spin { to { transform: rotate(360deg); } }
.prefs__spin { display: inline-block; animation: spin 0.8s linear infinite; }

/* Responsive: stack on narrow screens */
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
