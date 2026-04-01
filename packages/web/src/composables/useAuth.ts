import { ref } from 'vue';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const user    = ref<User | null>(null);
const loading = ref(true);

supabase.auth.getSession().then(({ data }) => {
  user.value    = data.session?.user ?? null;
  loading.value = false;
});

supabase.auth.onAuthStateChange((_event, session) => {
  user.value = session?.user ?? null;
});

export function useAuth() {
  const displayName = () => user.value?.user_metadata?.full_name as string | undefined;

  async function signUp(email: string, password: string, name: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw error;
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { user, loading, displayName, signUp, signIn, signOut };
}
