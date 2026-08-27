import { trackCall } from "./metrics.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

// A single failed attempt (network blip, upstream 429/5xx) shouldn't be treated the same as
// "this data doesn't exist" — that distinction is what negative-caching downstream needs to
// be correct. `label` is also used as the metrics.trackCall bucket for this upstream.
export async function fetchWithRetry(url: string, label: string, attempts = 3): Promise<Response | null> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      void trackCall(label);
      const res = await fetch(url);
      if (res.ok) return res;
      if (!RETRYABLE_STATUSES.has(res.status)) {
        console.error(`[${label}] returned non-retryable status`, { status: res.status, url });
        return null;
      }
      console.warn(`[${label}] returned ${res.status}, attempt ${attempt}/${attempts}`);
    } catch (e) {
      console.warn(`[${label}] request failed, attempt ${attempt}/${attempts}`, { error: (e as Error).message });
    }
    if (attempt < attempts) await sleep(300 * 2 ** (attempt - 1));
  }
  console.error(`[${label}] failed after ${attempts} attempts`, { url });
  return null;
}
