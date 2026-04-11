<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import CitySearch from './CitySearch.vue';
import ThemeToggle from './ThemeToggle.vue';
import AuthModal from './AuthModal.vue';

const props = defineProps<{
  showSearch?: boolean;
  showThemeToggle?: boolean;
  themeTogglePlacement?: 'before-actions' | 'after-actions';
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
const mobileSearchOpen = ref(false);

const displayCity = computed(() => {
  if (!props.initialCity) return '';
  return props.initialCity.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
});

function onSearchSubmit(payload: { city: string; state: string }) {
  mobileSearchOpen.value = false;
  emit('search', payload);
}

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

function closeMenu() {
  userMenuOpen.value = false;
  document.removeEventListener('click', handleClickOutside, { capture: true });
}

function navigateTo(routeName: 'profile' | 'favorites' | 'saved-comparisons' | 'friends') {
  closeMenu();
  router.push({ name: routeName });
}

function handleLogoClick() {
  emit('logo-click');
  if (!emit) router.push({ name: 'home' });
}
</script>

<template>
  <header class="site-header">
    <div v-if="$slots.leading" class="site-header__leading">
      <slot name="leading" />
    </div>

    <div class="site-header__identity">
      <span class="site-logo-wrap" @click="handleLogoClick">
        <span class="site-logo">Atlas</span>
        <span class="site-logo-accent" aria-hidden="true"></span>
      </span>
      <div v-if="$slots.title" class="site-header__title">
        <slot name="title" />
      </div>
    </div>

    <div v-if="showSearch" class="site-header__search site-header__search--desktop">
      <!-- Pill: always in flow to hold header height; invisible when expanded -->
      <button
        v-if="initialCity"
        class="site-header__search-pill"
        :class="{ 'site-header__search-pill--expanded': mobileSearchOpen }"
        @click="mobileSearchOpen = true"
      >
        <span class="mdi mdi-map-marker site-header__search-pill-icon"></span>
        <span class="site-header__search-pill-text">{{ displayCity }}, {{ initialState?.toUpperCase() }}</span>
        <span class="mdi mdi-chevron-down site-header__search-pill-chevron"></span>
      </button>

      <!-- Full search: always visible on desktop; overlays on mobile when open or no city -->
      <div class="site-header__search-full" :class="{ 'site-header__search-full--visible': mobileSearchOpen || !initialCity }">
        <CitySearch
          class="site-header__search-city"
          :initial-city="initialCity"
          :initial-state="initialState"
          @search="onSearchSubmit"
        />
        <button
          v-if="initialCity && mobileSearchOpen"
          class="site-header__search-collapse"
          @click="mobileSearchOpen = false"
        >
          <span class="mdi mdi-chevron-up"></span>
        </button>
      </div>
    </div>
    <div v-else class="site-header__search-spacer"></div>

    <div class="site-header__controls">
      <ThemeToggle v-if="showThemeToggle && (themeTogglePlacement ?? 'before-actions') === 'before-actions'" />
      <slot name="actions" />
      <ThemeToggle v-if="showThemeToggle && themeTogglePlacement === 'after-actions'" />
      <div v-if="user" ref="userMenuRef" class="user-menu">
        <button class="user-menu__btn" @click="toggleMenu">
          <span class="user-menu__name">{{ displayName() ?? 'Account' }}</span>
          <span class="user-menu__avatar">{{ (displayName() ?? 'A')[0].toUpperCase() }}</span>
        </button>
        <div v-if="userMenuOpen" class="user-menu__dropdown">
          <button class="user-menu__header user-menu__header-btn" @click="navigateTo('profile')">
            <span class="user-menu__header-avatar">{{ (displayName() ?? 'A')[0].toUpperCase() }}</span>
            <div class="user-menu__header-info">
              <span class="user-menu__header-name">{{ displayName() ?? 'Account' }}</span>
              <span class="user-menu__header-email">{{ user.email }}</span>
            </div>
          </button>
          <div class="user-menu__divider"></div>
          <button class="user-menu__item" @click="navigateTo('friends')">
            <span class="mdi mdi-account-group-outline user-menu__item-icon"></span>
            Friends
          </button>
          <button class="user-menu__item" @click="navigateTo('favorites')">
            <span class="mdi mdi-star-outline user-menu__item-icon"></span>
            Favorites
          </button>
          <button class="user-menu__item" @click="navigateTo('saved-comparisons')">
            <span class="mdi mdi-bookmark-multiple-outline user-menu__item-icon"></span>
            Saved Comparisons
          </button>
          <div class="user-menu__divider"></div>
          <button class="user-menu__item user-menu__item--danger" @click="closeMenu(); signOut()">
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

  <div v-if="showSearch" class="site-header__search site-header__search--mobile">
    <button
      v-if="initialCity"
      class="site-header__search-pill"
      :class="{ 'site-header__search-pill--expanded': mobileSearchOpen }"
      @click="mobileSearchOpen = true"
    >
      <span class="mdi mdi-map-marker site-header__search-pill-icon"></span>
      <span class="site-header__search-pill-text">{{ displayCity }}, {{ initialState?.toUpperCase() }}</span>
      <span class="mdi mdi-chevron-down site-header__search-pill-chevron"></span>
    </button>

    <div class="site-header__search-full" :class="{ 'site-header__search-full--visible': mobileSearchOpen || !initialCity }">
      <CitySearch
        class="site-header__search-city"
        :initial-city="initialCity"
        :initial-state="initialState"
        @search="onSearchSubmit"
      />
      <button
        v-if="initialCity && mobileSearchOpen"
        class="site-header__search-collapse"
        @click="mobileSearchOpen = false"
      >
        <span class="mdi mdi-chevron-up"></span>
      </button>
    </div>
  </div>

  <AuthModal v-if="showAuthModal" :mode="authModalMode" @close="showAuthModal = false" />
</template>

<style scoped>
.site-header__search-spacer {
  flex: 1;
}

.site-header__identity {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
}

.site-header__leading {
  display: flex;
  align-items: center;
}

.site-header__title {
  min-width: 0;
}

/* ── Mobile collapsed pill ───────────────────────────── */

/* Hidden on desktop — pill is mobile-only */
.site-header__search-pill {
  display: none;
}

/* Full search always visible on desktop */
.site-header__search-full {
  width: 100%;
}

.site-header__search--mobile {
  display: none;
}

/* Collapse button only relevant on mobile */
.site-header__search-collapse {
  display: none;
}

@media (max-width: 640px) {
  .site-header {
    z-index: 260;
  }

  .site-header__controls,
  .user-menu,
  .user-menu__dropdown {
    z-index: 261;
  }

  .site-header__search--desktop,
  .site-header__search-spacer {
    display: none;
  }

  .site-header__search--mobile {
    display: block;
    position: sticky;
    top: calc(env(safe-area-inset-top, 0px) + 8px);
    z-index: 220;
    margin: 0 0 8px;
    padding-top: 4px;
    padding-bottom: 4px;
    background: color-mix(in srgb, var(--bg-main) 90%, transparent);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-radius: 12px;
  }

  /* Pill: in flow, holds the row height */
  .site-header__search-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 10px 14px;
    background: var(--bg-card);
    border: 1px solid var(--border-card);
    border-radius: 10px;
    color: var(--text-primary);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
  }

  /* When expanded: pill stays in flow (keeps space) but is invisible */
  .site-header__search-pill--expanded {
    visibility: hidden;
    pointer-events: none;
  }

  .site-header__search-pill-icon {
    color: var(--accent);
    font-size: 1rem;
    flex-shrink: 0;
  }

  .site-header__search-pill-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .site-header__search-pill-chevron {
    color: var(--text-secondary);
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  /* Full search: hidden on mobile by default (pill shows instead) */
  .site-header__search-full {
    display: none;
  }

  /* When visible: absolute overlay starting exactly where the pill is */
  .site-header__search-full--visible {
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 200;
  }

  /* Shrink CitySearch slightly so it doesn't run under the chevron */
  .site-header__search-city {
    padding-right: 36px;
  }

  /* Collapse chevron: absolute top-right of the expanded search */
  .site-header__search-collapse {
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 0;
    right: 0;
    width: 42px;
    height: 42px;
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.2rem;
    cursor: pointer;
    z-index: 201;
  }

  .site-header__search-collapse:hover {
    color: var(--text-primary);
  }
}
</style>
