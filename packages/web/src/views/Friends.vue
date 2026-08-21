<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import DashboardHeader from '../components/DashboardHeader.vue';
import { useAuth } from '../composables/useAuth';
import { useFriends } from '../composables/useFriends';
import { useToast } from '../composables/useToast';
import { useRecentSearches } from '../composables/useRecentSearches';
import { supabase } from '../lib/supabase';

const router = useRouter();
const { recordRecentSearch } = useRecentSearches();

function onHeaderSearch(payload: { city: string; state: string }) {
  void recordRecentSearch(payload.city, payload.state);
  router.push(`/city/${payload.state}/${payload.city}`);
}

const { user } = useAuth();
const isMobile = ref(typeof window !== 'undefined' && window.innerWidth < 640);
const {
  friends, incomingRequests, outgoingRequests,
  fetchAll, sendFriendRequest, acceptFriendRequest,
  declineFriendRequest, cancelFriendRequest, removeFriend,
} = useFriends();

const { show: showToast } = useToast();

async function handleRemove(requestId: string) {
  try { await removeFriend(requestId); }
  catch (err: any) { showToast(err?.message ?? 'Could not remove friend.'); }
}

// ── Friend list filter ───────────────────────────────────────
const searchQuery = ref('');
const filteredFriends = computed(() => {
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return friends.value;
  return friends.value.filter(f =>
    f.profile?.display_name?.toLowerCase().includes(q) ||
    f.profile?.username?.toLowerCase().includes(q)
  );
});

// ── Search users modal ───────────────────────────────────────
interface UserResult { id: string; username: string; display_name: string; }

const showSearchModal   = ref(false);
const userSearchQuery   = ref('');
const userSearchResults = ref<UserResult[]>([]);
const userSearchLoading = ref(false);
const searchActionLoading = ref<string | null>(null); // userId being actioned

let searchDebounce: ReturnType<typeof setTimeout> | null = null;

function openSearchModal() {
  showSearchModal.value   = true;
  userSearchQuery.value   = '';
  userSearchResults.value = [];
}

function closeSearchModal() {
  showSearchModal.value = false;
}

async function runUserSearch(q: string) {
  if (!q.trim()) { userSearchResults.value = []; return; }
  userSearchLoading.value = true;
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .or(`username.ilike.%${q.trim()}%,display_name.ilike.%${q.trim()}%`)
    .neq('id', user.value!.id)
    .limit(25);
  userSearchResults.value = data ?? [];
  userSearchLoading.value = false;
}

watch(userSearchQuery, (q) => {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => runUserSearch(q), 280);
});

function getUserStatus(userId: string): 'friend' | 'pending_sent' | 'pending_received' | 'none' {
  if (friends.value.some(f => f.from_user_id === userId || f.to_user_id === userId)) return 'friend';
  if (outgoingRequests.value.some(r => r.to_user_id === userId)) return 'pending_sent';
  if (incomingRequests.value.some(r => r.from_user_id === userId)) return 'pending_received';
  return 'none';
}

async function handleSearchAdd(username: string) {
  searchActionLoading.value = username;
  try {
    await sendFriendRequest(username);
    await fetchAll();
  } catch (err: any) {
    showToast(err?.message ?? 'Unable to send request.');
  } finally {
    searchActionLoading.value = null;
  }
}

// ── Requests modal ───────────────────────────────────────────
const showRequestsModal = ref(false);

function openRequestsModal() {
  showRequestsModal.value = true;
}

function closeRequestsModal() {
  showRequestsModal.value = false;
}

async function handleAccept(id: string) {
  try { await acceptFriendRequest(id); }
  catch (err: any) { showToast(err?.message ?? 'Something went wrong.'); }
}

async function handleDecline(id: string) {
  try { await declineFriendRequest(id); }
  catch (err: any) { showToast(err?.message ?? 'Something went wrong.'); }
}

async function handleCancel(id: string) {
  try { await cancelFriendRequest(id); }
  catch (err: any) { showToast(err?.message ?? 'Something went wrong.'); }
}

const pendingCount = computed(() => incomingRequests.value.length);

// ── Load ─────────────────────────────────────────────────────
watch(() => user.value?.id, (id) => { if (id) fetchAll(); }, { immediate: true });

function handleResize() {
  isMobile.value = window.innerWidth < 640;
}

onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<template>
  <div class="friends-page">
    <div class="container container--header-only">
      <DashboardHeader page-label="Friends" @logo-click="router.push({ name: 'search' })" @search="onHeaderSearch" />
    </div>

    <!-- Title bar -->
    <div class="friends-page__heading">
      <h1 class="friends-page__title">
        <span class="mdi mdi-account-group-outline friends-page__title-icon"></span>
        Friends
      </h1>
      <div v-if="user" class="friends-page__mobile-actions">
        <button class="friends-toolbar__requests-btn" @click="openRequestsModal">
          <span class="mdi mdi-account-clock-outline"></span>
          Requests
          <span v-if="pendingCount" class="friends-toolbar__badge">{{ pendingCount }}</span>
        </button>
        <button class="friends-toolbar__add-btn" @click="openSearchModal">
          <span class="mdi mdi-account-search-outline"></span>
          Search users
        </button>
      </div>
      <button class="breadcrumb" @click="router.back()">
        <span class="breadcrumb__arr breadcrumb__arr--1 mdi mdi-arrow-left"></span>
        <span class="breadcrumb__text">Back</span>
        <span class="breadcrumb__arr breadcrumb__arr--2 mdi mdi-arrow-left"></span>
        <span class="breadcrumb__circle"></span>
      </button>
    </div>

    <!-- Toolbar -->
    <div v-if="user" class="friends-toolbar">
      <div class="friends-toolbar__search">
        <span class="mdi mdi-magnify friends-toolbar__search-icon"></span>
        <input
          v-model="searchQuery"
          class="friends-toolbar__search-input"
          type="text"
          placeholder="Search friends…"
        />
      </div>

      <div class="friends-toolbar__actions">
        <button class="friends-toolbar__requests-btn" @click="openRequestsModal">
          <span class="mdi mdi-account-clock-outline"></span>
          Requests
          <span v-if="pendingCount" class="friends-toolbar__badge">{{ pendingCount }}</span>
        </button>
        <button class="friends-toolbar__add-btn" @click="openSearchModal">
          <span class="mdi mdi-account-search-outline"></span>
          Search users
        </button>
      </div>
    </div>

    <!-- Not signed in -->
    <div v-if="!user" class="friends-empty">
      <span class="mdi mdi-account-lock-outline friends-empty__icon"></span>
      <p class="friends-empty__text">Sign in to manage your friends.</p>
    </div>

    <!-- Friends list -->
    <div v-else class="friends-content">
      <div v-if="filteredFriends.length" class="flist">
        <div
          v-for="friend in filteredFriends"
          :key="friend.id"
          class="flist__item"
        >
          <div
            class="flist__main"
            @click="router.push({ name: 'user-profile', params: { username: friend.profile?.username } })"
          >
            <div class="flist__avatar">{{ (friend.profile?.display_name || friend.profile?.username || '?')[0].toUpperCase() }}</div>
            <div class="flist__info">
              <span class="flist__name">{{ friend.profile?.display_name || friend.profile?.username }}</span>
              <span class="flist__username">@{{ friend.profile?.username }}</span>
            </div>
          </div>

          <div class="flist__actions">
            <button
              class="flist__action-btn"
              @click.stop="router.push({ name: 'user-profile', params: { username: friend.profile?.username } })"
            >
              <span class="mdi mdi-account-outline"></span>
              View profile
            </button>
            <button class="flist__action-btn flist__action-btn--danger" @click.stop="handleRemove(friend.id)">
              <span class="mdi mdi-account-remove-outline"></span>
              Remove
            </button>
          </div>
        </div>
      </div>

      <div v-else class="friends-empty">
        <span class="mdi mdi-account-heart-outline friends-empty__icon"></span>
        <p class="friends-empty__text">
          {{ searchQuery ? 'No friends match that search.' : 'No friends yet — search for users to add!' }}
        </p>
      </div>
    </div>

    <button class="friends-page__mobile-back" @click="router.back()">
      <span class="mdi mdi-arrow-left"></span>
    </button>

    <!-- ── Search users modal ────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="industry-modal">
        <div v-if="showSearchModal" class="auth-modal__backdrop" @click.self="closeSearchModal">
          <div class="auth-modal__panel data-card search-modal">
            <div class="auth-modal__header">
              <span class="auth-modal__title">Search users</span>
              <button class="industry-modal__close" @click="closeSearchModal">
                <span class="mdi mdi-close"></span>
              </button>
            </div>

            <div class="search-modal__body">
              <!-- Search input -->
              <div class="search-modal__input-wrap">
                <span class="mdi mdi-magnify search-modal__input-icon"></span>
                <input
                  v-model="userSearchQuery"
                  class="auth-modal__input search-modal__input"
                  type="text"
                  :placeholder="isMobile ? 'Name or @user' : 'Search by name or @username…'"
                  autocomplete="off"
                />
                <span v-if="userSearchLoading" class="mdi mdi-loading search-modal__input-spin"></span>
              </div>

              <!-- Results -->
              <div v-if="userSearchResults.length" class="slist">
                <div v-for="u in userSearchResults" :key="u.id" class="slist__item">
                  <div
                    class="slist__main"
                    @click="closeSearchModal(); router.push({ name: 'user-profile', params: { username: u.username } })"
                  >
                    <div class="slist__avatar">{{ (u.display_name || u.username || '?')[0].toUpperCase() }}</div>
                    <div class="slist__info">
                      <span class="slist__name">{{ u.display_name || u.username }}</span>
                      <span class="slist__username">@{{ u.username }}</span>
                    </div>
                  </div>

                  <div class="slist__actions">
                    <!-- Status-aware action -->
                    <button
                      v-if="getUserStatus(u.id) === 'none'"
                      class="slist__action-btn slist__action-btn--add"
                      :disabled="searchActionLoading === u.username"
                      @click.stop="handleSearchAdd(u.username)"
                    >
                      <span class="mdi mdi-account-plus-outline"></span>
                      Add friend
                    </button>
                    <span v-else-if="getUserStatus(u.id) === 'friend'" class="slist__status slist__status--friend">
                      <span class="mdi mdi-account-check-outline"></span> Friends
                    </span>
                    <span v-else-if="getUserStatus(u.id) === 'pending_sent'" class="slist__status slist__status--pending">
                      <span class="mdi mdi-account-clock-outline"></span> Requested
                    </span>
                    <button
                      v-else-if="getUserStatus(u.id) === 'pending_received'"
                      class="slist__action-btn slist__action-btn--accept"
                      :disabled="searchActionLoading === u.username"
                      @click.stop="handleSearchAdd(u.username)"
                    >
                      <span class="mdi mdi-account-check-outline"></span>
                      Accept
                    </button>

                    <button
                      class="slist__action-btn"
                      @click.stop="closeSearchModal(); router.push({ name: 'user-profile', params: { username: u.username } })"
                    >
                      <span class="mdi mdi-account-outline"></span>
                      View profile
                    </button>
                  </div>
                </div>
              </div>

              <!-- Empty / prompt -->
              <div v-else class="search-modal__empty">
                <span class="mdi mdi-account-search-outline search-modal__empty-icon"></span>
                <p class="search-modal__empty-text">
                  {{ userSearchQuery.trim() ? 'No users found.' : 'Start typing to find users.' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Requests modal ─────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="industry-modal">
        <div v-if="showRequestsModal" class="auth-modal__backdrop" @click.self="closeRequestsModal">
          <div class="auth-modal__panel data-card friends-modal">
            <div class="auth-modal__header">
              <span class="auth-modal__title">Friend requests</span>
              <button class="industry-modal__close" @click="closeRequestsModal">
                <span class="mdi mdi-close"></span>
              </button>
            </div>

            <div class="friends-modal__body">
              <template v-if="incomingRequests.length || outgoingRequests.length">
                <div v-if="incomingRequests.length" class="freqs">
                  <p class="freqs__label">Incoming</p>
                  <div class="freqs__list">
                    <div v-for="req in incomingRequests" :key="req.id" class="freq-item">
                      <div class="freq-item__avatar">{{ (req.profile?.display_name || req.profile?.username || '?')[0].toUpperCase() }}</div>
                      <div class="freq-item__info">
                        <span class="freq-item__name">{{ req.profile?.display_name || req.profile?.username }}</span>
                        <span class="freq-item__username">@{{ req.profile?.username }}</span>
                      </div>
                      <div class="freq-item__actions">
                        <button class="freq-btn freq-btn--accept" @click="handleAccept(req.id)">Accept</button>
                        <button class="freq-btn freq-btn--decline" @click="handleDecline(req.id)">Decline</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="outgoingRequests.length" class="freqs" :style="incomingRequests.length ? 'margin-top:20px' : ''">
                  <p class="freqs__label">Sent</p>
                  <div class="freqs__list">
                    <div v-for="req in outgoingRequests" :key="req.id" class="freq-item">
                      <div class="freq-item__avatar">{{ (req.profile?.display_name || req.profile?.username || '?')[0].toUpperCase() }}</div>
                      <div class="freq-item__info">
                        <span class="freq-item__name">{{ req.profile?.display_name || req.profile?.username }}</span>
                        <span class="freq-item__username">@{{ req.profile?.username }}</span>
                      </div>
                      <button class="freq-btn freq-btn--cancel" @click="handleCancel(req.id)">Cancel</button>
                    </div>
                  </div>
                </div>
              </template>

              <div v-else class="freqs-empty">
                <span class="mdi mdi-inbox-outline freqs-empty__icon"></span>
                <p class="freqs-empty__text">No pending requests.</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
/* TODO(color-tokens): This file still contains hardcoded colors outside shared CSS variables. Keep them unchanged during the token refactor. */
.friends-page {
  min-height: 100vh;
  padding: 0 0 60px;
}

:deep(.site-header) {
  margin-bottom: 0;
  padding-bottom: 8px;
}

/* ── Heading bar ──────────────────────────────────────────── */
.friends-page__heading {
  padding: 4px 32px 20px;
  margin-top: 0;
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.friends-page__title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.friends-page__title-icon {
  color: var(--accent);
  font-size: 1.5rem;
}

.friends-page__mobile-back {
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

.friends-page__mobile-back .mdi {
  font-size: 1.2rem;
}

.friends-page__mobile-actions {
  display: none;
}

/* ── Toolbar ──────────────────────────────────────────────── */
.friends-toolbar {
  max-width: 1440px;
  margin: 0 auto 24px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.friends-toolbar__search {
  flex: 1;
  position: relative;
}

.friends-toolbar__search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 1rem;
  pointer-events: none;
}

.friends-toolbar__search-input {
  width: 100%;
  background: color-mix(in srgb, var(--bg-card) 90%, transparent);
  border: 1px solid var(--border-card);
  border-radius: 14px;
  padding: 10px 14px 10px 36px;
  color: var(--text-primary);
  font: inherit;
  font-size: 0.93rem;
  outline: none;
  transition: border-color 0.18s ease;
}

.friends-toolbar__search-input:focus {
  border-color: var(--accent);
}

.friends-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.friends-toolbar__requests-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border-card);
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-card) 90%, transparent);
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  padding: 10px 14px;
  cursor: pointer;
  position: relative;
  transition: border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.friends-toolbar__requests-btn:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border-card));
  color: var(--text-primary);
  transform: translateY(-1px);
}

.friends-toolbar__badge {
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background: var(--accent);
  color: var(--text-primary);
  font-size: 0.72rem;
  font-weight: 800;
  display: grid;
  place-items: center;
  padding: 0 4px;
}

.friends-toolbar__add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: 14px;
  background: var(--accent);
  color: var(--text-primary);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  padding: 10px 16px;
  cursor: pointer;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.friends-toolbar__add-btn:hover {
  opacity: 0.88;
  transform: translateY(-1px);
}

/* ── Friends list ─────────────────────────────────────────── */
.friends-content {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 32px;
}

.flist {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.flist__item {
  display: flex;
  align-items: center;
  gap: 16px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--bg-card) 92%, transparent), var(--bg-card)),
    radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 8%, transparent), transparent 50%);
  border: 1px solid var(--border-card);
  border-radius: 18px;
  padding: 14px 20px;
  color: var(--text-primary);
  box-shadow: var(--card-shadow);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.flist__item:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--accent) 34%, var(--border-card));
  box-shadow: var(--card-shadow-md);
}

/* Clickable left section */
.flist__main {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.flist__avatar {
  width: 50px;
  height: 50px;
  border-radius: 16px;
  background: var(--logo-gradient);
  color: var(--text-primary);
  font-size: 1.25rem;
  font-weight: 800;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  box-shadow: 0 8px 20px color-mix(in srgb, var(--accent) 20%, transparent);
}

html:not(.dark) .flist__avatar {
  color: var(--bg-main);
}

.flist__info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.flist__name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.flist__username {
  font-size: 0.86rem;
  color: var(--accent);
}

/* Action buttons, revealed on hover */
.flist__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.flist__item:hover .flist__actions {
  opacity: 1;
  pointer-events: auto;
}

.flist__action-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--border-card);
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-card-subtle) 80%, transparent);
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 7px 12px;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

.flist__action-btn:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border-card));
  color: var(--text-primary);
  transform: translateY(-1px);
}

.flist__action-btn--danger {
  border-color: color-mix(in srgb, var(--danger) 25%, transparent);
  color: var(--danger);
}

.flist__action-btn--danger:hover {
  border-color: var(--danger);
}

/* ── Empty states ─────────────────────────────────────────── */
.friends-empty {
  min-height: 50vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}

.friends-empty__icon {
  font-size: 3rem;
  color: var(--accent);
  opacity: 0.3;
}

.friends-empty__text {
  margin: 0;
  font-size: 1rem;
  color: var(--text-secondary);
  font-weight: 600;
}

/* ── Modal shared ─────────────────────────────────────────── */
.friends-modal {
  width: min(100%, 560px);
  min-height: 0 !important;
  font-size: 1.02rem;
}

.friends-modal__body {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-top: 4px;
}

.friends-modal__msg {
  margin: 10px 0 0;
  font-size: 0.84rem;
  font-weight: 600;
}

.friends-modal__msg--error   { color: var(--danger); }
.friends-modal__msg--success { color: var(--accent); }

/* ── Search users modal ───────────────────────────────────── */
.search-modal {
  width: min(72vw, 900px) !important;
  max-width: min(72vw, 900px) !important;
  min-height: 60vh !important;
  display: flex;
  flex-direction: column;
}

.search-modal__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
  flex: 1;
  min-height: 0;
}

.search-modal__input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-modal__input-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
  font-size: 1rem;
  pointer-events: none;
}

.search-modal__input {
  padding-left: 32px !important;
  padding-right: 32px !important;
  padding-top: 13px !important;
  padding-bottom: 13px !important;
  font-size: 1rem !important;
  margin: 0;
}

.search-modal__input-spin {
  position: absolute;
  right: 12px;
  color: var(--text-muted);
  font-size: 1rem;
  animation: spin 0.8s linear infinite;
}

/* ── Search result list ───────────────────────────────────── */
.slist {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.slist__item {
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  background: color-mix(in srgb, var(--bg-card-subtle) 84%, transparent);
  padding: 13px 18px;
  transition: border-color 0.15s ease;
}

.slist__item:hover {
  border-color: color-mix(in srgb, var(--accent) 30%, var(--border-card));
}

.slist__main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.slist__avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--logo-gradient);
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 800;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

html:not(.dark) .slist__avatar {
  color: var(--bg-main);
}

.slist__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.slist__name {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slist__username {
  font-size: 0.8rem;
  color: var(--accent);
}

.slist__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.slist__item:hover .slist__actions {
  opacity: 1;
  pointer-events: auto;
}

.slist__action-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--border-card);
  border-radius: 9px;
  background: color-mix(in srgb, var(--bg-card) 90%, transparent);
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 6px 11px;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

.slist__action-btn:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border-card));
  color: var(--text-primary);
  transform: translateY(-1px);
}

.slist__action-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.slist__action-btn--add {
  border-color: var(--border-color);
  color: var(--accent);
}

.slist__action-btn--add:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.slist__action-btn--accept {
  border-color: var(--border-color);
  color: var(--accent);
}

.slist__status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 6px 11px;
  border-radius: 9px;
  white-space: nowrap;
}

.slist__status--friend {
  color: var(--accent);
  background: var(--accent-light);
}

.slist__status--pending {
  color: var(--text-muted);
  background: color-mix(in srgb, var(--text-muted) 8%, transparent);
}

.search-modal__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}

.search-modal__empty-icon {
  font-size: 2.4rem;
  color: var(--text-muted);
  opacity: 0.4;
}

.search-modal__empty-text {
  margin: 0;
  font-size: 0.92rem;
  color: var(--text-secondary);
}

/* ── Request items ────────────────────────────────────────── */
.freqs__label {
  margin: 0 0 10px;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.freqs__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.freq-item {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-card-subtle) 84%, transparent);
  padding: 11px 13px;
}

.freq-item__avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--logo-gradient);
  color: var(--text-primary);
  font-size: 0.95rem;
  font-weight: 800;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

html:not(.dark) .freq-item__avatar {
  color: var(--bg-main);
}

.freq-item__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.freq-item__name {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.freq-item__username {
  font-size: 0.8rem;
  color: var(--accent);
}

.freq-item__actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.freq-btn {
  border-radius: 9px;
  border: 1px solid var(--border-card);
  background: transparent;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 5px 11px;
  cursor: pointer;
  transition: border-color 0.18s ease, transform 0.18s ease;
}

.freq-btn:hover { transform: translateY(-1px); }
.freq-btn--accept  { border-color: var(--border-color); color: var(--accent); }
.freq-btn--accept:hover  { border-color: var(--accent); }
.freq-btn--decline,
.freq-btn--cancel  { border-color: color-mix(in srgb, var(--danger) 30%, transparent); color: var(--danger); }
.freq-btn--decline:hover,
.freq-btn--cancel:hover  { border-color: var(--danger); }

.freqs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 0;
  text-align: center;
}

.freqs-empty__icon {
  font-size: 2rem;
  color: var(--text-muted);
  opacity: 0.5;
}

.freqs-empty__text {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

/* ── Responsive ───────────────────────────────────────────── */
@media (max-width: 640px) {
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

  .friends-page__heading,
  .friends-toolbar,
  .friends-content {
    padding-left: 16px;
    padding-right: 16px;
  }

  .friends-page__heading {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding-top: 0;
    padding-bottom: 0;
    margin-top: -10px;
    gap: 6px;
  }

  .friends-page__title {
    font-size: 1.5rem;
    gap: 8px;
    line-height: 1;
    min-height: 38px;
    display: flex;
    align-items: center;
  }

  .friends-page__title-icon {
    font-size: 1.3rem;
  }

  .friends-toolbar {
    flex-wrap: nowrap;
    align-items: center;
    justify-content: flex-end;
    margin-bottom: 16px;
    margin-top: 0;
  }

  .friends-toolbar__search {
    display: none;
  }

  .friends-page__mobile-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
  }

  .friends-toolbar__actions {
    display: none;
  }

  .friends-toolbar__actions {
    width: auto;
    flex-wrap: nowrap;
    justify-content: flex-end;
    gap: 6px;
  }

  .friends-toolbar__requests-btn,
  .friends-toolbar__add-btn {
    height: 36px;
    padding: 8px 10px;
    font-size: 0.76rem;
    border-radius: 11px;
    gap: 4px;
    align-items: center;
  }

  .friends-toolbar__requests-btn .mdi,
  .friends-toolbar__add-btn .mdi {
    font-size: 0.9rem;
  }

  .friends-page__heading .breadcrumb {
    display: none;
  }

  .friends-page__mobile-back {
    display: inline-flex;
  }

  .flist__item,
  .slist__item {
    align-items: flex-start;
  }

  .flist__actions,
  .slist__actions {
    opacity: 1;
    pointer-events: auto;
  }

  .flist__item {
    flex-direction: column;
  }

  .flist__actions {
    width: 100%;
  }

  .flist__action-btn {
    flex: 1 1 0;
    justify-content: center;
  }

  .slist__item {
    flex-direction: column;
  }

  .slist__actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .slist__action-btn,
  .slist__status {
    justify-content: center;
  }

  .search-modal {
    width: calc(100vw - 24px) !important;
    max-width: calc(100vw - 24px) !important;
    min-height: 52vh !important;
  }

  .search-modal__input {
    font-size: 0.92rem !important;
    padding-left: 36px !important;
    padding-right: 14px !important;
  }

  .search-modal__input::placeholder {
    font-size: 0.88rem;
  }
}
</style>
