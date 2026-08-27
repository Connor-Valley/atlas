<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: 'auto' | 'light' | 'dark';
          appearance?: 'always' | 'execute' | 'interaction-only';
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
  theme?: 'auto' | 'light' | 'dark';
  appearance?: 'always' | 'execute' | 'interaction-only';
}>();

const emit = defineEmits<{
  (e: 'verified', token: string): void;
  (e: 'expired'): void;
  (e: 'error', message: string): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
let widgetId: string | number | null = null;

let turnstileScriptPromise: Promise<void> | null = null;

function loadScript() {
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile-script="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Cloudflare Turnstile.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.turnstileScript = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Cloudflare Turnstile.'));
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

async function renderWidget() {
  if (!containerRef.value) return;

  try {
    await loadScript();
    if (!window.turnstile) throw new Error('Cloudflare Turnstile is not available.');

    widgetId = window.turnstile.render(containerRef.value, {
      sitekey: props.siteKey,
      theme: props.theme ?? 'auto',
      appearance: props.appearance ?? 'always',
      callback: (token: string) => emit('verified', token),
      'expired-callback': () => emit('expired'),
      'error-callback': () => emit('error', 'Unable to verify Cloudflare Turnstile right now.'),
    });
  } catch (error) {
    emit('error', error instanceof Error ? error.message : 'Unable to load Cloudflare Turnstile.');
  }
}

onMounted(() => {
  renderWidget();
});

onBeforeUnmount(() => {
  if (widgetId !== null && window.turnstile?.remove) {
    window.turnstile.remove(widgetId);
  }
});
</script>

<template>
  <div class="turnstile-widget" :class="{ 'turnstile-widget--invisible': appearance === 'interaction-only' }">
    <div ref="containerRef"></div>
  </div>
</template>

<style scoped>
.turnstile-widget {
  display: flex;
  justify-content: center;
  min-height: 78px;
}

/* interaction-only renders nothing visible in the common case — don't reserve space for a
   checkbox that isn't there, unless Cloudflare actually surfaces a challenge. */
.turnstile-widget--invisible {
  min-height: 0;
}
</style>
