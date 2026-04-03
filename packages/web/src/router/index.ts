import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Housing from '../views/Housing.vue';
import Favorites from '../views/Favorites.vue';
import Compare from '../views/Compare.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/city/:state/:city',
      name: 'city',
      component: Home,
      props: true
    },
    {
      path: '/housing/:state/:city',
      name: 'housing',
      component: Housing,
      props: true
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
    }
  ]
});

export default router;
