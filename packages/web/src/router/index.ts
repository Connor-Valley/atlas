import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Search from '../views/Search.vue';
import Housing from '../views/Housing.vue';
import Favorites from '../views/Favorites.vue';
import Compare from '../views/Compare.vue';
import SavedComparisons from '../views/SavedComparisons.vue';
import Profile from '../views/Profile.vue';
import Friends from '../views/Friends.vue';
import UserProfile from '../views/UserProfile.vue';

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
  ]
});

export default router;
