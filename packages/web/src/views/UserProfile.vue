<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import SiteHeader from '../components/SiteHeader.vue';
import { useAuth } from '../composables/useAuth';
import { useFriends } from '../composables/useFriends';
import { useToast } from '../composables/useToast';
import { supabase } from '../lib/supabase';
import { canViewerAccessProfileContent, getProfileVisibilityNotice, type ProfileVisibility } from '../lib/profilePrivacy';

const route  = useRoute();
const router = useRouter();
const { user } = useAuth();
const { sendFriendRequest, acceptFriendRequest, declineFriendRequest, cancelFriendRequest, removeFriend, getFriendshipStatus } = useFriends();

// ── Types ─────────────────────────────────────────────────────
interface PublicProfile {
  id: string;
  username: string;
  display_name: string;
  created_at: string;
  profile_visibility: ProfileVisibility;
}

type FriendStatus = {
  status: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
  requestId?: string;
};

interface FavRow {
  id: string;
  city: string;
  state: string;
  city_name: string;
}

interface CompRow {
  id: string;
  city_a: string;
  state_a: string;
  city_b: string;
  state_b: string;
  city_name_a: string;
  city_name_b: string;
}

// ── State ─────────────────────────────────────────────────────
const targetProfile     = ref<PublicProfile | null>(null);
const profileLoading    = ref(true);
const profileError      = ref<string | null>(null);
const friendStatus      = ref<FriendStatus>({ status: 'none' });
const actionLoading     = ref(false);
const { show: showToast } = useToast();
const copied            = ref(false);
const friendFavorites   = ref<FavRow[]>([]);
const friendComparisons = ref<CompRow[]>([]);
const friendFavCount    = ref(0);
const friendCompCount   = ref(0);
const friendCount       = ref<number | null>(null);

// ── Derived ───────────────────────────────────────────────────
const username = computed(() => (route.params.username as string).toLowerCase());

const friendName = computed(() =>
  targetProfile.value?.display_name || targetProfile.value?.username || 'them'
);

const userInitial = computed(() =>
  (targetProfile.value?.display_name || targetProfile.value?.username || '?')[0].toUpperCase()
);

const memberSince = computed(() => {
  if (!targetProfile.value) return null;
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .format(new Date(targetProfile.value.created_at));
});

const recentFriendFavorites   = computed(() => friendFavorites.value.slice(0, 3));
const recentFriendComparisons = computed(() => friendComparisons.value.slice(0, 5));

const isFriends = computed(() => friendStatus.value.status === 'accepted');
const canViewProfileContent = computed(() =>
  targetProfile.value
    ? canViewerAccessProfileContent(
        targetProfile.value.profile_visibility,
        user.value?.id,
        targetProfile.value.id,
        isFriends.value,
      )
    : false
);
const visibilityNotice = computed(() =>
  targetProfile.value
    ? getProfileVisibilityNotice(targetProfile.value.profile_visibility, !!user.value)
    : null
);

const friendshipPillClass = computed(() => {
  switch (friendStatus.value.status) {
    case 'accepted':         return 'friendship-pill--friends';
    case 'pending_sent':
    case 'pending_received': return 'friendship-pill--pending';
    default:                 return 'friendship-pill--none';
  }
});

const friendshipPillText = computed(() => {
  switch (friendStatus.value.status) {
    case 'accepted':         return 'Friends';
    case 'pending_sent':     return 'Requested';
    case 'pending_received': return 'Pending';
    default:                 return 'Not connected';
  }
});

// ── Data fetching ─────────────────────────────────────────────
async function fetchFriendContent(profileId: string) {
  const [favsRes, compsRes, favCountRes, compCountRes] = await Promise.all([
    supabase
      .from('favorites')
      .select('id, city, state, city_name')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('saved_comparisons')
      .select('id, city_a, state_a, city_b, state_b, city_name_a, city_name_b')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profileId),
    supabase
      .from('saved_comparisons')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profileId),
  ]);
  friendFavorites.value   = favsRes.data ?? [];
  friendComparisons.value = compsRes.data ?? [];
  friendFavCount.value    = favCountRes.count ?? 0;
  friendCompCount.value   = compCountRes.count ?? 0;
}

async function loadProfile() {
  profileLoading.value    = true;
  profileError.value      = null;
  friendFavorites.value   = [];
  friendComparisons.value = [];
  friendFavCount.value    = 0;
  friendCompCount.value   = 0;
  friendCount.value       = null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, created_at, profile_visibility')
    .eq('username', username.value)
    .maybeSingle();

  if (error || !data) {
    profileError.value   = 'User not found.';
    profileLoading.value = false;
    return;
  }

  if (user.value && data.id === user.value.id) {
    router.replace({ name: 'profile' });
    return;
  }

  targetProfile.value = data;

  if (user.value) {
    friendStatus.value = await getFriendshipStatus(data.id);
  } else {
    friendStatus.value = { status: 'none' };
  }

  if (canViewerAccessProfileContent(data.profile_visibility, user.value?.id, data.id, friendStatus.value.status === 'accepted')) {
    const { data: countData } = await supabase.rpc('get_friend_count', { profile_id: data.id });
    friendCount.value = countData ?? null;
    await fetchFriendContent(data.id);
  }

  profileLoading.value = false;
}

async function refreshStatus() {
  if (!targetProfile.value || !user.value) return;
  friendStatus.value = await getFriendshipStatus(targetProfile.value.id);
}

async function syncVisibleContent() {
  if (!targetProfile.value) return;

  friendFavorites.value = [];
  friendComparisons.value = [];
  friendFavCount.value = 0;
  friendCompCount.value = 0;
  friendCount.value = null;

  if (!canViewProfileContent.value) return;

  const { data: countData } = await supabase.rpc('get_friend_count', { profile_id: targetProfile.value.id });
  friendCount.value = countData ?? null;
  await fetchFriendContent(targetProfile.value.id);
}

// ── Friend actions ────────────────────────────────────────────
async function handleAction(action: 'send' | 'accept' | 'decline' | 'cancel' | 'remove') {
  actionLoading.value = true;
  try {
    if (action === 'send') {
      await sendFriendRequest(username.value);
    } else if (friendStatus.value.requestId) {
      if (action === 'accept')  await acceptFriendRequest(friendStatus.value.requestId);
      if (action === 'decline') await declineFriendRequest(friendStatus.value.requestId);
      if (action === 'cancel')  await cancelFriendRequest(friendStatus.value.requestId);
      if (action === 'remove')  await removeFriend(friendStatus.value.requestId);
    }
    await refreshStatus();
    await syncVisibleContent();
  } catch (err: any) {
    showToast(err?.message ?? 'Something went wrong.');
  } finally {
    actionLoading.value = false;
  }
}

async function copyLink() {
  await navigator.clipboard.writeText(window.location.href);
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
}

onMounted(loadProfile);
watch(username, loadProfile);
watch(() => user.value?.id, loadProfile);
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
        {{ targetProfile?.display_name || targetProfile?.username || 'Profile' }}
        <span v-if="user && targetProfile" class="friendship-pill" :class="friendshipPillClass">{{ friendshipPillText }}</span>
      </h1>
      <button class="breadcrumb" @click="router.back()">
        <span class="breadcrumb__arr breadcrumb__arr--1 mdi mdi-arrow-left"></span>
        <span class="breadcrumb__text">Back</span>
        <span class="breadcrumb__arr breadcrumb__arr--2 mdi mdi-arrow-left"></span>
        <span class="breadcrumb__circle"></span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="profileLoading" class="profile-empty">
      <span class="mdi mdi-loading profile-empty__icon" style="animation: spin 1s linear infinite"></span>
    </div>

    <!-- Error -->
    <div v-else-if="profileError" class="profile-empty">
      <span class="mdi mdi-account-off-outline profile-empty__icon"></span>
      <p class="profile-empty__text">{{ profileError }}</p>
    </div>

    <!-- Profile -->
    <div v-else-if="targetProfile" class="profile-layout">

      <!-- Hero card (full width) -->
      <section class="profile-card profile-card--hero">
        <div class="profile-card__hero-top">
          <div class="profile-card__identity">
            <div class="profile-card__avatar">{{ userInitial }}</div>
            <div class="profile-card__identity-copy">
              <p class="profile-card__eyebrow">Atlas member</p>
              <div class="profile-card__name-row">
                <h2 class="profile-card__name">{{ targetProfile.display_name || targetProfile.username }}</h2>
                <span class="profile-card__username">@{{ targetProfile.username }}</span>
              </div>
            </div>
          </div>

          <div v-if="canViewProfileContent && friendCount !== null" class="profile-friends-count">
            <span class="mdi mdi-account-group-outline"></span>
            <span>{{ friendCount }} {{ friendCount === 1 ? 'friend' : 'friends' }}</span>
          </div>
        </div>

        <div class="profile-stats">
          <div class="profile-stat">
            <div class="profile-stat__label-row">
              <span class="mdi mdi-star-outline profile-stat__icon"></span>
              <span class="profile-stat__label">Favorites</span>
            </div>
            <span class="profile-stat__value">{{ canViewProfileContent ? friendFavCount : 'Hidden' }}</span>
          </div>
          <div class="profile-stat">
            <div class="profile-stat__label-row">
              <span class="mdi mdi-bookmark-multiple-outline profile-stat__icon"></span>
              <span class="profile-stat__label">Saved comparisons</span>
            </div>
            <span class="profile-stat__value">{{ canViewProfileContent ? friendCompCount : 'Hidden' }}</span>
          </div>
          <div class="profile-stat">
            <div class="profile-stat__label-row">
              <span class="mdi mdi-calendar-outline profile-stat__icon"></span>
              <span class="profile-stat__label">Member since</span>
            </div>
            <span class="profile-stat__value profile-stat__value--small">{{ canViewProfileContent ? (memberSince ?? 'Recently') : 'Hidden' }}</span>
          </div>
        </div>
      </section>

      <template v-if="canViewProfileContent">
      <!-- Row 2 left: Shortcuts -->
      <section class="profile-card">
        <div class="profile-card__header">
          <div>
            <p class="profile-card__eyebrow">Quick links</p>
            <h2 class="profile-card__section-title">View {{ friendName }}'s content</h2>
          </div>
        </div>

        <div class="profile-actions">
          <button class="profile-action" @click="router.push({ name: 'user-favorites', params: { username: targetProfile.username } })">
            <span class="mdi mdi-star-outline profile-action__icon"></span>
            <span class="profile-action__content">
              <span class="profile-action__title">Favorites</span>
              <span class="profile-action__meta">{{ friendFavCount }} saved {{ friendFavCount === 1 ? 'city' : 'cities' }}</span>
            </span>
          </button>
          <button class="profile-action" @click="router.push({ name: 'user-comparisons', params: { username: targetProfile.username } })">
            <span class="mdi mdi-bookmark-multiple-outline profile-action__icon"></span>
            <span class="profile-action__content">
              <span class="profile-action__title">Saved comparisons</span>
              <span class="profile-action__meta">{{ friendCompCount }} saved matchup{{ friendCompCount === 1 ? '' : 's' }}</span>
            </span>
          </button>
        </div>
      </section>

      <!-- Row 2 right: Recent favorites -->
      <section class="profile-card profile-card--stretch">
        <div class="profile-card__header">
          <div>
            <p class="profile-card__eyebrow">Recent places</p>
            <h2 class="profile-card__section-title">{{ friendName }}'s favorites</h2>
          </div>
        </div>

        <div class="profile-card__stretch">
          <div v-if="recentFriendFavorites.length" class="profile-list">
            <button
              v-for="fav in recentFriendFavorites"
              :key="fav.id"
              class="profile-list__item"
              @click="router.push({ name: 'city', params: { city: fav.city, state: fav.state } })"
            >
              <span class="profile-list__title">{{ fav.city_name }}</span>
              <span class="profile-list__meta">{{ fav.state.toUpperCase() }}</span>
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

      <!-- Row 3 left: Recent comparisons -->
      <section class="profile-card profile-card--stretch">
        <div class="profile-card__header">
          <div>
            <p class="profile-card__eyebrow">Recent comparisons</p>
            <h2 class="profile-card__section-title">{{ friendName }}'s matchups</h2>
          </div>
        </div>

        <div class="profile-card__stretch">
          <div v-if="recentFriendComparisons.length" class="profile-list">
            <button
              v-for="comp in recentFriendComparisons"
              :key="comp.id"
              class="profile-list__item"
              @click="router.push({ name: 'compare', params: { stateA: comp.state_a, cityA: comp.city_a, stateB: comp.state_b, cityB: comp.city_b } })"
            >
              <span class="profile-list__title">{{ comp.city_name_a }} vs {{ comp.city_name_b }}</span>
              <span class="profile-list__meta">{{ comp.state_a.toUpperCase() }} / {{ comp.state_b.toUpperCase() }}</span>
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
      </template>

      <section
        v-else
        class="profile-card"
        :class="{ 'profile-card--visibility-full': !user }"
      >
        <div class="profile-card__header">
          <div>
            <p class="profile-card__eyebrow">Profile visibility</p>
            <h2 class="profile-card__section-title">{{ visibilityNotice?.title }}</h2>
          </div>
        </div>

        <p class="profile-card__empty">{{ visibilityNotice?.description }}</p>
      </section>

      <!-- Row 3 right: Actions -->
      <section v-if="user" class="profile-card">
        <div class="profile-card__header">
          <div>
            <p class="profile-card__eyebrow">{{ friendName }}</p>
            <h2 class="profile-card__section-title">Actions</h2>
          </div>
        </div>

        <div class="profile-settings">
          <button
            v-if="friendStatus.status === 'none'"
            class="profile-settings__action"
            :disabled="actionLoading"
            @click="handleAction('send')"
          >
            <span class="mdi mdi-account-plus-outline profile-settings__action-icon"></span>
            <span class="profile-settings__action-copy">
              <span class="profile-settings__action-title">Add friend</span>
              <span class="profile-settings__action-subtitle">Send {{ friendName }} a friend request</span>
            </span>
          </button>

          <button
            v-else-if="friendStatus.status === 'pending_sent'"
            class="profile-settings__action profile-settings__action--muted"
            :disabled="actionLoading"
            @click="handleAction('cancel')"
          >
            <span class="mdi mdi-account-clock-outline profile-settings__action-icon"></span>
            <span class="profile-settings__action-copy">
              <span class="profile-settings__action-title">Request pending</span>
              <span class="profile-settings__action-subtitle">Click to cancel the request</span>
            </span>
          </button>

          <template v-else-if="friendStatus.status === 'pending_received'">
            <button
              class="profile-settings__action profile-settings__action--positive"
              :disabled="actionLoading"
              @click="handleAction('accept')"
            >
              <span class="mdi mdi-account-check-outline profile-settings__action-icon"></span>
              <span class="profile-settings__action-copy">
                <span class="profile-settings__action-title">Accept request</span>
                <span class="profile-settings__action-subtitle">{{ friendName }} wants to be friends</span>
              </span>
            </button>
            <button
              class="profile-settings__action profile-settings__action--danger"
              :disabled="actionLoading"
              @click="handleAction('decline')"
            >
              <span class="mdi mdi-account-remove-outline profile-settings__action-icon"></span>
              <span class="profile-settings__action-copy">
                <span class="profile-settings__action-title">Decline request</span>
                <span class="profile-settings__action-subtitle">Remove this pending request</span>
              </span>
            </button>
          </template>

          <button
            v-else-if="friendStatus.status === 'accepted'"
            class="profile-settings__action profile-settings__action--danger"
            :disabled="actionLoading"
            @click="handleAction('remove')"
          >
            <span class="mdi mdi-account-minus-outline profile-settings__action-icon"></span>
            <span class="profile-settings__action-copy">
              <span class="profile-settings__action-title">Remove friend</span>
              <span class="profile-settings__action-subtitle">Unfriend {{ friendName }}</span>
            </span>
          </button>

        </div>
      </section>

      <!-- Copy profile link (bottom, full width) -->
      <div class="profile-copy-row">
        <button class="profile-copy-btn" @click="copyLink">
          <span class="mdi" :class="copied ? 'mdi-check' : 'mdi-link-variant'"></span>
          {{ copied ? 'Link copied!' : 'Copy profile link' }}
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
:deep(.site-header) {
  margin-bottom: 0;
  padding-bottom: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.uprofile-error {
  margin: 0 0 14px;
  font-size: 0.84rem;
  font-weight: 600;
  color: #f87171;
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

/* ── Grid layout ─────────────────────────────────────────────── */
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

/* Non-friend actions card spans both columns */
.profile-card--actions-solo {
  grid-column: 1 / -1;
  max-width: 640px;
  justify-self: end;
  width: 100%;
}

/* Copy link row spans full width */
.profile-copy-row {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  padding-top: 4px;
}

.profile-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font: inherit;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  padding: 8px 14px;
  border-radius: 10px;
  transition: color 0.16s ease, background 0.16s ease;
}

.profile-copy-btn:hover {
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--bg-card-subtle) 60%, transparent);
}

/* ── Hero identity ───────────────────────────────────────────── */
.profile-card__identity {
  display: flex;
  align-items: center;
  gap: 18px;
}

.profile-card__avatar {
  width: 76px;
  height: 76px;
  border-radius: 50%;
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

.profile-card__name {
  margin: 0 0 4px;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--text-primary);
}

.profile-card__username {
  font-size: 0.95rem;
  color: var(--accent);
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

/* ── Stats ───────────────────────────────────────────────────── */
.profile-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

/* ── Hero top row (identity + friends count) ─────────────────── */
.profile-card__hero-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.profile-friends-count {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-card-subtle) 84%, transparent);
  padding: 10px 16px;
  color: var(--text-secondary);
  font-size: 0.92rem;
  font-weight: 700;
}

/* ── Friendship pill ─────────────────────────────────────────── */
.friendship-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.friendship-pill--friends {
  background: rgba(52, 211, 153, 0.14);
  color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.28);
}

.friendship-pill--pending {
  background: rgba(251, 146, 60, 0.14);
  color: #fb923c;
  border: 1px solid rgba(251, 146, 60, 0.28);
}

.friendship-pill--none {
  background: color-mix(in srgb, var(--text-muted) 10%, transparent);
  color: var(--text-muted);
  border: 1px solid color-mix(in srgb, var(--text-muted) 18%, transparent);
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

.profile-stat__value {
  font-size: 1.65rem;
  line-height: 1.1;
  color: var(--text-primary);
  font-weight: 800;
}

.profile-stat__value--small {
  font-size: 1rem;
}

/* ── Card header ─────────────────────────────────────────────── */
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

/* ── Action buttons (shortcuts card) ─────────────────────────── */
.profile-actions {
  display: grid;
  gap: 12px;
}

.profile-action {
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

.profile-action:hover {
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

.profile-action__title {
  font-size: 0.96rem;
  font-weight: 700;
  color: var(--text-primary);
}

.profile-action__meta {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* ── Recent lists ────────────────────────────────────────────── */
.profile-list {
  display: grid;
  gap: 12px;
}

.profile-list__item {
  width: 100%;
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  background: color-mix(in srgb, var(--bg-card-subtle) 84%, transparent);
  padding: 16px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  text-align: left;
  color: var(--text-primary);
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.profile-list__item:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--accent) 34%, var(--border-card));
  box-shadow: var(--card-shadow-md);
}

.profile-list__title {
  font-size: 0.96rem;
  font-weight: 700;
  color: var(--text-primary);
}

.profile-list__meta {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.profile-card__empty {
  margin: 0;
  color: var(--text-secondary);
}

.profile-card--visibility-full {
  grid-column: 1 / -1;
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

/* ── Settings-style actions (friend action card) ─────────────── */
.profile-settings {
  display: grid;
  gap: 10px;
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

.profile-settings__action:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--accent) 34%, var(--border-card));
  box-shadow: var(--card-shadow-md);
}

.profile-settings__action:disabled {
  opacity: 0.6;
  cursor: default;
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

.profile-settings__action--muted .profile-settings__action-icon {
  background: color-mix(in srgb, var(--text-muted) 12%, transparent);
  color: var(--text-muted);
}

.profile-settings__action--positive .profile-settings__action-icon {
  background: rgba(52, 211, 153, 0.12);
  color: #34d399;
}

.profile-settings__action--danger .profile-settings__action-icon {
  background: rgba(248, 113, 113, 0.12);
  color: #f87171;
}

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 900px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }

  .profile-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }


  .profile-card--actions-solo {
    max-width: none;
    justify-self: stretch;
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
    border-radius: 50%;
    font-size: 1.4rem;
  }

  .profile-list__item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
