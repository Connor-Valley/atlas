import { ref } from 'vue';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface Favorite {
  id: string;
  user_id: string;
  state: string;
  city: string;
  city_name: string;
  created_at: string;
}

const favorites = ref<Favorite[]>([]);
const loaded = ref(false);

export function useFavorites() {
  const { user } = useAuth();

  async function fetchFavorites() {
    if (!user.value) {
      favorites.value = [];
      loaded.value = true;
      return;
    }
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      favorites.value = data;
    }
    loaded.value = true;
  }

  async function addFavorite(city: string, cityName: string, state: string) {
    if (!user.value) return;
    const { data, error } = await supabase
      .from('favorites')
      .insert({ user_id: user.value.id, city, city_name: cityName, state })
      .select()
      .single();
    if (!error && data) {
      favorites.value.unshift(data);
    }
  }

  async function removeFavorite(city: string, state: string) {
    if (!user.value) return;
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('city', city)
      .eq('state', state);
    if (!error) {
      favorites.value = favorites.value.filter(
        f => !(f.city === city && f.state === state)
      );
    }
  }

  function isFavorited(city: string, state: string) {
    return favorites.value.some(f => f.city === city && f.state === state);
  }

  return { favorites, loaded, fetchFavorites, addFavorite, removeFavorite, isFavorited };
}
