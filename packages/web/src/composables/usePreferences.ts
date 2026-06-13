import { ref } from 'vue';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface UserPreferences {
  // Existing (kept for DB compat)
  persona_id: string;
  weight_affordability: number;
  weight_job_market: number;
  weight_opportunity: number;
  weight_connectivity: number;
  weight_lifestyle: number;

  // New weight sliders
  weight_climate: number;
  weight_education: number;
  weight_lifestyle_vibrancy: number;
  weight_safety: number;

  // Preference modifiers
  climate_preference: 'warm' | 'mild' | 'four_seasons' | 'cool' | 'any';
  political_preference_enabled: boolean;
  political_preference: number; // -100 to +100
}

const DEFAULT_PREFERENCES: UserPreferences = {
  persona_id: 'balanced',
  weight_affordability: 20,
  weight_job_market: 20,
  weight_opportunity: 20,
  weight_connectivity: 20,
  weight_lifestyle: 20,
  weight_climate: 20,
  weight_education: 15,
  weight_lifestyle_vibrancy: 15,
  weight_safety: 0,
  climate_preference: 'any',
  political_preference_enabled: false,
  political_preference: 0,
};

const preferences = ref<UserPreferences>({ ...DEFAULT_PREFERENCES });
const loaded = ref(false);

export function usePreferences() {
  const { user } = useAuth();

  async function fetchPreferences() {
    if (!user.value) {
      preferences.value = { ...DEFAULT_PREFERENCES };
      loaded.value = true;
      return;
    }
    const { data, error } = await supabase
      .from('user_preferences')
      .select('persona_id, weight_affordability, weight_job_market, weight_opportunity, weight_connectivity, weight_lifestyle, weight_climate, weight_education, weight_lifestyle_vibrancy, weight_safety, climate_preference, political_preference_enabled, political_preference')
      .eq('user_id', user.value.id)
      .maybeSingle();
    if (!error && data) {
      preferences.value = { ...DEFAULT_PREFERENCES, ...data };
    }
    loaded.value = true;
  }

  async function savePreferences(updates: UserPreferences) {
    if (!user.value) return;
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.value.id,
        ...updates,
        updated_at: new Date().toISOString(),
      });
    if (!error) {
      preferences.value = updates;
    }
  }

  return { preferences, loaded, fetchPreferences, savePreferences };
}
