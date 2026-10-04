import { ref } from 'vue';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface SavedComparisonCity {
  slot: number;
  state: string;
  city: string;
  city_name: string;
}

export interface SavedComparison {
  id: string;
  user_id: string;
  created_at: string;
  cities: SavedComparisonCity[];
}

const savedComparisons = ref<SavedComparison[]>([]);
const loaded = ref(false);

function sortCities(row: any): SavedComparison {
  return {
    id: row.id,
    user_id: row.user_id,
    created_at: row.created_at,
    cities: [...(row.saved_comparison_cities ?? [])].sort((a, b) => a.slot - b.slot),
  };
}

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
      .select('id, user_id, created_at, saved_comparison_cities(slot, state, city, city_name)')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      savedComparisons.value = data.map(sortCities);
    }
    loaded.value = true;
  }

  async function addComparison(cities: { state: string; city: string; cityName: string }[]) {
    if (!user.value || cities.length < 2) return;

    const { data: comparison, error } = await supabase
      .from('saved_comparisons')
      .insert({ user_id: user.value.id })
      .select()
      .single();
    if (error || !comparison) return;

    const { error: citiesError } = await supabase.from('saved_comparison_cities').insert(
      cities.map((c, i) => ({
        comparison_id: comparison.id,
        slot: i + 1,
        state: c.state,
        city: c.city,
        city_name: c.cityName,
      })),
    );
    if (citiesError) {
      await supabase.from('saved_comparisons').delete().eq('id', comparison.id);
      return;
    }

    savedComparisons.value.unshift({
      id: comparison.id,
      user_id: comparison.user_id,
      created_at: comparison.created_at,
      cities: cities.map((c, i) => ({ slot: i + 1, state: c.state, city: c.city, city_name: c.cityName })),
    });
  }

  function matches(saved: SavedComparisonCity[], cities: { state: string; city: string }[]) {
    if (saved.length !== cities.length) return false;
    return saved.every((s, i) => s.state === cities[i].state && s.city === cities[i].city);
  }

  async function removeComparison(cities: { state: string; city: string }[]) {
    if (!user.value) return;
    const target = savedComparisons.value.find((c) => matches(c.cities, cities));
    if (!target) return;

    const { error } = await supabase.from('saved_comparisons').delete().eq('id', target.id);
    if (!error) {
      savedComparisons.value = savedComparisons.value.filter((c) => c.id !== target.id);
    }
  }

  function isComparisonSaved(cities: { state: string; city: string }[]) {
    return savedComparisons.value.some((c) => matches(c.cities, cities));
  }

  return { savedComparisons, loaded, fetchComparisons, addComparison, removeComparison, isComparisonSaved };
}
