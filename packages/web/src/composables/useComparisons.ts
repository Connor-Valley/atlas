import { ref } from 'vue';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface SavedComparison {
  id: string;
  user_id: string;
  state_a: string;
  city_a: string;
  city_name_a: string;
  state_b: string;
  city_b: string;
  city_name_b: string;
  created_at: string;
}

const savedComparisons = ref<SavedComparison[]>([]);
const loaded = ref(false);

export function useComparisons() {
  const { user } = useAuth();

  async function fetchComparisons() {
    if (!user.value) {
      savedComparisons.value = [];
      loaded.value = true;
      return;
    }
    const { data, error } = await supabase
      .from('saved_comparisons')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      savedComparisons.value = data;
    }
    loaded.value = true;
  }

  async function addComparison(
    cityA: string, cityNameA: string, stateA: string,
    cityB: string, cityNameB: string, stateB: string,
  ) {
    if (!user.value) return;
    const { data, error } = await supabase
      .from('saved_comparisons')
      .insert({
        user_id: user.value.id,
        state_a: stateA, city_a: cityA, city_name_a: cityNameA,
        state_b: stateB, city_b: cityB, city_name_b: cityNameB,
      })
      .select()
      .single();
    if (!error && data) {
      savedComparisons.value.unshift(data);
    }
  }

  async function removeComparison(cityA: string, stateA: string, cityB: string, stateB: string) {
    if (!user.value) return;
    const { error } = await supabase
      .from('saved_comparisons')
      .delete()
      .eq('city_a', cityA)
      .eq('state_a', stateA)
      .eq('city_b', cityB)
      .eq('state_b', stateB);
    if (!error) {
      savedComparisons.value = savedComparisons.value.filter(
        c => !(c.city_a === cityA && c.state_a === stateA && c.city_b === cityB && c.state_b === stateB)
      );
    }
  }

  function isComparisonSaved(cityA: string, stateA: string, cityB: string, stateB: string) {
    return savedComparisons.value.some(
      c => c.city_a === cityA && c.state_a === stateA && c.city_b === cityB && c.state_b === stateB
    );
  }

  return { savedComparisons, loaded, fetchComparisons, addComparison, removeComparison, isComparisonSaved };
}
