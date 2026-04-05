<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import SiteHeader from '../components/SiteHeader.vue';
import { useAuth } from '../composables/useAuth';
import { useFavorites } from '../composables/useFavorites';
import { useComparisons } from '../composables/useComparisons';

const router = useRouter();
const { user, displayName, signOut, reauthenticate, updateDisplayName, updatePassword } = useAuth();
const { favorites, fetchFavorites } = useFavorites();
const { savedComparisons, fetchComparisons } = useComparisons();

type SettingsActionId = 'name' | 'password';

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
  icon: string;
}> = [
  {
    id: 'name',
    title: 'Edit display name',
    subtitle: 'Update the name shown across your account',
    icon: 'mdi-account-edit-outline',
  },
  {
    id: 'password',
    title: 'Change password',
    subtitle: 'Set a new password for future sign-ins',
    icon: 'mdi-lock-reset',
  },
];

const activeSettingsAction = ref<SettingsActionId | null>(null);
const nameInput = ref('');
const passwordInput = ref('');
const passwordConfirm = ref('');
const passwordNonce = ref('');
const passwordCodeSent = ref(false);
const settingsError = ref<string | null>(null);
const settingsSuccess = ref<string | null>(null);
const settingsLoading = ref(false);

watch(
  () => user.value?.user_metadata?.full_name,
  (name) => {
    nameInput.value = (name as string | undefined) ?? '';
  },
  { immediate: true },
);

watch(
  () => user.value?.id,
  async (userId) => {
    if (!userId) return;
    await Promise.all([fetchFavorites(), fetchComparisons()]);
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
</script>

<template>
  <div class="profile-page">
    <div class="container">
      <SiteHeader
        show-search
        show-theme-toggle
        @search="({ city, state }) => router.push({ name: 'city', params: { city, state } })"
        @logo-click="router.push({ name: 'home' })"
      />
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

    <div v-if="!user" class="profile-empty">
      <span class="mdi mdi-account-lock-outline profile-empty__icon"></span>
      <p class="profile-empty__text">Sign in to open your profile.</p>
    </div>

    <div v-else class="profile-layout">
      <section class="profile-card profile-card--hero">
        <div class="profile-card__identity">
          <div class="profile-card__avatar">{{ userInitial }}</div>
          <div class="profile-card__identity-copy">
            <p class="profile-card__eyebrow">Atlas account</p>
            <h2 class="profile-card__name">{{ displayName() ?? 'Account' }}</h2>
            <p class="profile-card__email">{{ user.email }}</p>
          </div>
        </div>

        <div class="profile-stats">
          <div class="profile-stat">
            <span class="profile-stat__label">Favorites</span>
            <span class="profile-stat__value">{{ favorites.length }}</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat__label">Saved comparisons</span>
            <span class="profile-stat__value">{{ savedComparisons.length }}</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat__label">Member since</span>
            <span class="profile-stat__value profile-stat__value--small">{{ memberSince ?? 'Recently' }}</span>
          </div>
        </div>
      </section>

      <section class="profile-card">
        <div class="profile-card__header">
          <div>
            <p class="profile-card__eyebrow">Shortcuts</p>
            <h2 class="profile-card__section-title">Jump back in</h2>
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

      <section class="profile-card">
        <div class="profile-card__header">
          <div>
            <p class="profile-card__eyebrow">Recent places</p>
            <h2 class="profile-card__section-title">Latest favorites</h2>
          </div>
        </div>

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
      </section>

      <section class="profile-card">
        <div class="profile-card__header">
          <div>
            <p class="profile-card__eyebrow">Recent comparisons</p>
            <h2 class="profile-card__section-title">Latest matchups</h2>
          </div>
        </div>

        <div v-if="recentComparisons.length" class="profile-list">
          <button
            v-for="comparison in recentComparisons"
            :key="comparison.id"
            class="profile-list__item"
            @click="router.push({ name: 'compare', params: { stateA: comparison.state_a, cityA: comparison.city_a, stateB: comparison.state_b, cityB: comparison.city_b } })"
          >
            <span class="profile-list__title">{{ comparison.city_name_a }} vs {{ comparison.city_name_b }}</span>
            <span class="profile-list__meta">{{ comparison.state_a.toUpperCase() }} / {{ comparison.state_b.toUpperCase() }}</span>
          </button>
        </div>
        <p v-else class="profile-card__empty">No saved comparisons yet.</p>
      </section>

      <section class="profile-card">
        <div class="profile-card__header">
          <div>
            <p class="profile-card__eyebrow">Account settings</p>
            <h2 class="profile-card__section-title">Manage your profile</h2>
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
              <span class="profile-settings__action-subtitle">{{ action.subtitle }}</span>
            </span>
          </button>
        </div>
      </section>
    </div>

    <Teleport to="body">
      <Transition name="industry-modal">
        <div v-if="activeSettingsAction" class="auth-modal__backdrop" @click.self="closeSettingsModal">
          <div class="auth-modal__panel data-card profile-settings-modal">
            <div class="auth-modal__header">
              <span class="auth-modal__title">
                {{
                  activeSettingsAction === 'name'
                    ? 'Edit display name'
                    : 'Change password'
                }}
              </span>
              <button class="industry-modal__close" @click="closeSettingsModal">
                <span class="mdi mdi-close"></span>
              </button>
            </div>

            <form
              v-if="activeSettingsAction === 'name'"
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
:deep(.site-header) {
  margin-bottom: 0;
  padding-bottom: 8px;
}

.profile-page {
  min-height: 100vh;
  padding: 0 0 60px;
}

.profile-page__heading {
  padding: 4px 40px 16px;
  max-width: 1300px;
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

.profile-empty {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}

.profile-empty__icon {
  font-size: 3rem;
  color: var(--accent);
  opacity: 0.35;
}

.profile-empty__text {
  margin: 0;
  font-size: 1rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.profile-layout {
  max-width: 1300px;
  margin: 0 auto;
  padding: 0 40px;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 20px;
}

.profile-card {
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--bg-card) 92%, transparent), var(--bg-card)),
    radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 12%, transparent), transparent 42%);
  border: 1px solid var(--border-card);
  border-radius: 22px;
  padding: 24px;
  box-shadow: var(--card-shadow);
}

.profile-card--hero {
  grid-column: 1 / -1;
}

.profile-card__identity {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 24px;
}

.profile-card__avatar {
  width: 76px;
  height: 76px;
  border-radius: 24px;
  display: grid;
  place-items: center;
  background: var(--logo-gradient);
  color: white;
  font-size: 1.8rem;
  font-weight: 800;
  box-shadow: 0 18px 35px color-mix(in srgb, var(--accent) 24%, transparent);
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

.profile-card__name {
  margin: 0 0 4px;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--text-primary);
}

.profile-card__email {
  margin: 0;
  font-size: 0.98rem;
  color: var(--text-secondary);
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.profile-stat {
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 18px;
  background: color-mix(in srgb, var(--bg-card-subtle) 82%, transparent);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.profile-stat__label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  font-weight: 700;
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
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  background: color-mix(in srgb, var(--bg-card-subtle) 84%, transparent);
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
  color: #f87171;
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

.profile-settings {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}

.profile-settings__action {
  width: 100%;
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  background: color-mix(in srgb, var(--bg-card-subtle) 84%, transparent);
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

.profile-settings__message {
  margin: 14px 0 0;
  font-size: 0.84rem;
  font-weight: 600;
}

.profile-settings__message--error {
  color: #f87171;
}

.profile-settings__message--success {
  color: #34d399;
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

.profile-settings-modal {
  width: min(100%, 520px);
}

@media (max-width: 900px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }

  .profile-stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .profile-page__heading {
    padding: 4px 16px 16px;
    flex-direction: column;
    align-items: flex-start;
  }

  .profile-layout {
    padding: 0 16px;
  }

  .profile-card {
    padding: 20px;
    border-radius: 18px;
  }

  .profile-card__identity {
    align-items: flex-start;
    flex-direction: column;
  }

  .profile-card__avatar {
    width: 64px;
    height: 64px;
    border-radius: 20px;
    font-size: 1.4rem;
  }

  .profile-list__item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
