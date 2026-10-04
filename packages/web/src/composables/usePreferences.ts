import { ref } from 'vue';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface UserPreferences {
  // Quiz answers — drive both weights and sub-preference signals. The five "type" questions
  // (climate, job market, lifestyle, opportunity, connectivity) are multi-select: a user can pick
  // more than one acceptable option and a city matching ANY of them scores as a full match (see
  // lookupMatchScore / evaluateOpportunityMatch in atlasScore.ts). affordability_preference and
  // air_quality_priority stay single-value — they're importance-level dials in disguise
  // (cost_low/medium/high, low/medium/high), not "type" choices, so multi-select doesn't apply.
  // political_lean_preference also stays single-value (explicitly out of scope).
  // Nine distinct climate archetypes rather than a coarser split — dry desert heat (hot_dry)
  // reads differently from humid Gulf Coast heat (hot_humid); a sunny, stable Mediterranean
  // climate (sunny_mild, e.g. LA/San Diego) is distinct from a foggy, minimal-swing coastal one
  // (misty, e.g. San Francisco), which is distinct from a cooler, real-rain real-snow Pacific
  // climate (cool_wet, e.g. Seattle); a dry, sunny, snowy Rocky Mountain winter (mountain_snow,
  // e.g. Denver) is distinct from a wet Midwest/Northeast one with the same hot-summer/cold-winter
  // swing (four_seasons, e.g. Chicago), which is distinct from the Southeast's milder version of
  // that same swing, without the hard freezes (mild_seasons, e.g. Atlanta); and a warm-but-not-hot,
  // humid coastal climate (humid_coast, e.g. Charleston) is distinct from both the drier warmth of
  // sunny_mild and the more consistent heat of hot_humid. See cityClimateChar in atlasScore.ts.
  climate_preference: Array<
    | 'hot_dry' | 'mountain_snow' | 'four_seasons' | 'mild_seasons' | 'hot_humid'
    | 'humid_coast' | 'sunny_mild' | 'misty' | 'cool_wet' | 'any'
  >;
  affordability_preference: 'cost_high' | 'cost_medium' | 'cost_low';
  job_market_preference:   Array<'high_earning' | 'stable' | 'growth' | 'remote' | 'any'>;
  lifestyle_preference:    Array<'urban' | 'urban_edge' | 'suburban' | 'nature' | 'any'>;
  opportunity_preference: Array<
    | 'tech_media_pro' | 'corporate_finance' | 'manufacturing' | 'construction_trades'
    | 'transportation_logistics' | 'education_healthcare' | 'government_services' | 'retail'
    | 'hospitality_arts' | 'agriculture' | 'nonprofit' | 'any'
  >;
  air_quality_priority:    'high' | 'medium' | 'low';
  connectivity_preference: Array<'walkable' | 'balanced' | 'car' | 'airport' | 'any'>;
  political_lean_preference: 'progressive' | 'conservative' | 'open' | 'not_a_factor';

  // Weights double as the "how much should this count" importance dial — the UI writes a
  // low/medium/high preset straight into these instead of storing a separate importance choice,
  // so no schema change was needed to add per-dimension importance. Air quality and affordability
  // are the exceptions: both only ever have one "good" direction (cleaner air, lower cost), so
  // their quiz answer IS an importance dial (not a "type" choice) — their weights get derived
  // from that field below rather than set directly by the UI.
  weight_affordability:     number;
  weight_job_market:        number;
  weight_climate:           number;
  weight_opportunity:       number;
  weight_lifestyle_vibrancy: number;
  weight_air_quality:       number;
  weight_safety:            number;
  weight_connectivity:      number;
  // Bitmask of which dimensions are marked a "deal breaker" — stored independently of the
  // importance dial above (picking "Very important" does NOT imply deal breaker), but marking a
  // deal breaker DOES push that dimension's importance dial to "high" (see toggleDealbreaker in
  // PreferencesSetup.vue), so the two don't visually contradict each other. Repurposes
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
  climate_preference:       ['any'],
  affordability_preference: 'cost_medium',
  job_market_preference:    ['any'],
  lifestyle_preference:     ['any'],
  opportunity_preference:   ['any'],
  air_quality_priority:     'medium',
  connectivity_preference:  ['any'],
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
  'weight_job_market', 'weight_climate',
  'weight_lifestyle_vibrancy', 'weight_connectivity', 'weight_opportunity',
  'weight_safety', // repurposed as "political lean is a deal breaker" — see computeAtlasScore
  'weight_education', // repurposed as the deal-breaker bitmask for the other 7 dimensions
];

// The five multi-select "type" questions store arrays, so a plain `!==` against
// DEFAULT_PREFERENCES (reference equality) would always read as "changed" even when both are
// `['any']`. Compare contents instead — order doesn't carry meaning here.
function prefValueChanged(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return true;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.some((v, i) => v !== sortedB[i]);
  }
  return a !== b;
}

// A preferences object that merely EXISTS (e.g. `{ ...DEFAULT_PREFERENCES }` after a reset, or
// the fallback used before any row has loaded) isn't the same as a user having actually chosen
// anything — every quiz answer being left at its default is indistinguishable from "no
// preferences at all" and should be treated that way everywhere personalization is decided
// (the Atlas Score card, the "Personalized" badge, etc.), not just on the profile quiz itself.
export function hasRealPreferences(prefs: UserPreferences | null | undefined): boolean {
  if (!prefs) return false;
  return QUIZ_ANSWER_KEYS.some((k) => prefValueChanged(prefs[k], DEFAULT_PREFERENCES[k]));
}

// Which quiz fields let a user pick more than one acceptable option — a city matching ANY
// selected value counts as a full match for that dimension (see lookupMatchScore /
// evaluateOpportunityMatch in atlasScore.ts). affordability_preference and air_quality_priority
// are excluded even though they're quiz options: both are importance-level dials in disguise
// (cost_low/medium/high, low/medium/high), not "type" choices. political_lean_preference is
// excluded too, explicitly out of scope.
export const MULTI_SELECT_KEYS = new Set<keyof UserPreferences>([
  'climate_preference', 'job_market_preference', 'lifestyle_preference',
  'opportunity_preference', 'connectivity_preference',
]);

// Toggles `value` in/out of a multi-select preference array. Selecting "any" clears every other
// selection (it means the same thing as selecting all of them); selecting a specific option
// un-checks "any". Never leaves a question with zero selections — removing the last selected
// value falls back to "any" rather than an empty array.
export function toggleMultiSelectValue(current: string[], value: string): string[] {
  if (value === 'any') return ['any'];
  const withoutAny = current.filter((v) => v !== 'any');
  const next = withoutAny.includes(value)
    ? withoutAny.filter((v) => v !== value)
    : [...withoutAny, value];
  return next.length ? next : ['any'];
}

// A row saved before the multi-select migration ran (or by an old cached client) still has these
// columns as a plain scalar string rather than an array. Without this guard, a stale value like
// "urban_edge" would get duck-typed as an array everywhere downstream — JS's shared `.includes()`
// method "works" on a string too, but as a SUBSTRING check, so "urban_edge".includes('urban')
// is true and both "City energy" and "Urban edge" would silently show as selected — and
// toggleMultiSelectValue's `.filter()` call throws outright, since a string has no `.filter`,
// which is what breaks clicking any option. Coerce defensively right where fetched data enters.
function normalizeFetchedRow(data: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...data };
  for (const key of MULTI_SELECT_KEYS) {
    const raw = normalized[key];
    if (!Array.isArray(raw)) {
      normalized[key] = typeof raw === 'string' && raw ? [raw] : ['any'];
    }
  }
  const climate = normalized.climate_preference;
  if (Array.isArray(climate)) {
    normalized.climate_preference = climate.map((v) => LEGACY_CLIMATE_MAP[v as string] ?? v);
  }
  return normalized;
}

// climate_preference used to be a coarser warm/mild/cool split — remap a previously-saved value
// to its closest equivalent under the new 6-archetype taxonomy (see the UserPreferences comment
// above) so an existing selection keeps meaning something instead of silently no longer matching
// any quiz option.
const LEGACY_CLIMATE_MAP: Record<string, string> = {
  warm: 'hot_humid',
  mild: 'sunny_mild',
  cool: 'cool_wet',
};

// ── Deal breakers ──────────────────────────────────────────────────────────────
// Stored independently of the importance dial (weight_affordability etc.) and of political lean's
// own weight_safety flag — a separate on/off per dimension, packed into one bitmask so no new
// column was needed. Any dimension can be marked a deal breaker regardless of its importance
// tier, though PreferencesSetup.vue's toggleDealbreaker bumps the tier to "high" the moment a
// dimension is marked, so the two stay visually consistent going forward.

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

/** Derive weight_air_quality, weight_affordability, and political settings from quiz answers.
 *  Every other weight_* field is written directly by the importance dial in the UI, so it just
 *  passes through unchanged via the `...prefs` spread below. */
export function deriveWeightsFromQuiz(prefs: UserPreferences): UserPreferences {
  const AIR_QUALITY: Record<string, number> = {
    high: 80, medium: 18, low: 8,
  };
  const AFFORDABILITY: Record<string, number> = {
    cost_high: 80, cost_medium: 18, cost_low: 8,
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
    weight_affordability: AFFORDABILITY[prefs.affordability_preference] ?? 18,
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
      preferences.value = { ...DEFAULT_PREFERENCES, ...normalizeFetchedRow(data) };
    }
    loaded.value        = true;
    loadedForUser.value = userId;
  }

  // Returns whether the write actually succeeded — callers must check this before treating the
  // save as done. A failed upsert (e.g. a schema/type mismatch) used to be swallowed here with no
  // signal at all, so the UI showed "Saved!" and switched to the read-only view even though
  // nothing was persisted, which reads as real data loss on the next visit/refresh.
  async function savePreferences(updates: UserPreferences): Promise<{ success: boolean; error?: string }> {
    if (!user.value) return { success: false, error: 'Not signed in.' };
    const derived = deriveWeightsFromQuiz(updates);
    const payload = {
      user_id: user.value.id,
      ...derived,
      updated_at: new Date().toISOString(),
    };
    // .select() forces PostgREST to return the row it actually persisted, so a mismatch between
    // what was sent and what's now stored (e.g. a column whose real type doesn't match what the
    // client assumes) surfaces here instead of silently diverging until the next fetch.
    // TEMPORARY diagnostic logging — printed as a plain string (not a collapsible object) so it's
    // fully visible in a screenshot with nothing to click or expand. Remove once the multi-select
    // save issue is confirmed fixed.
    console.log('[savePreferences] sending:\n' + JSON.stringify(payload, null, 2));
    const { data: written, error } = await supabase
      .from('user_preferences')
      .upsert(payload)
      .select();
    console.log('[savePreferences] result:\n' + JSON.stringify({ error, written }, null, 2));
    if (error) {
      return { success: false, error: error.message };
    }
    preferences.value = derived;
    return { success: true };
  }

  return { preferences, loaded, loadedForUser, fetchPreferences, savePreferences };
}
