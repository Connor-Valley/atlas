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

  // Weights double as the "how much should this count" importance dial — the UI writes a
  // low/medium/high preset straight into these instead of storing a separate importance choice,
  // so no schema change was needed to add per-dimension importance. Air quality is the exception:
  // air_quality_priority is itself already an importance dial (not a "type" choice), so its
  // weight still gets derived from that field below rather than set directly by the UI.
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

  // "Medium" tier of each dimension's low/medium/high scale (see deriveWeightsFromQuiz) —
  // matches what a never-touched importance dial shows as selected.
  weight_affordability:      18,
  weight_job_market:         18,
  weight_climate:            18,
  weight_opportunity:        10,
  weight_lifestyle_vibrancy: 18,
  weight_air_quality:        18,
  weight_safety:             0,
  weight_connectivity:       18,

  persona_id: 'custom',
  political_preference_enabled: false,
  political_preference: 0,
};

// The 8 actual quiz answer fields — everything else on UserPreferences is either derived
// (weights) or legacy/compat, so it shouldn't count toward "has this user set anything."
const QUIZ_ANSWER_KEYS: Array<keyof UserPreferences> = [
  'climate_preference', 'affordability_preference', 'job_market_preference',
  'lifestyle_preference', 'opportunity_preference', 'air_quality_priority',
  'connectivity_preference', 'political_lean_preference',
  'weight_affordability', 'weight_job_market', 'weight_climate',
  'weight_lifestyle_vibrancy', 'weight_connectivity', 'weight_opportunity',
  'weight_safety', // repurposed as "political lean is a deal breaker" — see computeAtlasScore
];

// A preferences object that merely EXISTS (e.g. `{ ...DEFAULT_PREFERENCES }` after a reset, or
// the fallback used before any row has loaded) isn't the same as a user having actually chosen
// anything — every quiz answer being left at its default is indistinguishable from "no
// preferences at all" and should be treated that way everywhere personalization is decided
// (the Atlas Score card, the "Personalized" badge, etc.), not just on the profile quiz itself.
export function hasRealPreferences(prefs: UserPreferences | null | undefined): boolean {
  if (!prefs) return false;
  return QUIZ_ANSWER_KEYS.some((k) => prefs[k] !== DEFAULT_PREFERENCES[k]);
}

/** Derive weight_air_quality and political settings from quiz answers. Every other weight_*
 *  field is written directly by the importance dial in the UI, so it just passes through
 *  unchanged via the `...prefs` spread below. */
export function deriveWeightsFromQuiz(prefs: UserPreferences): UserPreferences {
  const AIR_QUALITY: Record<string, number> = {
    high: 80, medium: 18, low: 8,
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
    weight_air_quality: AIR_QUALITY[prefs.air_quality_priority] ?? 18,
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
