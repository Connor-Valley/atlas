<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import DashboardHeader from '../components/DashboardHeader.vue';
import PreferencesSetup from '../components/PreferencesSetup.vue';
import { usePreferences, hasRealPreferences } from '../composables/usePreferences';
import { useAuth } from '../composables/useAuth';
import { useAuthModal } from '../composables/useAuthModal';
import { useFavorites } from '../composables/useFavorites';
import { useComparisons } from '../composables/useComparisons';
import { buildCompareUrl } from '../lib/compare';
import { useFriends } from '../composables/useFriends';
import { useRecentSearches } from '../composables/useRecentSearches';
import { PROFILE_VISIBILITY_OPTIONS, getProfileVisibilityMeta, type ProfileVisibility } from '../lib/profilePrivacy';

const router = useRouter();
const { recordRecentSearch } = useRecentSearches();

function onHeaderSearch(payload: { city: string; state: string }) {
  void recordRecentSearch(payload.city, payload.state);
  router.push(`/city/${payload.state}/${payload.city}`);
}

const { user, profile, loading: authLoading, displayName, signOut, reauthenticate, updateDisplayName, updatePassword, updateUsername, updateProfileVisibility, checkUsernameAvailable } = useAuth();
const { favorites, fetchFavorites } = useFavorites();
const { savedComparisons, fetchComparisons } = useComparisons();
const { friends, fetchAll: fetchFriends } = useFriends();
const { preferences, loaded: preferencesLoaded, fetchPreferences } = usePreferences();

// Wait for auth to finish restoring the session before treating `user.value === null` as
// "not logged in" — on a fresh page load it starts null while the Supabase session is still
// being read from storage, and firing fetchPreferences() on that transient null permanently
// locks preferences to defaults before the real session (and real user) ever resolves.
watch([user, authLoading], ([, isAuthLoading]) => {
  if (!isAuthLoading) fetchPreferences();
}, { immediate: true });

const { openAuthModal } = useAuthModal();

// Atlas Score card starts collapsed once you've already set real preferences — otherwise
// the quiz cover (and everything below it on the page) buries the rest of the profile below
// the fold every time you visit. Stays expanded (or re-expands) for anyone still on the
// "make your preferences" cover state. Only auto-set until the user manually toggles it once.
const atlasExpanded = ref(false);
const atlasUserToggled = ref(false);
watch(preferencesLoaded, (isLoaded) => {
  if (isLoaded && !atlasUserToggled.value) {
    atlasExpanded.value = !hasRealPreferences(preferences.value);
  }
}, { immediate: true });

function toggleAtlasSection() {
  atlasUserToggled.value = true;
  atlasExpanded.value = !atlasExpanded.value;
}

function handlePreferencesSaved() {
  atlasUserToggled.value = true;
  atlasExpanded.value = false;
}

// The router guard already keeps signed-out visitors from ever landing here (it cancels the
// navigation and pops the shared sign-in modal on whatever page they were on). This only fires
// if a session drops out from under someone already sitting on this page.
watch([user, authLoading], ([currentUser, isAuthLoading]) => {
  if (!isAuthLoading && !currentUser) openAuthModal('login');
});

type SettingsActionId = 'name' | 'password' | 'username';

const userInitial = computed(() => (displayName() ?? user.value?.email ?? 'A')[0].toUpperCase());
const memberSince = computed(() => {
  if (!user.value?.created_at) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(user.value.created_at));
});

const recentFavorites = computed(() => favorites.value.slice(0, 3));
const recentComparisons = computed(() => savedComparisons.value.slice(0, 3));

const settingsActions: Array<{
  id: SettingsActionId;
  title: string;
  subtitle: string;
  mobileSubtitle: string;
  icon: string;
}> = [
  {
    id: 'name',
    title: 'Edit display name',
    subtitle: 'Update the name shown across your account',
    mobileSubtitle: 'Your public display name',
    icon: 'mdi-account-edit-outline',
  },
  {
    id: 'username',
    title: 'Edit username',
    subtitle: 'Change your @username used to find friends',
    mobileSubtitle: 'Your @username for friends',
    icon: 'mdi-at',
  },
  {
    id: 'password',
    title: 'Change password',
    subtitle: 'Set a new password for future sign-ins',
    mobileSubtitle: 'Update your sign-in password',
    icon: 'mdi-lock-reset',
  },
];

const activeSettingsAction = ref<SettingsActionId | null>(null);
const nameInput = ref('');
const usernameInput = ref('');
const passwordInput = ref('');
const passwordConfirm = ref('');
const passwordNonce = ref('');
const passwordCodeSent = ref(false);
const settingsError = ref<string | null>(null);
const settingsSuccess = ref<string | null>(null);
const settingsLoading = ref(false);
const visibilityDropdownOpen = ref(false);
const visibilityLoading = ref(false);
const visibilityControl = ref<HTMLElement | null>(null);
const visibilityMeta = computed(() => getProfileVisibilityMeta(profile.value?.profile_visibility ?? 'public'));


watch(
  () => user.value?.user_metadata?.full_name,
  (name) => {
    nameInput.value = (name as string | undefined) ?? '';
  },
  { immediate: true },
);

watch(
  () => profile.value?.username,
  (u) => {
    usernameInput.value = u ?? '';
  },
  { immediate: true },
);

watch(
  () => profile.value?.profile_visibility,
  () => {
    visibilityDropdownOpen.value = false;
  },
  { immediate: true },
);

watch(
  () => user.value?.id,
  async (userId) => {
    if (!userId) return;
    await Promise.all([fetchFavorites(), fetchComparisons(), fetchFriends()]);
  },
  { immediate: true },
);

function goBack() {
  router.back();
}

async function handleSignOut() {
  await signOut();
  router.push({ name: 'home' });
}

function selectSettingsAction(actionId: SettingsActionId) {
  activeSettingsAction.value = actionId;
  settingsError.value = null;
  settingsSuccess.value = null;
  passwordInput.value = '';
  passwordConfirm.value = '';
  passwordNonce.value = '';
  passwordCodeSent.value = false;
  // Pre-fill username from current profile
  if (actionId === 'username') usernameInput.value = profile.value?.username ?? '';
}

function closeSettingsModal() {
  activeSettingsAction.value = null;
  settingsError.value = null;
  settingsSuccess.value = null;
  passwordInput.value = '';
  passwordConfirm.value = '';
  passwordNonce.value = '';
  passwordCodeSent.value = false;
}

function toggleVisibilityDropdown() {
  visibilityDropdownOpen.value = !visibilityDropdownOpen.value;
}

function closeVisibilityDropdown() {
  visibilityDropdownOpen.value = false;
}

async function handleNameUpdate() {
  settingsError.value = null;
  settingsSuccess.value = null;

  const trimmedName = nameInput.value.trim();
  if (!trimmedName) {
    settingsError.value = 'Please enter a display name.';
    return;
  }

  settingsLoading.value = true;
  try {
    await updateDisplayName(trimmedName);
    settingsSuccess.value = 'Display name updated.';
    closeSettingsModal();
  } catch (err: any) {
    settingsError.value = err?.message ?? 'Unable to update your display name.';
  } finally {
    settingsLoading.value = false;
  }
}

async function handlePasswordUpdate() {
  settingsError.value = null;
  settingsSuccess.value = null;

  if (!passwordCodeSent.value) {
    settingsError.value = 'Send a verification code first.';
    return;
  }

  if (!passwordNonce.value.trim()) {
    settingsError.value = 'Enter the verification code from your email.';
    return;
  }

  if (passwordInput.value.length < 6) {
    settingsError.value = 'Password must be at least 6 characters.';
    return;
  }

  if (passwordInput.value !== passwordConfirm.value) {
    settingsError.value = 'Passwords do not match.';
    return;
  }

  settingsLoading.value = true;
  try {
    await updatePassword(passwordInput.value, passwordNonce.value.trim());
    passwordInput.value = '';
    passwordConfirm.value = '';
    closeSettingsModal();
  } catch (err: any) {
    settingsError.value = err?.message ?? 'Unable to update your password.';
  } finally {
    settingsLoading.value = false;
  }
}

async function handleUsernameUpdate() {
  settingsError.value = null;
  settingsSuccess.value = null;

  const cleaned = usernameInput.value.toLowerCase().trim();
  if (!cleaned) { settingsError.value = 'Please enter a username.'; return; }
  if (!/^[a-z0-9_]{3,20}$/.test(cleaned)) {
    settingsError.value = 'Username must be 3–20 characters: letters, numbers, and underscores only.';
    return;
  }
  if (cleaned === profile.value?.username) { closeSettingsModal(); return; }

  settingsLoading.value = true;
  try {
    const available = await checkUsernameAvailable(cleaned);
    if (!available) { settingsError.value = 'That username is already taken.'; return; }
    await updateUsername(cleaned);
    closeSettingsModal();
  } catch (err: any) {
    settingsError.value = err?.message ?? 'Unable to update your username.';
  } finally {
    settingsLoading.value = false;
  }
}

async function sendPasswordVerificationCode() {
  settingsError.value = null;
  settingsSuccess.value = null;
  settingsLoading.value = true;
  try {
    await reauthenticate();
    passwordCodeSent.value = true;
    settingsSuccess.value = 'Verification code sent. Check your email and enter the code below.';
  } catch (err: any) {
    settingsError.value = err?.message ?? 'Unable to send a verification code.';
  } finally {
    settingsLoading.value = false;
  }
}

async function selectVisibility(profileVisibility: ProfileVisibility) {
  if (visibilityLoading.value || profile.value?.profile_visibility === profileVisibility) {
    visibilityDropdownOpen.value = false;
    return;
  }
  visibilityLoading.value = true;
  try {
    await updateProfileVisibility(profileVisibility);
    visibilityDropdownOpen.value = false;
  } finally {
    visibilityLoading.value = false;
  }
}

function handleDocumentClick(event: MouseEvent) {
  if (!visibilityDropdownOpen.value) return;
  const target = event.target as Node | null;
  if (visibilityControl.value && target && !visibilityControl.value.contains(target)) {
    closeVisibilityDropdown();
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<template>
  <div class="profile-page">
    <div class="container container--header-only">
      <DashboardHeader page-label="Profile" @logo-click="router.push({ name: 'search' })" @search="onHeaderSearch" />
    </div>

    <div class="profile-page__heading">
      <h1 class="profile-page__title">
        <span class="mdi mdi-account-circle profile-page__title-icon"></span>
        Profile
      </h1>
      <button class="breadcrumb" @click="goBack">
        <span class="breadcrumb__arr breadcrumb__arr--1 mdi mdi-arrow-left"></span>
        <span class="breadcrumb__text">Back</span>
        <span class="breadcrumb__arr breadcrumb__arr--2 mdi mdi-arrow-left"></span>
        <span class="breadcrumb__circle"></span>
      </button>
    </div>

    <div v-if="!user" class="profile-empty"></div>

    <div v-else class="profile-layout">
      <section class="profile-card profile-card--hero">
        <div class="profile-card__hero-top">
          <div class="profile-card__identity">
            <div class="profile-card__avatar">{{ userInitial }}</div>
            <div class="profile-card__identity-copy">
              <p class="profile-card__eyebrow">Atlas account</p>
              <div class="profile-card__name-row">
                <h2 class="profile-card__name">{{ displayName() ?? 'Account' }}</h2>
                <span v-if="profile" class="profile-card__username">@{{ profile.username }}</span>
              </div>
            </div>
          </div>

          <div class="profile-hero-actions">
            <div ref="visibilityControl" class="profile-visibility-control" @keydown.esc="closeVisibilityDropdown">
              <button
                class="profile-visibility-btn"
                :aria-expanded="visibilityDropdownOpen"
                aria-haspopup="true"
                @click="toggleVisibilityDropdown"
              >
                <span class="mdi" :class="visibilityMeta.icon"></span>
                <span class="profile-visibility-btn__copy">
                  <span class="profile-visibility-btn__label-row">
                    <span class="profile-visibility-btn__label">Visibility</span>
                  </span>
                  <span class="profile-visibility-btn__value">{{ visibilityMeta.label }}</span>
                </span>
                <span class="mdi" :class="visibilityDropdownOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'"></span>
              </button>

              <div v-if="visibilityDropdownOpen" class="profile-visibility-menu">
                <button
                  v-for="option in PROFILE_VISIBILITY_OPTIONS"
                  :key="option.value"
                  type="button"
                  class="profile-visibility-option"
                  :class="{ 'profile-visibility-option--active': profile?.profile_visibility === option.value }"
                  :disabled="visibilityLoading"
                  @click="selectVisibility(option.value)"
                >
                  <span class="mdi profile-visibility-option__icon" :class="option.icon"></span>
                  <span class="profile-visibility-option__copy">
                    <span class="profile-visibility-option__title-row">
                      <span class="profile-visibility-option__title">{{ option.label }}</span>
                      <span
                        class="profile-visibility-help profile-visibility-help--option"
                        tabindex="0"
                        :data-tooltip="option.description"
                        @click.stop
                      >
                        <span class="mdi mdi-information-outline"></span>
                      </span>
                    </span>
                  </span>
                  <span
                    class="mdi profile-visibility-option__check"
                    :class="profile?.profile_visibility === option.value ? 'mdi-check-circle' : 'mdi-circle-outline'"
                  ></span>
                </button>
              </div>
            </div>

            <button class="profile-friends-btn" @click="router.push({ name: 'friends' })">
              <span class="mdi mdi-account-group-outline"></span>
              <span>Friends</span>
              <span v-if="friends.length" class="profile-friends-btn__count">{{ friends.length }}</span>
              <span class="mdi mdi-arrow-right"></span>
            </button>

          </div>
        </div>

        <div class="profile-stats">
          <div class="profile-stat">
            <div class="profile-stat__label-row">
              <span class="mdi mdi-star-outline profile-stat__icon"></span>
              <span class="profile-stat__label">Favorites</span>
            </div>
            <span class="profile-stat__value">{{ favorites.length }}</span>
          </div>
          <div class="profile-stat">
            <div class="profile-stat__label-row">
              <span class="mdi mdi-bookmark-multiple-outline profile-stat__icon"></span>
              <span class="profile-stat__label profile-stat__label--desktop">Saved comparisons</span>
              <span class="profile-stat__label profile-stat__label--mobile">Comps</span>
            </div>
            <span class="profile-stat__value">{{ savedComparisons.length }}</span>
          </div>
          <div class="profile-stat">
            <div class="profile-stat__label-row">
              <span class="mdi mdi-calendar-outline profile-stat__icon"></span>
              <span class="profile-stat__label">Member since</span>
            </div>
            <span class="profile-stat__value profile-stat__value--small">{{ memberSince ?? 'Recently' }}</span>
          </div>
        </div>
      </section>

      <!-- Atlas Score feature card -->
      <section class="profile-card profile-card--atlas" :class="{ 'profile-card--atlas-collapsed': !atlasExpanded }">
        <button class="atlas-feature__toggle" :aria-expanded="atlasExpanded" @click="toggleAtlasSection">
          <div class="atlas-feature__header-row">
            <div class="atlas-feature__badge">
              <span class="mdi mdi-map-marker-star-outline atlas-feature__badge-icon"></span>
            </div>
            <div>
              <p class="atlas-feature__eyebrow">Personalized ranking</p>
              <h2 class="atlas-feature__title atlas-feature__title--toggle">Atlas Score</h2>
            </div>
          </div>
          <span class="mdi atlas-feature__chevron" :class="atlasExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"></span>
        </button>

        <div v-if="atlasExpanded" class="atlas-feature__inner">
          <div class="atlas-feature__left">
            <p class="atlas-feature__desc">
              Every city gets a 0–100 match score tailored to your priorities — so you can instantly see which cities fit your life.
            </p>
          </div>

          <div class="atlas-feature__prefs">
            <PreferencesSetup :flat="true" @saved="handlePreferencesSaved" />
          </div>
        </div>
      </section>

      <section class="profile-card">
        <div class="profile-card__header">
          <div>
            <p class="profile-card__eyebrow">Shortcuts</p>
            <h2 class="profile-card__section-title">Jump back in</h2>
            <span class="profile-card__mobile-title">Jump Back In</span>
          </div>
        </div>

        <div class="profile-actions">
          <button class="profile-action" @click="router.push({ name: 'favorites' })">
            <span class="mdi mdi-star-outline profile-action__icon"></span>
            <span class="profile-action__content">
              <span class="profile-action__title">Favorites</span>
              <span class="profile-action__meta">{{ favorites.length }} saved cities</span>
            </span>
          </button>
          <button class="profile-action" @click="router.push({ name: 'saved-comparisons' })">
            <span class="mdi mdi-bookmark-multiple-outline profile-action__icon"></span>
            <span class="profile-action__content">
              <span class="profile-action__title">Saved Comparisons</span>
              <span class="profile-action__meta">{{ savedComparisons.length }} saved matchups</span>
            </span>
          </button>
          <button class="profile-action profile-action--danger" @click="handleSignOut">
            <span class="mdi mdi-logout profile-action__icon"></span>
            <span class="profile-action__content">
              <span class="profile-action__title">Sign out</span>
              <span class="profile-action__meta">End this session on this device</span>
            </span>
          </button>
        </div>
      </section>

      <section class="profile-card profile-card--stretch">
        <div class="profile-card__header">
          <div>
            <p class="profile-card__eyebrow">Recent places</p>
            <h2 class="profile-card__section-title">Latest favorites</h2>
            <span class="profile-card__mobile-title">Recent Favorites</span>
          </div>
        </div>

        <div class="profile-card__stretch">
          <div v-if="recentFavorites.length" class="profile-list">
            <button
              v-for="favorite in recentFavorites"
              :key="favorite.id"
              class="profile-list__item"
              @click="router.push({ name: 'city', params: { city: favorite.city, state: favorite.state } })"
            >
              <span class="profile-list__title">{{ favorite.city_name }}</span>
              <span class="profile-list__meta">{{ favorite.state.toUpperCase() }}</span>
            </button>
          </div>
          <p v-else class="profile-card__empty">No favorite cities yet.</p>
        </div>

        <div class="profile-card__new-btn-row">
          <button class="profile-card__new-btn" @click="router.push({ name: 'home' })">
            <span class="mdi mdi-magnify"></span>
            Search cities
          </button>
        </div>
      </section>

      <section class="profile-card profile-card--stretch">
        <div class="profile-card__header">
          <div>
            <p class="profile-card__eyebrow">Recent comparisons</p>
            <h2 class="profile-card__section-title">Latest matchups</h2>
            <span class="profile-card__mobile-title">Recent Comparisons</span>
          </div>
        </div>

        <div class="profile-card__stretch">
          <div v-if="recentComparisons.length" class="profile-list">
            <button
              v-for="comparison in recentComparisons"
              :key="comparison.id"
              class="profile-list__item"
              @click="router.push(buildCompareUrl(comparison.cities.map((c) => ({ state: c.state, city: c.city }))))"
            >
              <span class="profile-list__title">{{ comparison.cities.map((c) => c.city_name).join(' vs ') }}</span>
              <span class="profile-list__meta">{{ comparison.cities.map((c) => c.state.toUpperCase()).join(' / ') }}</span>
            </button>
          </div>
          <p v-else class="profile-card__empty">No saved comparisons yet.</p>
        </div>

        <div class="profile-card__new-btn-row">
          <button class="profile-card__new-btn" @click="router.push({ name: 'home' })">
            <span class="mdi mdi-plus"></span>
            Compare cities
          </button>
        </div>
      </section>

      <section class="profile-card">
        <div class="profile-card__header">
          <div>
            <p class="profile-card__eyebrow">Account settings</p>
            <h2 class="profile-card__section-title">Manage your profile</h2>
            <span class="profile-card__mobile-title">Manage Profile</span>
          </div>
        </div>

        <div class="profile-settings">
          <button
            v-for="action in settingsActions"
            :key="action.id"
            class="profile-settings__action"
            @click="selectSettingsAction(action.id)"
          >
            <span class="mdi profile-settings__action-icon" :class="action.icon"></span>
            <span class="profile-settings__action-copy">
              <span class="profile-settings__action-title">{{ action.title }}</span>
              <span class="profile-settings__action-subtitle profile-settings__action-subtitle--desktop">{{ action.subtitle }}</span>
              <span class="profile-settings__action-subtitle profile-settings__action-subtitle--mobile">{{ action.mobileSubtitle }}</span>
            </span>
          </button>
        </div>
      </section>
    </div>

    <button class="profile-page__mobile-back" @click="goBack">
      <span class="mdi mdi-arrow-left"></span>
    </button>

    <Teleport to="body">
      <Transition name="industry-modal">
        <div v-if="activeSettingsAction" class="auth-modal__backdrop" @click.self="closeSettingsModal">
          <div class="auth-modal__panel data-card profile-settings-modal">
            <div class="auth-modal__header">
              <span class="auth-modal__title">
                {{
                  activeSettingsAction === 'name'     ? 'Edit display name' :
                  activeSettingsAction === 'username'  ? 'Edit username' :
                  'Change password'
                }}
              </span>
              <button class="industry-modal__close" @click="closeSettingsModal">
                <span class="mdi mdi-close"></span>
              </button>
            </div>

            <form
              v-if="activeSettingsAction === 'username'"
              class="auth-modal__form"
              @submit.prevent="handleUsernameUpdate"
            >
              <div class="auth-modal__field">
                <label class="auth-modal__label" for="profile-username">Username</label>
                <input
                  id="profile-username"
                  v-model="usernameInput"
                  class="auth-modal__input"
                  type="text"
                  placeholder="yourhandle"
                  autocomplete="username"
                  :disabled="settingsLoading"
                />
                <p class="auth-modal__hint">3–20 characters, lowercase letters, numbers, underscores</p>
              </div>

              <p v-if="settingsError" class="auth-modal__error">{{ settingsError }}</p>

              <button class="auth-modal__submit-btn" type="submit" :disabled="settingsLoading">
                {{ settingsLoading ? 'Saving…' : 'Save username' }}
              </button>
            </form>

            <form
              v-else-if="activeSettingsAction === 'name'"
              class="auth-modal__form"
              @submit.prevent="handleNameUpdate"
            >
              <div class="auth-modal__field">
                <label class="auth-modal__label" for="profile-name">Display name</label>
                <input
                  id="profile-name"
                  v-model="nameInput"
                  class="auth-modal__input"
                  type="text"
                  placeholder="Your name"
                  autocomplete="name"
                  :disabled="settingsLoading"
                />
              </div>

              <p v-if="settingsError" class="auth-modal__error">{{ settingsError }}</p>
              <p v-if="settingsSuccess" class="profile-settings__message profile-settings__message--success">{{ settingsSuccess }}</p>

              <button class="auth-modal__submit-btn" type="submit" :disabled="settingsLoading">
                {{ settingsLoading ? 'Saving…' : 'Save name' }}
              </button>
            </form>

            <form
              v-else-if="activeSettingsAction === 'password'"
              class="auth-modal__form"
              @submit.prevent="handlePasswordUpdate"
            >
              <div class="profile-settings__reauth">
                <p class="profile-settings__reauth-copy">
                  Supabase will email a one-time verification code before the password can be changed.
                </p>
                <button
                  class="profile-settings__secondary-btn"
                  type="button"
                  :disabled="settingsLoading"
                  @click="sendPasswordVerificationCode"
                >
                  {{ settingsLoading && !passwordCodeSent ? 'Sending…' : passwordCodeSent ? 'Resend code' : 'Send code' }}
                </button>
              </div>

              <div class="auth-modal__field">
                <label class="auth-modal__label" for="profile-password-code">Verification code</label>
                <input
                  id="profile-password-code"
                  v-model="passwordNonce"
                  class="auth-modal__input"
                  type="text"
                  inputmode="numeric"
                  placeholder="123456"
                  autocomplete="one-time-code"
                  :disabled="settingsLoading"
                />
              </div>

              <div class="auth-modal__field">
                <label class="auth-modal__label" for="profile-password">New password</label>
                <input
                  id="profile-password"
                  v-model="passwordInput"
                  class="auth-modal__input"
                  type="password"
                  placeholder="••••••••"
                  autocomplete="new-password"
                  :disabled="settingsLoading"
                />
              </div>

              <div class="auth-modal__field">
                <label class="auth-modal__label" for="profile-password-confirm">Confirm password</label>
                <input
                  id="profile-password-confirm"
                  v-model="passwordConfirm"
                  class="auth-modal__input"
                  type="password"
                  placeholder="••••••••"
                  autocomplete="new-password"
                  :disabled="settingsLoading"
                />
              </div>

              <p v-if="settingsError" class="auth-modal__error">{{ settingsError }}</p>
              <p v-if="settingsSuccess" class="profile-settings__message profile-settings__message--success">{{ settingsSuccess }}</p>

              <button class="auth-modal__submit-btn" type="submit" :disabled="settingsLoading">
                {{ settingsLoading && passwordCodeSent ? 'Saving…' : 'Update password' }}
              </button>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* TODO(color-tokens): This file still contains hardcoded colors outside shared CSS variables. Keep them unchanged during the token refactor. */


:deep(.site-header) {
  margin-bottom: 0;
  padding-bottom: 8px;
}

.profile-page {
  min-height: 100vh;
  padding: 0 0 60px;
}

.profile-page__heading {
  padding: 4px 32px 16px;
  max-width: 1440px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.profile-page__title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.profile-page__title-icon {
  color: var(--accent);
  font-size: 1.5rem;
}

.profile-page__mobile-back {
  position: fixed;
  right: 18px;
  bottom: 18px;
  width: 54px;
  height: 54px;
  border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--border-card));
  border-radius: 18px;
  background: color-mix(in srgb, var(--bg-card) 94%, transparent);
  color: var(--accent);
  display: none;
  align-items: center;
  justify-content: center;
  box-shadow: var(--card-shadow);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 30;
}

.profile-page__mobile-back .mdi {
  font-size: 1.2rem;
}

.profile-empty {
  min-height: 60vh;
}

.profile-layout {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 32px;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 20px;
}

.profile-card {
  background: var(--bg-card);
  border: 1px solid color-mix(in srgb, var(--border-card) 94%, var(--accent) 6%);
  border-radius: 22px;
  padding: 24px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
}

.profile-card--hero {
  grid-column: 1 / -1;
}

.profile-card__identity {
  display: flex;
  align-items: center;
  gap: 18px;
}

.profile-card__avatar {
  width: 76px;
  height: 76px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  background: var(--logo-gradient);
  color: white;
  font-size: 1.8rem;
  font-weight: 800;
  box-shadow: 0 18px 35px color-mix(in srgb, var(--accent) 24%, transparent);
}

html:not(.dark) .profile-card__avatar {
  color: var(--bg-main);
}

.profile-card__identity-copy {
  min-width: 0;
}

.profile-card__eyebrow {
  margin: 0 0 6px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.profile-card__mobile-title {
  display: none;
}

.profile-card__name {
  margin: 0 0 4px;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--text-primary);
}

.profile-hero-actions {
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: nowrap;
  margin-left: auto;
}

.profile-visibility-control {
  position: relative;
  min-width: 0;
}

.profile-visibility-btn,
.profile-friends-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--border-subtle) 96%, var(--accent) 4%);
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-card) 78%, var(--bg-card-inner) 22%);
  padding: 10px 16px;
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.profile-visibility-btn {
  min-width: 176px;
}

.profile-friends-btn {
  white-space: nowrap;
}

.profile-visibility-btn__copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  flex: 1;
}

.profile-visibility-btn__label-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.profile-visibility-btn__label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.profile-visibility-btn__value {
  color: var(--text-primary);
}

.profile-visibility-help {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  color: var(--text-muted);
  outline: none;
}

.profile-visibility-help:hover,
.profile-visibility-help:focus-visible {
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}

.profile-visibility-help--option {
  width: 20px;
  height: 20px;
}

.profile-visibility-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 12;
  width: min(340px, calc(100vw - 32px));
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--border-card));
  border-radius: 18px;
  background: color-mix(in srgb, var(--bg-card) 97%, var(--bg-main) 3%);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.24);
  display: grid;
  gap: 8px;
}


.profile-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.profile-stat {
  border: 1px solid color-mix(in srgb, var(--border-subtle) 97%, var(--accent) 3%);
  border-radius: 16px;
  padding: 18px;
  background: color-mix(in srgb, var(--bg-card) 78%, var(--bg-card-inner) 22%);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.profile-stat__label-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.profile-stat__icon {
  font-size: 0.95rem;
  color: var(--accent);
  opacity: 0.75;
}

.profile-stat__label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  font-weight: 700;
}

.profile-stat__label--mobile {
  display: none;
}

.profile-stat__value {
  font-size: 1.65rem;
  line-height: 1.1;
  color: var(--text-primary);
  font-weight: 800;
}

.profile-stat__value--small {
  font-size: 1rem;
}

.profile-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.profile-card__section-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.profile-actions {
  display: grid;
  gap: 12px;
}

.profile-action,
.profile-list__item {
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--border-subtle) 97%, var(--accent) 3%);
  border-radius: 16px;
  background: color-mix(in srgb, var(--bg-card) 78%, var(--bg-card-inner) 22%);
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  color: var(--text-primary);
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.profile-action:hover,
.profile-list__item:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--accent) 34%, var(--border-card));
  box-shadow: var(--card-shadow-md);
}

.profile-action__icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  font-size: 1.15rem;
  flex-shrink: 0;
}

.profile-action__content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.profile-action__title,
.profile-list__title {
  font-size: 0.96rem;
  font-weight: 700;
  color: var(--text-primary);
}

.profile-action__meta,
.profile-list__meta {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.profile-action--danger .profile-action__icon {
  background: rgba(248, 113, 113, 0.12);
  color: var(--danger);
}

.profile-list {
  display: grid;
  gap: 12px;
}

.profile-list__item {
  justify-content: space-between;
}

.profile-card__empty {
  margin: 0;
  color: var(--text-secondary);
}

.profile-card--stretch {
  display: flex;
  flex-direction: column;
}

.profile-card__stretch {
  flex: 1;
}

.profile-card__new-btn-row {
  margin-top: auto;
  padding-top: 12px;
}

.profile-card__new-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  border: 1px dashed var(--border-subtle);
  border-radius: 14px;
  background: transparent;
  padding: 11px 16px;
  color: var(--text-muted);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.profile-card__new-btn:hover {
  border-color: color-mix(in srgb, var(--accent) 50%, var(--border-card));
  color: var(--accent);
  transform: translateY(-1px);
}

.profile-settings {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}

.profile-settings__action {
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--border-subtle) 97%, var(--accent) 3%);
  border-radius: 16px;
  background: color-mix(in srgb, var(--bg-card) 78%, var(--bg-card-inner) 22%);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  color: var(--text-primary);
  cursor: pointer;
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.profile-settings__action:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--accent) 34%, var(--border-card));
  box-shadow: var(--card-shadow-md);
}

.profile-settings__action-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  font-size: 1.1rem;
  flex-shrink: 0;
}

.profile-settings__action-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.profile-settings__action-title {
  font-size: 0.92rem;
  font-weight: 700;
}

.profile-settings__action-subtitle {
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.profile-settings__action-subtitle--mobile {
  display: none;
}

.profile-settings__message {
  margin: 14px 0 0;
  font-size: 0.84rem;
  font-weight: 600;
}

.profile-settings__message--error {
  color: var(--danger);
}

.profile-settings__message--success {
  color: var(--accent);
}

.profile-settings__reauth {
  display: grid;
  gap: 10px;
}

.profile-settings__reauth-copy {
  margin: 0;
  font-size: 0.88rem;
  color: var(--text-secondary);
}

.profile-settings__secondary-btn {
  justify-self: start;
  border: 1px solid var(--border-card);
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-card-subtle) 84%, transparent);
  color: var(--text-primary);
  padding: 10px 14px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.18s ease, transform 0.18s ease;
}

.profile-settings__secondary-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--accent) 34%, var(--border-card));
}

.profile-settings__secondary-btn:disabled {
  opacity: 0.65;
  cursor: default;
}

.profile-visibility-options {
  display: grid;
  gap: 10px;
}

.profile-visibility-option {
  width: 100%;
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  background: color-mix(in srgb, var(--bg-card-subtle) 84%, transparent);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.profile-visibility-option:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--accent) 34%, var(--border-card));
  box-shadow: var(--card-shadow-md);
}

.profile-visibility-option--active {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border-card));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 22%, transparent) inset;
}

.profile-visibility-option__icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  font-size: 1.1rem;
  flex-shrink: 0;
}

.profile-visibility-option__copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
  min-height: 40px;
}

.profile-visibility-option__title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  transform: translateY(1px);
}

.profile-visibility-option__title {
  font-size: 0.92rem;
  font-weight: 700;
}

.profile-visibility-option__check {
  color: var(--text-muted);
  font-size: 1.05rem;
  flex-shrink: 0;
}

.profile-settings-modal {
  width: min(100%, 520px);
}

@media (max-width: 900px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }

  .profile-stats {
    grid-template-columns: 1fr 1fr;
  }

  .profile-stats .profile-stat:last-child {
    grid-column: 1 / -1;
  }

  .profile-stat__label {
    font-size: 0.72rem;
    letter-spacing: 0.04em;
  }

  .profile-stat__label--desktop {
    display: none;
  }

  .profile-stat__label--mobile {
    display: inline;
  }

  .profile-stat__value {
    font-size: 1.2rem;
  }

  .profile-stat {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .profile-stat__value--small {
    font-size: 1rem;
    white-space: nowrap;
  }
}

/* ── Username in hero ───────────────────────────────────────── */
.profile-card__name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.profile-card__name-row .profile-card__name {
  margin: 0;
}

.profile-card__username {
  font-size: 0.95rem;
  color: var(--accent);
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

/* ── Hero top row (identity + friends button) ───────────────── */
.profile-card__hero-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

@media (max-width: 640px) {
  .profile-page,
  .profile-layout,
  .profile-card,
  .profile-card__hero-top,
  .profile-card__identity,
  .profile-card__identity-copy,
  .profile-card__name-row,
  .profile-hero-actions,
  .profile-visibility-control,
  .profile-visibility-btn,
  .profile-friends-btn,
  .profile-stats,
  .profile-stat,
  .profile-actions,
  .profile-action,
  .profile-list,
  .profile-list__item,
  .profile-settings,
  .profile-settings__action {
    min-width: 0;
    box-sizing: border-box;
  }

  .profile-page {
    overflow-x: clip;
  }

  :deep(.site-header__search),
  :deep(.site-header__search-spacer),
  :deep(.site-header__search--mobile),
  :deep(.site-header__search-full),
  :deep(.site-header__search-pill) {
    display: none !important;
  }

  :deep(.site-header) {
    padding-bottom: 0;
    margin-bottom: 0;
  }

  .profile-page__heading {
    padding: 0 16px 14px;
    flex-direction: column;
    align-items: flex-start;
  }

  .profile-layout {
    padding: 0 16px;
  }

  .profile-card {
    padding: 20px;
    border-radius: 18px;
    width: 100%;
  }

  .profile-card__identity {
    align-items: center;
    flex-direction: row;
    gap: 14px;
  }

  .profile-card__identity-copy {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .profile-card__eyebrow {
    margin-bottom: 2px;
    text-align: right;
  }

  .profile-card__hero-top {
    width: 100%;
    min-width: 0;
    flex-direction: column;
    align-items: stretch;
  }

  .profile-card__name-row {
    min-width: 0;
    flex-wrap: nowrap;
    gap: 6px;
    justify-content: flex-end;
  }

  .profile-card__name {
    font-size: 1.3rem;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .profile-card__username {
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .profile-visibility-control {
    min-width: 0;
  }

  .profile-hero-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
    margin-left: 0;
    gap: 10px;
  }

  .profile-visibility-btn {
    width: 100%;
    min-width: 0;
    justify-content: space-between;
  }

  .profile-friends-btn {
    width: 100%;
    min-width: 0;
    justify-content: space-between;
  }

  .profile-visibility-menu {
    width: 100%;
    right: auto;
    left: 0;
  }

  .profile-card__avatar {
    width: 64px;
    height: 64px;
    border-radius: 18px;
    font-size: 1.4rem;
  }

  .profile-list__item {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }

  .profile-page__heading .breadcrumb {
    display: none;
  }

  .profile-page__mobile-back {
    display: inline-flex;
  }

  :deep(.auth-modal__input) {
    font-size: 16px !important;
  }

  .profile-list .profile-list__item:nth-child(n+3) {
    display: none;
  }

  .profile-settings__action-subtitle--desktop {
    display: none;
  }

  .profile-settings__action-subtitle--mobile {
    display: block;
  }

  .profile-card__header .profile-card__eyebrow {
    display: none;
  }

  .profile-card__header .profile-card__section-title {
    display: none;
  }

  .profile-card__mobile-title {
    display: block;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin: 0;
  }
}

.profile-friends-btn__count {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  color: var(--accent);
  border-radius: 20px;
  padding: 1px 8px;
  font-size: 0.8rem;
  font-weight: 700;
}

.profile-visibility-btn:hover,
.profile-friends-btn:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border-card));
  color: var(--text-primary);
}

/* ── Atlas Score feature card ──────────────────────────────── */
.profile-card--atlas {
  grid-column: 1 / -1;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent) 10%, var(--bg-card)) 0%,
    var(--bg-card) 55%
  );
  border-color: color-mix(in srgb, var(--accent) 28%, var(--border-card));
  padding: 28px 30px;
  transition: opacity 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}

/* Once you've already personalized and collapsed it, it shouldn't keep pulling the eye the
   way the full-strength gradient/border does — fade it toward a plain card until reopened. */
.profile-card--atlas-collapsed {
  background: var(--bg-card);
  border-color: var(--border-card);
  opacity: 0.6;
}

.profile-card--atlas-collapsed:hover {
  opacity: 0.85;
}

.atlas-feature__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  text-align: left;
  color: inherit;
  font: inherit;
}

.atlas-feature__chevron {
  font-size: 1.3rem;
  color: var(--text-muted);
  flex-shrink: 0;
}

.atlas-feature__title--toggle {
  font-size: 1.3rem;
}

.atlas-feature__inner {
  display: grid;
  grid-template-columns: minmax(0, 240px) 1fr;
  gap: 28px;
  align-items: stretch;
  margin-top: 20px;
}

.atlas-feature__left {
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: center;
}

.atlas-feature__header-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.atlas-feature__badge {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.atlas-feature__badge-icon {
  font-size: 1.25rem;
  color: var(--accent);
}

.atlas-feature__eyebrow {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--accent) 75%, var(--text-muted));
}

.atlas-feature__title {
  margin: 0;
  font-size: 1.7rem;
  font-weight: 800;
  letter-spacing: -0.035em;
  color: var(--text-primary);
  line-height: 1.1;
}

.atlas-feature__desc {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.atlas-feature__prefs {
  background: color-mix(in srgb, var(--bg-card-inner) 60%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 10%, var(--border-card));
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

@media (max-width: 860px) {
  .atlas-feature__inner {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .profile-card--atlas {
    padding: 22px 20px;
  }
}

</style>
