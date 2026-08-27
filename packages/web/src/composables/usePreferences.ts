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
  // Bitmask of which dimensions are marked a "deal breaker" — fully independent of the
  // importance dial above (picking "Very important" does NOT imply deal breaker, and marking a
  // deal breaker doesn't change the importance dial's displayed tier either). Repurposes
  // weight_education (the old education-scoring column — dropped from the app when opportunityScore
  // started deriving its inputs from profile.educationalAttainment directly, see CLAUDE.md) since
  // it's otherwise fully dead and has no CHECK constraint. Offset by DEALBREAKER_OFFSET so any
  // leftover legacy value from when this column meant something else (small, e.g. 15) never gets
  // misread as a bitmask — see isDealbreakerDim / withDealbreakerToggled below.
  weight_education:         number;

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
  weight_education:          0,

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
  'weight_education', // repurposed as the deal-breaker bitmask for the other 7 dimensions
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

// ── Deal breakers ──────────────────────────────────────────────────────────────
// Independent of the importance dial (weight_affordability etc.) and of political lean's own
// weight_safety flag — a separate on/off per dimension, packed into one bitmask so no new
// column was needed. Any dimension can be a deal breaker regardless of its importance tier.

export const DEALBREAKER_DIMS = [
  'affordability', 'job_market', 'climate', 'lifestyle_vibrancy', 'connectivity', 'opportunity', 'air_quality',
] as const;
export type DealbreakerDim = typeof DEALBREAKER_DIMS[number];

const DEALBREAKER_BIT: Record<DealbreakerDim, number> = {
  affordability: 1, job_market: 2, climate: 4, lifestyle_vibrancy: 8,
  connectivity: 16, opportunity: 32, air_quality: 64,
};

// Legacy weight_education values (from when this column meant something else) were always a
// small plain number — offsetting new bitmask writes well above that range means an old
// leftover value reads as "no deal breakers" instead of being misinterpreted as one.
const DEALBREAKER_OFFSET = 1000;

function dealbreakerBits(prefs: UserPreferences): number {
  return prefs.weight_education >= DEALBREAKER_OFFSET ? prefs.weight_education - DEALBREAKER_OFFSET : 0;
}

export function isDealbreakerDim(prefs: UserPreferences, dim: DealbreakerDim): boolean {
  return (dealbreakerBits(prefs) & DEALBREAKER_BIT[dim]) !== 0;
}

export function withDealbreakerToggled(prefs: UserPreferences, dim: DealbreakerDim): UserPreferences {
  const bit = DEALBREAKER_BIT[dim];
  const bits = dealbreakerBits(prefs);
  const next = (bits & bit) !== 0 ? (bits & ~bit) : (bits | bit);
  return { ...prefs, weight_education: DEALBREAKER_OFFSET + next };
}

// Weight given to any dimension marked a deal breaker (including political lean's own
// weight_safety flag) — dominant enough to genuinely swing the score, higher than the normal
// importance dial's own "Very important" tier so the two remain meaningfully different even if
// both happen to be set at once.
export const DEALBREAKER_WEIGHT = 90;

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
        'weight_safety', 'weight_connectivity', 'weight_education',
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
