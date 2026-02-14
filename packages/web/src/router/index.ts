import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Housing from '../views/Housing.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/housing/:state/:city',
      name: 'housing',
      component: Housing,
      props: true
    }
  ]
});

export default router;
