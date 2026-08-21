<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth";
import ThemeToggle from "./ThemeToggle.vue";
import AuthModal from "./AuthModal.vue";
import CitySearch from "./CitySearch.vue";

const props = defineProps<{
  city?: string;
  state?: string;
  pageLabel?: string;
}>();

defineEmits<{
  "logo-click": [];
  search: [payload: { city: string; state: string }];
}>();

const route = useRoute();
const router = useRouter();
const { user, displayName, signOut } = useAuth();

const showSearch = computed(() => route.name !== "search");

const userMenuOpen = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);
const showAuthModal = ref(false);
const authModalMode = ref<"login" | "register">("login");

const cityDisplayName = computed(() => {
  if (!props.city) return "";
  return props.city.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
});

function toggleMenu() {
  userMenuOpen.value = !userMenuOpen.value;
  if (userMenuOpen.value) {
    document.addEventListener("click", onClickOutside, { capture: true });
  } else {
    document.removeEventListener("click", onClickOutside, { capture: true });
  }
}

function closeMenu() {
  userMenuOpen.value = false;
  document.removeEventListener("click", onClickOutside, { capture: true });
}

function onClickOutside(e: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) {
    closeMenu();
  }
}

function navigateTo(routeName: "profile" | "favorites" | "saved-comparisons" | "friends") {
  closeMenu();
  router.push({ name: routeName });
}

function openAuth(mode: "login" | "register") {
  authModalMode.value = mode;
  showAuthModal.value = true;
}

</script>

<template>
  <header class="dashboard-hdr">
    <div class="dashboard-hdr__left">
      <div class="dashboard-hdr__logo-wrap" @click="$emit('logo-click')">
        <img src="/favicon.svg" class="dashboard-hdr__favicon" alt="Atlas" />
        <span class="dashboard-hdr__logo">Atlas</span>
      </div>
      <template v-if="pageLabel || (cityDisplayName && state)">
        <span class="dashboard-hdr__sep">·</span>
        <span class="dashboard-hdr__page-title">{{ pageLabel ?? `${cityDisplayName}, ${state!.toUpperCase()}` }}</span>
      </template>
    </div>

    <div v-if="showSearch" class="dashboard-hdr__search" :class="{ 'dashboard-hdr__search--wide': !$slots.actions }">
      <CitySearch
        compact
        :initial-city="city"
        :initial-state="state"
        @search="payload => $emit('search', payload)"
      />
    </div>
    <div v-else class="dashboard-hdr__search-spacer"></div>

    <div class="dashboard-hdr__end">
    <div v-if="$slots.actions" class="dashboard-hdr__actions">
      <slot name="actions" />
    </div>

    <div class="dashboard-hdr__right">
      <ThemeToggle />

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
    </div>
  </header>

  <AuthModal v-if="showAuthModal" :mode="authModalMode" @close="showAuthModal = false" />
</template>

<style scoped>
.dashboard-hdr {
  display: flex;
  align-items: center;
  height: 60px;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in srgb, var(--bg-main) 60%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  /* Bleed over container padding on scroll */
  margin: -32px -32px 0;
  padding: 0 32px;
}

/* Full-viewport-width bottom border */
.dashboard-hdr::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100vw;
  height: 1px;
  background: var(--border-color);
}

.dashboard-hdr__left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.dashboard-hdr__logo-wrap {
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  flex-shrink: 0;
}

.dashboard-hdr__favicon {
  width: 22px;
  height: 22px;
  opacity: 0.8;
  filter: brightness(0) opacity(0.75);
}

html.dark .dashboard-hdr__favicon {
  filter: brightness(1) opacity(0.75);
}

.dashboard-hdr__logo {
  font-size: 1.4rem;
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 900;
  letter-spacing: -0.02em;
  background: var(--logo-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  user-select: none;
}

.dashboard-hdr__sep {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
  opacity: 0.4;
}


.dashboard-hdr__page-title {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  white-space: nowrap;
}

.dashboard-hdr__search {
  display: flex;
  flex: 0 1 680px;
  min-width: 220px;
  margin-right: auto;
}

.dashboard-hdr__search-spacer {
  flex: 1;
}

/* No action buttons on this page (e.g. Profile, Favorites) — the search bar
   is the only thing between the logo and the user menu, so widen it and
   center it in the remaining space instead of hugging the left side. */
.dashboard-hdr__search--wide {
  flex-basis: 880px;
  margin: 0 auto;
}

.dashboard-hdr__search .search-bar {
  width: 100%;
}

.dashboard-hdr__end {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.dashboard-hdr__right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.dashboard-hdr__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.dashboard-hdr__actions :deep(.score-pills__compare-btn) {
  height: 33px;
  padding: 0 13px;
  gap: 6px;
  font-size: 0.77rem;
  border-radius: 8px;
}

.dashboard-hdr__actions :deep(.score-pills__compare-icon),
.dashboard-hdr__actions :deep(.score-pills__share-wrap .mdi) {
  font-size: 0.85rem;
}

.dashboard-hdr__actions :deep(.score-pills__share-wrap) {
  margin-left: 0;
}

:deep(.theme-toggle) {
  position: static;
  inset: auto;
  font-size: 13px;
  width: 4.05em;
  height: 2em;
  display: flex;
  flex: 0 0 auto;
  align-self: center;
  margin: 0;
  padding: 0;
  box-shadow: none;
}

:deep(.theme-toggle .slider) {
  border-color: color-mix(in srgb, var(--accent) 16%, var(--border-card));
}

:deep(.theme-toggle:hover .slider) {
  border-color: color-mix(in srgb, var(--accent) 30%, var(--border-card));
  box-shadow: var(--card-shadow);
}

:deep(.theme-toggle .slider::before) {
  left: 0.16em;
  width: 1.22em;
  height: 1.22em;
}

:deep(.theme-toggle input:checked + .slider::before) {
  transform: translate(1.68em, -50%);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.22),
    inset -0.38em -0.08em 0 0 color-mix(in srgb, var(--text-primary) 92%, var(--accent) 8%);
}

/* Narrow desktop / tablet squeeze zone: free up room before the full mobile stack kicks in */
@media (max-width: 900px) {
  .dashboard-hdr__sep,
  .dashboard-hdr__page-title {
    display: none;
  }

  .dashboard-hdr__search {
    flex-basis: 240px;
    min-width: 160px;
  }

  .dashboard-hdr__actions :deep(.score-pills__compare-btn) {
    padding: 0 10px;
    font-size: 0.72rem;
  }
}

@media (max-width: 800px) {
  .dashboard-hdr {
    display: flex;
    flex-wrap: wrap;
    height: auto;
    padding: 10px 20px;
    row-gap: 10px;
  }

  .dashboard-hdr__left {
    order: 1;
    flex: 1 1 auto;
  }

  /* Unwrap so __actions and __right participate directly in the header's own flex-wrap/order */
  .dashboard-hdr__end {
    display: contents;
  }

  .dashboard-hdr__right {
    order: 2;
  }

  .dashboard-hdr__search {
    order: 3;
    width: auto;
    flex: 1 1 100%;
  }

  .dashboard-hdr__actions {
    order: 4;
    flex: 1 1 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .dashboard-hdr__actions :deep(.score-pills__share-wrap) {
    width: 100%;
    min-width: 0;
  }

  .dashboard-hdr__actions :deep(.score-pills__compare-btn) {
    width: 100%;
    justify-content: center;
    min-height: 44px;
  }
}
</style>
