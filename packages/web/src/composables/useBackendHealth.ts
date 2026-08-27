import { ref } from 'vue';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';

// Module-level singleton — the health check should run once per page load,
// not once per component instance.
const isAwake = ref(false);
const isChecking = ref(true);
let started = false;

async function pingOnce(timeoutMs: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}

// First attempt is short — if the backend is already warm this resolves almost
// instantly and nobody sees the loading page. Once we know it's cold, back off
// to a slower poll since a real cold start takes 30-60s to finish booting.
async function start() {
  if (started) return;
  started = true;

  if (await pingOnce(2500)) {
    isAwake.value = true;
    isChecking.value = false;
    return;
  }

  isChecking.value = false; // stop showing an initial spinner; the waking-up page takes over

  while (!(await pingOnce(5000))) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  isAwake.value = true;
}

export function useBackendHealth() {
  start();
  return { isAwake, isChecking };
}
