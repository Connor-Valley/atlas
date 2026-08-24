import { ref } from 'vue';

const showAuthModal = ref(false);
const authModalMode = ref<'login' | 'register'>('login');

export function useAuthModal() {
  function openAuthModal(mode: 'login' | 'register' = 'login') {
    authModalMode.value = mode;
    showAuthModal.value = true;
  }
  function closeAuthModal() {
    showAuthModal.value = false;
  }
  return { showAuthModal, authModalMode, openAuthModal, closeAuthModal };
}
