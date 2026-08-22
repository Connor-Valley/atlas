import { ref } from 'vue';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface RecentSearch {
  id: string;
  user_id: string;
  state: string;
  city: string;
  city_name: string;
  created_at: string;
}

const MAX_RECENT = 10;

const recentSearches = ref<RecentSearch[]>([]);
const loaded = ref(false);

export function useRecentSearches() {
  const { user } = useAuth();

  async function fetchRecentSearches() {
    if (!user.value) {
      recentSearches.value = [];
      loaded.value = true;
      return;
    }
    const { data, error } = await supabase
      .from('recent_searches')
      .select('*')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      const seen = new Set<string>();
      const deduped: RecentSearch[] = [];
      for (const row of data as RecentSearch[]) {
        const key = `${row.state}:${row.city}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(row);
        if (deduped.length >= MAX_RECENT) break;
      }
      recentSearches.value = deduped;
    }
    loaded.value = true;
  }

  async function recordRecentSearch(city: string, state: string) {
    if (!user.value) return;
    const stateCode = state.toUpperCase();
    const cityName = city.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const { data, error } = await supabase
      .from('recent_searches')
      .insert({ user_id: user.value.id, city, city_name: cityName, state: stateCode })
      .select()
      .single();
    if (!error && data) {
      recentSearches.value = [
        data,
        ...recentSearches.value.filter(r => !(r.city === city && r.state === stateCode)),
      ].slice(0, MAX_RECENT);
    }
  }

  async function removeRecentSearch(id: string) {
    if (!user.value) return;
    const { error } = await supabase.from('recent_searches').delete().eq('id', id);
    if (!error) {
      recentSearches.value = recentSearches.value.filter(r => r.id !== id);
    }
  }

  async function clearRecentSearches() {
    if (!user.value) return;
    const { error } = await supabase.from('recent_searches').delete().eq('user_id', user.value.id);
    if (!error) {
      recentSearches.value = [];
    }
  }

  return { recentSearches, loaded, fetchRecentSearches, recordRecentSearch, removeRecentSearch, clearRecentSearches };
}
