<script setup lang="ts">
import { ref, watch } from 'vue';
import { useAuth } from '../composables/useAuth';
import { usePreferences, type UserPreferences } from '../composables/usePreferences';

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
  { key: 'weight_affordability' as const, label: 'Affordability' },
  { key: 'weight_job_market'    as const, label: 'Job Market' },
  { key: 'weight_opportunity'   as const, label: 'Opportunity' },
  { key: 'weight_connectivity'  as const, label: 'Transportation' },
  { key: 'weight_lifestyle'     as const, label: 'Quality of Life' },
];

const draft = ref<UserPreferences>({ ...preferences.value });
const customizeOpen = ref(false);
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
  setTimeout(() => { saved.value = false; }, 2500);
}
</script>

<template>
  <div v-if="loaded" class="prefs">
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

    <button class="prefs__customize-toggle" @click="customizeOpen = !customizeOpen">
      <span>Fine-tune weights</span>
      <span class="mdi" :class="customizeOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'"></span>
    </button>

    <div v-if="customizeOpen" class="prefs__sliders">
      <div v-for="dim in DIMS" :key="dim.key" class="prefs__slider-row">
        <div class="prefs__slider-labels">
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
      <button class="prefs__save-btn" :disabled="saving" @click="save">
        <span v-if="saving" class="mdi mdi-loading prefs__spin"></span>
        <span v-else-if="saved" class="mdi mdi-check"></span>
        {{ saving ? 'Saving…' : saved ? 'Saved' : 'Save preferences' }}
      </button>
    </div>
  </div>

  <div v-else class="prefs__loading">
    <span class="mdi mdi-loading prefs__spin"></span>
  </div>
</template>

<style scoped>
.prefs__persona-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}

@media (max-width: 600px) {
  .prefs__persona-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.prefs__persona-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 14px 12px;
  background: var(--bg-card-inner);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}

.prefs__persona-card:hover {
  background: var(--bg-card-subtle);
}

.prefs__persona-card--active {
  border-color: var(--accent);
  background: var(--bg-card-subtle);
}

.prefs__persona-icon {
  font-size: 1.4rem;
  color: var(--accent);
  margin-bottom: 2px;
}

.prefs__persona-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
}

.prefs__persona-desc {
  font-size: 0.72rem;
  color: var(--text-muted);
  line-height: 1.3;
}

.prefs__customize-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  padding: 6px 0;
  font-size: 0.8rem;
  color: var(--text-muted);
  cursor: pointer;
  margin-bottom: 2px;
}

.prefs__customize-toggle:hover {
  color: var(--text-primary);
}

.prefs__sliders {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 0 4px;
}

.prefs__slider-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.prefs__slider-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.prefs__slider-label {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.prefs__slider-value {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--accent);
  min-width: 24px;
  text-align: right;
}

.prefs__range {
  width: 100%;
  accent-color: var(--accent);
  height: 4px;
  cursor: pointer;
}

.prefs__footer {
  margin-top: 16px;
}

.prefs__save-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.prefs__save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.prefs__loading {
  display: flex;
  justify-content: center;
  padding: 24px;
  color: var(--text-muted);
}

@keyframes spin { to { transform: rotate(360deg); } }
.prefs__spin { display: inline-block; animation: spin 0.8s linear infinite; }
</style>
