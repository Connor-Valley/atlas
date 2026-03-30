import { ref } from 'vue';

const isDark = ref(true);

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
      apply(true);
    }
  }

  return { isDark, toggle, init, apply };
}
