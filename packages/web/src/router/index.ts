import { createRouter, createWebHistory } from 'vue-router';
import { watch } from 'vue';
import { useAuth } from '../composables/useAuth';
import { useAuthModal } from '../composables/useAuthModal';
import Home from '../views/Home.vue';
import Search from '../views/Search.vue';
import StateBrowse from '../views/StateBrowse.vue';
import Housing from '../views/Housing.vue';
import Favorites from '../views/Favorites.vue';
import Compare from '../views/Compare.vue';
import SavedComparisons from '../views/SavedComparisons.vue';
import Profile from '../views/Profile.vue';
import Friends from '../views/Friends.vue';
import UserProfile from '../views/UserProfile.vue';
import About from '../views/About.vue';
import DataSources from '../views/DataSources.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/search',
      name: 'search',
      component: Search
    },
    {
      path: '/state/:code',
      name: 'state-browse',
      component: StateBrowse,
      props: true
    },
    {
      path: '/city/:state/:city',
      name: 'city',
      component: Home,
      props: true
    },
    {
      path: '/city/:state/:city/income',
      name: 'city-income',
      component: Home,
      props: (route) => ({ state: route.params.state, city: route.params.city, section: 'economic' })
    },
    {
      path: '/city/:state/:city/housing',
      name: 'city-housing',
      component: Home,
      props: (route) => ({ state: route.params.state, city: route.params.city, section: 'housing' })
    },
    {
      path: '/city/:state/:city/city-details',
      name: 'city-details',
      component: Home,
      props: (route) => ({ state: route.params.state, city: route.params.city, section: 'city' })
    },
    {
      path: '/city/:state/:city/affordability',
      name: 'city-affordability',
      component: Home,
      props: (route) => ({ state: route.params.state, city: route.params.city, section: 'affordability' })
    },
    {
      path: '/city/:state/:city/climate',
      name: 'city-climate',
      component: Home,
      props: (route) => ({ state: route.params.state, city: route.params.city, section: 'climate' })
    },
    {
      path: '/city/:state/:city/lifestyle',
      name: 'city-lifestyle',
      component: Home,
      props: (route) => ({ state: route.params.state, city: route.params.city, section: 'lifestyle' })
    },
    {
      path: '/housing/:state/:city',
      name: 'housing',
      component: Housing,
      props: true
    },
    {
      path: '/compare',
      name: 'compare-empty',
      component: Compare
    },
    {
      path: '/about',
      name: 'about',
      component: About
    },
    {
      path: '/data-sources',
      name: 'data-sources',
      component: DataSources
    },
    {
      path: '/compare/:stateA/:cityA/:stateB?/:cityB?',
      name: 'compare',
      component: Compare,
      props: (route) => ({
        stateA: route.params.stateA,
        cityA: route.params.cityA,
        stateB: route.params.stateB,
        cityB: route.params.cityB
      })
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: Favorites
    },
    {
      path: '/saved-comparisons',
      name: 'saved-comparisons',
      component: SavedComparisons
    },
    {
      path: '/user/:username/favorites',
      name: 'user-favorites',
      component: Favorites,
      props: true
    },
    {
      path: '/user/:username/comparisons',
      name: 'user-comparisons',
      component: SavedComparisons,
      props: true
    },
    {
      path: '/profile',
      name: 'profile',
      component: Profile
    },
    {
      path: '/friends',
      name: 'friends',
      component: Friends
    },
    {
      path: '/user/:username',
      name: 'user-profile',
      component: UserProfile,
      props: true
    }
  ],
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition;
    return { top: 0 };
  }
});

// Waits out the transient `loading === true` window while the Supabase session is still being
// restored, so a real signed-in user isn't treated as signed-out before their session resolves.
async function waitForAuthResolved() {
  const { loading } = useAuth();
  if (!loading.value) return;
  await new Promise<void>((resolve) => {
    const stop = watch(loading, (isLoading) => {
      if (!isLoading) {
        stop();
        resolve();
      }
    });
  });
}

// Signed-out visitors hitting /profile directly (bookmark, typed URL, back button) should never
// see the profile shell — cancel the navigation, stay on whatever page they were already on, and
// pop the sign-in modal there instead.
router.beforeEach(async (to, from) => {
  if (to.name !== 'profile') return true;

  await waitForAuthResolved();
  const { user } = useAuth();

  if (!user.value) {
    useAuthModal().openAuthModal('login');
    // Cancelling leaves you on whatever page you were already viewing. But on a cold load
    // straight to /profile there's no "from" page to fall back to, so send that case home
    // instead of cancelling into a blank router-view.
    return from.matched.length ? false : { name: 'home' };
  }
  return true;
});

// Signed-in users hitting the bare landing route ("/") should skip the marketing hero and go
// straight to /search — the hero's sign-up pitch has nothing to offer someone already logged in.
// The "/" button in DashboardHeader deliberately opts back into the landing page via
// ?view=landing — that's a real user's forced trip home and must not get bounced back to /search.
router.beforeEach(async (to) => {
  if (to.name !== 'home' || to.query.view === 'landing') return true;

  await waitForAuthResolved();
  const { user } = useAuth();

  if (user.value) {
    return { name: 'search' };
  }
  return true;
});

export default router;
