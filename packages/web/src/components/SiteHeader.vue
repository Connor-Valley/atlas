<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import CitySearch from './CitySearch.vue';
import ThemeToggle from './ThemeToggle.vue';
import AuthModal from './AuthModal.vue';

const props = defineProps<{
  showSearch?: boolean;
  showThemeToggle?: boolean;
  initialCity?: string;
  initialState?: string;
}>();

const emit = defineEmits<{
  (e: 'search', payload: { city: string; state: string }): void;
  (e: 'logo-click'): void;
}>();

const router = useRouter();
const { user, displayName, signOut } = useAuth();

const userMenuOpen = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);
const showAuthModal = ref(false);
const authModalMode = ref<'login' | 'register'>('login');

function openAuth(mode: 'login' | 'register') {
  authModalMode.value = mode;
  showAuthModal.value = true;
}

function handleClickOutside(e: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) {
    userMenuOpen.value = false;
  }
}

function toggleMenu() {
  userMenuOpen.value = !userMenuOpen.value;
  if (userMenuOpen.value) {
    document.addEventListener('click', handleClickOutside, { capture: true });
  } else {
    document.removeEventListener('click', handleClickOutside, { capture: true });
  }
}

function handleLogoClick() {
  emit('logo-click');
  if (!emit) router.push({ name: 'home' });
}
</script>

<template>
  <header class="site-header">
    <span class="site-logo-wrap" @click="handleLogoClick">
      <span class="site-logo">Atlas</span>
      <span class="site-logo-accent" aria-hidden="true"></span>
    </span>

    <div v-if="showSearch" class="site-header__search">
      <CitySearch
        :initial-city="initialCity"
        :initial-state="initialState"
        @search="emit('search', $event)"
      />
    </div>
    <div v-else class="site-header__search-spacer"></div>

    <div class="site-header__controls">
      <ThemeToggle v-if="showThemeToggle" />
      <div v-if="user" ref="userMenuRef" class="user-menu">
        <button class="user-menu__btn" @click="toggleMenu">
          <span class="user-menu__name">{{ displayName() ?? 'Account' }}</span>
          <span class="user-menu__avatar">{{ (displayName() ?? 'A')[0].toUpperCase() }}</span>
        </button>
        <div v-if="userMenuOpen" class="user-menu__dropdown" @click="userMenuOpen = false; document.removeEventListener('click', handleClickOutside, { capture: true })">
          <div class="user-menu__header">
            <span class="user-menu__header-avatar">{{ (displayName() ?? 'A')[0].toUpperCase() }}</span>
            <div class="user-menu__header-info">
              <span class="user-menu__header-name">{{ displayName() ?? 'Account' }}</span>
              <span class="user-menu__header-email">{{ user.email }}</span>
            </div>
          </div>
          <div class="user-menu__divider"></div>
          <button class="user-menu__item" @click="router.push({ name: 'favorites' })">
            <span class="mdi mdi-star-outline user-menu__item-icon"></span>
            Favorites
          </button>
          <div class="user-menu__divider"></div>
          <button class="user-menu__item user-menu__item--danger" @click="signOut">
            <span class="mdi mdi-logout user-menu__item-icon"></span>
            Sign out
          </button>
        </div>
      </div>
      <button v-else class="auth-btn" @click="openAuth('login')">
        <span class="auth-btn__label">Sign in</span>
        <span class="auth-btn__avatar"><span class="mdi mdi-account-outline"></span></span>
      </button>
    </div>
  </header>

  <AuthModal v-if="showAuthModal" :mode="authModalMode" @close="showAuthModal = false" />
</template>

<style scoped>
.site-header__search-spacer {
  flex: 1;
}
</style>
