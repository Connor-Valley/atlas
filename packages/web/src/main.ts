import { createApp } from 'vue';
import { inject } from '@vercel/analytics';
import "./styles.css";
import '@mdi/font/css/materialdesignicons.min.css';
import App from './App.vue';
import router from './router';

inject();

createApp(App).use(router).mount('#app');
