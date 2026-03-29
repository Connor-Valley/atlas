import { createApp } from 'vue';
import "./styles.css";
import '@mdi/font/css/materialdesignicons.min.css';
import App from './App.vue';
import router from './router';

createApp(App).use(router).mount('#app');
