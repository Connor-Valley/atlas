<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "../../composables/useAuth";
import ThemeToggle from "../ThemeToggle.vue";

const props = defineProps<{
  activeTab: string;
}>();

const emit = defineEmits<{
  "update:activeTab": [tab: string];
  "logo-click": [];
}>();

const router = useRouter();
const { user, displayName, signOut } = useAuth();

const userMenuOpen = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);

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

const tabs = [
  { key: "cartographer", label: "Cartographer", num: "01" },
  { key: "matchup",      label: "Matchup",      num: "02" },
  { key: "dossier",      label: "Dossier",       num: "03" },
];
</script>

<template>
  <header class="compare-hdr">
    <!-- Left: logo + page title -->
    <div class="compare-hdr__left">
      <div class="compare-hdr__logo-wrap" @click="$emit('logo-click')">
        <img src="/favicon.svg" class="compare-hdr__favicon" alt="Atlas" />
        <span class="compare-hdr__logo">Atlas</span>
      </div>
      <span class="compare-hdr__title-sep">·</span>
      <span class="compare-hdr__page-title">City Comparison</span>
    </div>

    <!-- Right: tab switcher + theme + profile -->
    <div class="compare-hdr__right">
      <nav class="compare-hdr__tabs" aria-label="Comparison view">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="compare-hdr__tab"
          :class="{ 'compare-hdr__tab--active': activeTab === tab.key }"
          @click="$emit('update:activeTab', tab.key)"
        >
          {{ tab.label }}<span class="compare-hdr__tab-num">{{ tab.num }}</span>
        </button>
      </nav>

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
      <button v-else class="auth-btn" @click="router.push({ name: 'login' })">
        <span class="auth-btn__label">Sign in</span>
        <span class="auth-btn__avatar"><span class="mdi mdi-account-outline"></span></span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.compare-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 54px;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in srgb, var(--bg-main) 60%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  /* Extend background to cover the container's horizontal padding on scroll */
  margin: 0 -32px;
  padding: 0 32px;
}

/* Full-viewport-width bottom border */
.compare-hdr::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100vw;
  height: 1px;
  background: var(--border-color);
}

.compare-hdr__left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.compare-hdr__logo-wrap {
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  flex-shrink: 0;
}

.compare-hdr__favicon {
  width: 22px;
  height: 22px;
  opacity: 0.8;
  /* SVG strokes are light (#EFF1ED) — make them dark in light mode */
  filter: brightness(0) opacity(0.75);
}

.compare-hdr__logo {
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

.compare-hdr__title-sep {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
  opacity: 0.4;
}

.compare-hdr__page-title {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  white-space: nowrap;
}

.compare-hdr__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── Tab switcher — segmented pill ─────────────────────────── */
.compare-hdr__tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--bg-card-inner);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 3px;
  margin-right: 8px;
}

.compare-hdr__tab {
  display: flex;
  align-items: baseline;
  gap: 5px;
  padding: 4px 14px;
  border: none;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  transition: color 0.15s ease, background 0.15s ease;
  white-space: nowrap;
}

.compare-hdr__tab:hover {
  color: var(--text-primary);
}

.compare-hdr__tab--active {
  background: var(--text-primary);
  color: var(--bg-main);
}

.compare-hdr__tab--active:hover {
  background: var(--text-primary);
  color: var(--bg-main);
}

.compare-hdr__tab-num {
  font-size: 0.5625rem;
  opacity: 0.6;
}
</style>
