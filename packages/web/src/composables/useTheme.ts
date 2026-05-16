import { ref } from 'vue';

const isDark = ref(true);

function syncBrowserThemeColor(dark: boolean) {
  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  const color = getComputedStyle(document.documentElement).getPropertyValue('--bg-main').trim();
  meta.content = color;
}

export function useTheme() {
  function apply(dark: boolean) {
    isDark.value = dark;
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('atlas-theme', dark ? 'dark' : 'light');
    syncBrowserThemeColor(dark);
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

  return { isDark, toggle, init, apply };
}
