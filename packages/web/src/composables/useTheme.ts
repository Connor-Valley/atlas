import { ref } from 'vue';

const isDark = ref(false);

export function useTheme() {
  function apply(dark: boolean) {
    isDark.value = dark;
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('atlas-theme', dark ? 'dark' : 'light');
  }

  function toggle() {
    apply(!isDark.value);
  }

  function init() {
    const saved = localStorage.getItem('atlas-theme');
    if (saved) {
      apply(saved === 'dark');
    } else {
      apply(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }

  return { isDark, toggle, init };
}
