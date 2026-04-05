import { ref } from 'vue';

interface Toast {
  id: number;
  message: string;
  type: 'error' | 'success' | 'info';
}

let nextId = 0;
const toasts = ref<Toast[]>([]);

export function useToast() {
  function show(message: string, type: Toast['type'] = 'error', duration = 4000) {
    const id = ++nextId;
    toasts.value.push({ id, message, type });
    setTimeout(() => dismiss(id), duration);
  }

  function dismiss(id: number) {
    const idx = toasts.value.findIndex(t => t.id === id);
    if (idx !== -1) toasts.value.splice(idx, 1);
  }

  return { toasts, show, dismiss };
}
