<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAuth } from '../composables/useAuth';
import TurnstileWidget from './TurnstileWidget.vue';
import { PROFILE_VISIBILITY_OPTIONS, type ProfileVisibility } from '../lib/profilePrivacy';

const props = defineProps<{ mode?: 'login' | 'register' }>();
const emit  = defineEmits<{ (e: 'close'): void }>();

const { signUp, signIn } = useAuth();

const activeMode = ref<'login' | 'register'>(props.mode ?? 'register');

const name     = ref('');
const username = ref('');
const email    = ref('');
const password = ref('');
const loading  = ref(false);
const error    = ref<string | null>(null);
const registerStep = ref<'details' | 'visibility'>('details');
const profileVisibility = ref<ProfileVisibility>('public');
const showPasswordHover = ref(false);
const showPasswordLocked = ref(false);
const showPassword = computed(() => showPasswordHover.value || showPasswordLocked.value);
const captchaToken = ref<string | null>(null);
const captchaKey = ref(0);
const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() ?? '';

const isRegister = computed(() => activeMode.value === 'register');
const modalTitle = computed(() => {
  if (!isRegister.value) return 'Welcome back';
  return registerStep.value === 'details' ? 'Create an account' : 'Set your profile visibility';
});

function switchMode(mode: 'login' | 'register') {
  activeMode.value = mode;
  registerStep.value = 'details';
  error.value = null;
  resetCaptcha();
}

function resetCaptcha() {
  captchaToken.value = null;
  captchaKey.value += 1;
}

function resetRegisterFlow() {
  registerStep.value = 'details';
  profileVisibility.value = 'public';
}

async function handleSubmit() {
  error.value = null;
  if (turnstileSiteKey && !captchaToken.value) {
    error.value = 'Please complete the CAPTCHA.';
    return;
  }
  loading.value = true;
  try {
    if (isRegister.value) {
      if (!name.value.trim()) { error.value = 'Please enter your name.'; return; }
      const usernameClean = username.value.toLowerCase().trim();
      if (!usernameClean) { error.value = 'Please choose a username.'; loading.value = false; return; }
      if (!/^[a-z0-9_]{3,20}$/.test(usernameClean)) {
        error.value = 'Username must be 3–20 characters: letters, numbers, and underscores only.';
        loading.value = false;
        return;
      }
      if (registerStep.value === 'details') {
        registerStep.value = 'visibility';
        loading.value = false;
        return;
      }
      await signUp(
        email.value.trim(),
        password.value,
        name.value.trim(),
        usernameClean,
        profileVisibility.value,
        captchaToken.value ?? undefined,
      );
    } else {
      await signIn(email.value.trim(), password.value, captchaToken.value ?? undefined);
    }
    resetRegisterFlow();
    emit('close');
  } catch (err: any) {
    error.value = err?.message ?? 'Something went wrong. Please try again.';
    resetCaptcha();
  } finally {
    loading.value = false;
  }
}

function goBackToRegisterDetails() {
  registerStep.value = 'details';
  error.value = null;
}
</script>

<template>
  <Teleport to="body">
    <Transition name="industry-modal">
      <div class="auth-modal__backdrop" @click.self="emit('close')">
        <div class="auth-modal__panel data-card">

          <div class="auth-modal__header">
            <span class="auth-modal__title">{{ modalTitle }}</span>
            <button class="industry-modal__close" @click="emit('close')">
              <span class="mdi mdi-close"></span>
            </button>
          </div>

          <form class="auth-modal__form" @submit.prevent="handleSubmit">
            <template v-if="isRegister && registerStep === 'details'">
            <div class="auth-modal__field">
              <label class="auth-modal__label">Name</label>
              <input
                v-model="name"
                type="text"
                placeholder="Your name"
                class="auth-modal__input"
                autocomplete="name"
                :disabled="loading"
                required
              />
            </div>

            <div class="auth-modal__field">
              <label class="auth-modal__label">Username</label>
              <input
                v-model="username"
                type="text"
                placeholder="yourhandle"
                class="auth-modal__input"
                autocomplete="username"
                :disabled="loading"
                required
              />
              <p class="auth-modal__hint">3–20 characters, lowercase letters, numbers, underscores</p>
            </div>
            </template>

            <div v-if="!isRegister || registerStep === 'details'" class="auth-modal__field">
              <label class="auth-modal__label">Email</label>
              <input
                v-model="email"
                type="email"
                placeholder="your@email.com"
                class="auth-modal__input"
                autocomplete="email"
                :disabled="loading"
                required
              />
            </div>

            <template v-if="!isRegister || registerStep === 'details'">
            <div class="auth-modal__field">
              <label class="auth-modal__label">Password</label>
              <div class="auth-modal__password-wrap">
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  class="auth-modal__input"
                  :autocomplete="isRegister ? 'new-password' : 'current-password'"
                  :disabled="loading"
                  required
                />
                <button
                  type="button"
                  class="auth-modal__password-toggle"
                  @mouseenter="showPasswordHover = true"
                  @mouseleave="showPasswordHover = false"
                  @click="showPasswordLocked = !showPasswordLocked"
                  tabindex="-1"
                >
                  <span class="mdi" :class="showPassword ? 'mdi-eye-off' : 'mdi-eye'"></span>
                </button>
              </div>
            </div>
            </template>

            <div v-if="isRegister && registerStep === 'visibility'" class="auth-modal__visibility-step">
              <div class="auth-modal__visibility-copy">
                <p class="auth-modal__label">Choose your default privacy</p>
                <p class="auth-modal__hint auth-modal__hint--visibility">
                  Choose who can view your saved cities, comparisons, and profile details. You can change this later.
                </p>
              </div>

              <div class="auth-modal__visibility-options">
                <button
                  v-for="option in PROFILE_VISIBILITY_OPTIONS"
                  :key="option.value"
                  type="button"
                  class="auth-modal__visibility-option"
                  :class="{ 'auth-modal__visibility-option--active': profileVisibility === option.value }"
                  :disabled="loading"
                  @click="profileVisibility = option.value"
                >
                  <span class="mdi auth-modal__visibility-option-icon" :class="option.icon"></span>
                  <span class="auth-modal__visibility-option-copy">
                    <span class="auth-modal__visibility-option-title-row">
                      <span class="auth-modal__visibility-option-title">{{ option.label }}</span>
                      <span
                        class="auth-modal__visibility-option-info"
                        tabindex="0"
                        :data-tooltip="option.description"
                        @click.stop
                      >
                        <span class="mdi mdi-information-outline"></span>
                      </span>
                    </span>
                  </span>
                  <span class="mdi" :class="profileVisibility === option.value ? 'mdi-check-circle' : 'mdi-circle-outline'"></span>
                </button>
              </div>
            </div>

            <div
              v-if="turnstileSiteKey && (!isRegister || registerStep === 'details')"
              class="auth-modal__field auth-modal__field--captcha"
            >
              <label class="auth-modal__label">Verification</label>
              <TurnstileWidget
                :key="captchaKey"
                :site-key="turnstileSiteKey"
                theme="dark"
                @verified="captchaToken = $event"
                @expired="captchaToken = null"
                @error="error = $event"
              />
            </div>

            <p v-if="error" class="auth-modal__error">{{ error }}</p>

            <button type="submit" class="auth-modal__submit-btn" :disabled="loading">
              {{ loading ? '…' : isRegister ? (registerStep === 'details' ? 'Continue' : 'Create account') : 'Sign in' }}
            </button>

            <button
              v-if="isRegister && registerStep === 'visibility'"
              type="button"
              class="auth-modal__back-btn"
              :disabled="loading"
              @click="goBackToRegisterDetails"
            >
              Back
            </button>
          </form>

          <p class="auth-modal__switch">
            <template v-if="isRegister">
              Already have an account?
              <button class="auth-modal__switch-btn" @click="switchMode('login')">Sign in</button>
            </template>
            <template v-else>
              Don't have an account?
              <button class="auth-modal__switch-btn" @click="switchMode('register')">Register</button>
            </template>
          </p>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>
