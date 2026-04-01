<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuth } from '../composables/useAuth';

const props = defineProps<{ mode?: 'login' | 'register' }>();
const emit  = defineEmits<{ (e: 'close'): void }>();

const { signUp, signIn } = useAuth();

const activeMode = ref<'login' | 'register'>(props.mode ?? 'register');

const name     = ref('');
const email    = ref('');
const password = ref('');
const loading  = ref(false);
const error    = ref<string | null>(null);

const isRegister = computed(() => activeMode.value === 'register');

function switchMode(mode: 'login' | 'register') {
  activeMode.value = mode;
  error.value = null;
}

async function handleSubmit() {
  error.value = null;
  loading.value = true;
  try {
    if (isRegister.value) {
      if (!name.value.trim()) { error.value = 'Please enter your name.'; return; }
      await signUp(email.value.trim(), password.value, name.value.trim());
    } else {
      await signIn(email.value.trim(), password.value);
    }
    emit('close');
  } catch (err: any) {
    error.value = err?.message ?? 'Something went wrong. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="industry-modal">
      <div class="auth-modal__backdrop" @click.self="emit('close')">
        <div class="auth-modal__panel data-card">

          <div class="auth-modal__header">
            <span class="auth-modal__title">{{ isRegister ? 'Create an account' : 'Welcome back' }}</span>
            <button class="industry-modal__close" @click="emit('close')">
              <span class="mdi mdi-close"></span>
            </button>
          </div>

          <form class="auth-modal__form" @submit.prevent="handleSubmit">
            <div v-if="isRegister" class="auth-modal__field">
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

            <div class="auth-modal__field">
              <label class="auth-modal__label">Password</label>
              <input
                v-model="password"
                type="password"
                placeholder="••••••••"
                class="auth-modal__input"
                :autocomplete="isRegister ? 'new-password' : 'current-password'"
                :disabled="loading"
                required
              />
            </div>

            <p v-if="error" class="auth-modal__error">{{ error }}</p>

            <button type="submit" class="auth-modal__submit-btn" :disabled="loading">
              {{ loading ? '…' : isRegister ? 'Create account' : 'Sign in' }}
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
