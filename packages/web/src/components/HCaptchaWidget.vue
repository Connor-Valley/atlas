<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

declare global {
  interface Window {
    hcaptcha?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: 'light' | 'dark';
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string | number;
      reset: (widgetId?: string | number) => void;
      remove?: (widgetId: string | number) => void;
    };
  }
}

const props = defineProps<{
  siteKey: string;
  theme?: 'light' | 'dark';
}>();

const emit = defineEmits<{
  (e: 'verified', token: string): void;
  (e: 'expired'): void;
  (e: 'error', message: string): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
let widgetId: string | number | null = null;

let hcaptchaScriptPromise: Promise<void> | null = null;

function loadScript() {
  if (window.hcaptcha) return Promise.resolve();
  if (hcaptchaScriptPromise) return hcaptchaScriptPromise;

  hcaptchaScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-hcaptcha-script="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load hCaptcha.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.hcaptchaScript = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load hCaptcha.'));
    document.head.appendChild(script);
  });

  return hcaptchaScriptPromise;
}

async function renderWidget() {
  if (!containerRef.value) return;

  try {
    await loadScript();
    if (!window.hcaptcha) throw new Error('hCaptcha is not available.');

    widgetId = window.hcaptcha.render(containerRef.value, {
      sitekey: props.siteKey,
      theme: props.theme ?? 'light',
      callback: (token: string) => emit('verified', token),
      'expired-callback': () => emit('expired'),
      'error-callback': () => emit('error', 'Unable to verify hCaptcha right now.'),
    });
  } catch (error) {
    emit('error', error instanceof Error ? error.message : 'Unable to load hCaptcha.');
  }
}

onMounted(() => {
  renderWidget();
});

onBeforeUnmount(() => {
  if (widgetId !== null && window.hcaptcha?.remove) {
    window.hcaptcha.remove(widgetId);
  }
});
</script>

<template>
  <div class="hcaptcha-widget">
    <div ref="containerRef"></div>
  </div>
</template>

<style scoped>
.hcaptcha-widget {
  display: flex;
  justify-content: center;
  min-height: 78px;
}
</style>
