import { ref } from 'vue';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { ProfileVisibility } from '../lib/profilePrivacy';

export type UserProfile = {
  id: string;
  username: string;
  display_name: string;
  profile_visibility: ProfileVisibility;
};

const user    = ref<User | null>(null);
const profile = ref<UserProfile | null>(null);
const loading = ref(true);

async function loadProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, profile_visibility')
    .eq('id', userId)
    .maybeSingle();
  profile.value = data ?? null;
}

supabase.auth.getSession().then(async ({ data }) => {
  user.value = data.session?.user ?? null;
  if (user.value) await loadProfile(user.value.id);
  loading.value = false;
});

supabase.auth.onAuthStateChange((_event, session) => {
  user.value = session?.user ?? null;
  if (user.value) loadProfile(user.value.id);
  else profile.value = null;
});

export function useAuth() {
  const displayName = () =>
    (user.value?.user_metadata?.full_name as string | undefined) ??
    profile.value?.display_name;

  async function signUp(
    email: string,
    password: string,
    name: string,
    username: string,
    profileVisibility: ProfileVisibility = 'public',
    captchaToken?: string,
  ) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          username: username.toLowerCase().trim(),
          profile_visibility: profileVisibility,
        },
        captchaToken,
      },
    });
    if (error) throw error;
  }

  async function signIn(email: string, password: string, captchaToken?: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function reauthenticate() {
    const { error } = await supabase.auth.reauthenticate();
    if (error) throw error;
  }

  async function updateDisplayName(name: string) {
    const trimmed = name.trim();
    const { data, error } = await supabase.auth.updateUser({ data: { full_name: trimmed } });
    if (error) throw error;
    if (data.user) user.value = data.user;
    if (user.value) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ display_name: trimmed })
        .eq('id', user.value.id);
      if (!profileError && profile.value) profile.value = { ...profile.value, display_name: trimmed };
    }
  }

  async function updateUsername(username: string) {
    if (!user.value) throw new Error('Not signed in.');
    const cleaned = username.toLowerCase().trim();
    const displayNameValue = profile.value?.display_name ?? (user.value.user_metadata?.full_name as string | undefined) ?? '';
    const { error } = await supabase.from('profiles').upsert({
      id: user.value.id,
      username: cleaned,
      display_name: displayNameValue,
    });
    if (error) {
      if (error.code === '23505') throw new Error('That username is already taken.');
      throw error;
    }
    profile.value = {
      id: user.value.id,
      username: cleaned,
      display_name: displayNameValue,
      profile_visibility: profile.value?.profile_visibility ?? 'public',
    };
  }

  async function updateProfileVisibility(profileVisibility: ProfileVisibility) {
    if (!user.value) throw new Error('Not signed in.');
    const { error } = await supabase
      .from('profiles')
      .update({ profile_visibility: profileVisibility })
      .eq('id', user.value.id);
    if (error) throw error;
    if (profile.value) profile.value = { ...profile.value, profile_visibility: profileVisibility };
  }

  async function checkUsernameAvailable(username: string): Promise<boolean> {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase().trim())
      .maybeSingle();
    return !data;
  }

  async function updatePassword(password: string, nonce?: string) {
    const { data, error } = await supabase.auth.updateUser(
      nonce ? { password, nonce } : { password }
    );
    if (error) throw error;
    if (data.user) user.value = data.user;
  }

  return {
    user,
    profile,
    loading,
    displayName,
    signUp,
    signIn,
    signOut,
    reauthenticate,
    updateDisplayName,
    updateUsername,
    updateProfileVisibility,
    checkUsernameAvailable,
    updatePassword,
  };
}
