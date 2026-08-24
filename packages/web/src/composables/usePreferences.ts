import { ref } from 'vue';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface UserPreferences {
  // Quiz answers — drive both weights and sub-preference signals
  climate_preference:      'warm' | 'hot_dry' | 'mild' | 'four_seasons' | 'cool' | 'any';
  affordability_preference: 'budget' | 'value' | 'flexible' | 'any';
  job_market_preference:   'high_earning' | 'stable' | 'growth' | 'remote' | 'any';
  lifestyle_preference:    'urban' | 'urban_edge' | 'suburban' | 'nature' | 'any';
  opportunity_preference:
    | 'tech_media_pro' | 'corporate_finance' | 'manufacturing' | 'construction_trades'
    | 'transportation_logistics' | 'education_healthcare' | 'government_services' | 'retail'
    | 'hospitality_arts' | 'agriculture' | 'nonprofit' | 'any';
  air_quality_priority:    'high' | 'medium' | 'low';
  connectivity_preference: 'walkable' | 'balanced' | 'car' | 'airport' | 'any';
  political_lean_preference: 'progressive' | 'conservative' | 'open' | 'not_a_factor';

  // Derived weights — computed from quiz answers, persisted for the score card breakdown display
  weight_affordability:     number;
  weight_job_market:        number;
  weight_climate:           number;
  weight_opportunity:       number;
  weight_lifestyle_vibrancy: number;
  weight_air_quality:       number;
  weight_safety:            number;
  weight_connectivity:      number;

  // Legacy / compat
  persona_id: string;
  political_preference_enabled: boolean;
  political_preference: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  climate_preference:       'any',
  affordability_preference: 'any',
  job_market_preference:    'any',
  lifestyle_preference:     'any',
  opportunity_preference:   'any',
  air_quality_priority:     'medium',
  connectivity_preference:  'any',
  political_lean_preference: 'not_a_factor',

  weight_affordability:      20,
  weight_job_market:         20,
  weight_climate:            20,
  weight_opportunity:        5,
  weight_lifestyle_vibrancy: 15,
  weight_air_quality:        10,
  weight_safety:             0,
  weight_connectivity:       20,

  persona_id: 'custom',
  political_preference_enabled: false,
  political_preference: 0,
};

/** Derive weights and political settings from quiz answers. */
export function deriveWeightsFromQuiz(prefs: UserPreferences): UserPreferences {
  const AFFORDABILITY: Record<string, number> = {
    budget: 35, value: 20, flexible: 8, any: 20,
  };
  const JOB_MARKET: Record<string, number> = {
    high_earning: 35, stable: 30, growth: 28, remote: 10, any: 20,
  };
  const CLIMATE: Record<string, number> = {
    warm: 30, hot_dry: 28, cool: 30, mild: 25, four_seasons: 25, any: 15,
  };
  // Modest, uniform weight for every real field — this is a soft "does the local industry
  // match your field" signal, not a hard requirement, so it shouldn't swing the overall score
  // as much as core dimensions do. Lowered from 18 after evaluateOpportunityMatch (atlasScore.ts)
  // started scoring genuinely low ranks (7+) as real red-zone misses down to a floor of 20,
  // instead of never going below a 70 "no bonus" floor — the score range this weight applies to
  // got much wider (20–100 vs. 70–100), so the same weight was pulling harder on the overall
  // score than it used to for the exact same "one field in a city with a dozen industries" case.
  const OPPORTUNITY: Record<string, number> = {
    tech_media_pro: 10, corporate_finance: 10, manufacturing: 10, construction_trades: 10,
    transportation_logistics: 10, education_healthcare: 10, government_services: 10, retail: 10,
    hospitality_arts: 10, agriculture: 10, nonprofit: 10, any: 5,
  };
  const LIFESTYLE: Record<string, number> = {
    urban: 35, urban_edge: 22, suburban: 10, nature: 15, any: 15,
  };
  const AIR_QUALITY: Record<string, number> = {
    high: 25, medium: 12, low: 4,
  };
  const CONNECTIVITY: Record<string, number> = {
    walkable: 30, balanced: 22, airport: 25, car: 8, any: 15,
  };
  const POLITICAL: Record<string, { enabled: boolean; value: number; weight: number }> = {
    progressive:  { enabled: true,  value:  100, weight: 20 },
    conservative: { enabled: true,  value: -100, weight: 20 },
    open:         { enabled: true,  value: 0,    weight: 5  },
    not_a_factor: { enabled: false, value: 0,    weight: 0  },
  };

  const pol = POLITICAL[prefs.political_lean_preference] ?? POLITICAL.not_a_factor;

  return {
    ...prefs,
    weight_affordability:      AFFORDABILITY[prefs.affordability_preference]  ?? 20,
    weight_job_market:         JOB_MARKET[prefs.job_market_preference]        ?? 20,
    weight_climate:            CLIMATE[prefs.climate_preference]               ?? 15,
    weight_opportunity:        OPPORTUNITY[prefs.opportunity_preference]       ?? 15,
    weight_lifestyle_vibrancy: LIFESTYLE[prefs.lifestyle_preference]           ?? 15,
    weight_air_quality:        AIR_QUALITY[prefs.air_quality_priority]         ?? 12,
    weight_connectivity:       CONNECTIVITY[prefs.connectivity_preference]     ?? 15,
    political_preference_enabled: pol.enabled,
    political_preference:         pol.value,
  };
}

const preferences    = ref<UserPreferences>({ ...DEFAULT_PREFERENCES });
const loaded         = ref(false);
const loadedForUser  = ref<string | null>(null); // tracks which user's prefs are currently loaded

export function usePreferences() {
  const { user } = useAuth();

  async function fetchPreferences() {
    if (!user.value) {
      preferences.value  = { ...DEFAULT_PREFERENCES };
      loaded.value       = true;
      loadedForUser.value = null;
      return;
    }
    const userId = user.value.id;
    const { data, error } = await supabase
      .from('user_preferences')
      .select([
        'persona_id',
        'climate_preference', 'affordability_preference', 'job_market_preference',
        'lifestyle_preference', 'opportunity_preference', 'air_quality_priority',
        'connectivity_preference', 'political_lean_preference',
        'weight_affordability', 'weight_job_market', 'weight_climate',
        'weight_opportunity', 'weight_lifestyle_vibrancy', 'weight_air_quality',
        'weight_safety', 'weight_connectivity',
        'political_preference_enabled', 'political_preference',
      ].join(', '))
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      preferences.value = { ...DEFAULT_PREFERENCES, ...data };
    }
    loaded.value        = true;
    loadedForUser.value = userId;
  }

  async function savePreferences(updates: UserPreferences) {
    if (!user.value) return;
    const derived = deriveWeightsFromQuiz(updates);
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.value.id,
        ...derived,
        updated_at: new Date().toISOString(),
      });
    if (!error) {
      preferences.value = derived;
    }
  }

  return { preferences, loaded, loadedForUser, fetchPreferences, savePreferences };
}
