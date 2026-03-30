const affordabilityCache = new Map<string, Promise<any>>();

function createKey(state: string, city: string) {
  return `${state.toLowerCase()}::${city.toLowerCase()}`;
}

async function fetchJson(path: string) {
  const API_BASE = import.meta.env.VITE_API_BASE;
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return res.json();
}

function getCached(key: string, loader: () => Promise<any>) {
  const cached = affordabilityCache.get(key);
  if (cached) return cached;

  const request = loader().catch((error) => {
    affordabilityCache.delete(key);
    throw error;
  });

  affordabilityCache.set(key, request);
  return request;
}

export async function fetchAffordability(state: string, city: string) {
  const key = createKey(state, city);
  return getCached(key, () => fetchJson(`/affordability/${state}/${city}`));
}

export function prefetchAffordability(state: string, city: string) {
  return fetchAffordability(state, city);
}
