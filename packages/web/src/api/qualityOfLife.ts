const cache = new Map<string, Promise<any>>();
const detailedCache = new Map<string, Promise<any>>();

function createKey(state: string, city: string) {
  return `${state.toLowerCase()}::${city.toLowerCase()}`;
}

async function fetchJson(path: string) {
  const API_BASE = import.meta.env.VITE_API_BASE;
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return res.json();
}

export async function fetchQualityOfLife(state: string, city: string) {
  const key = createKey(state, city);
  const cached = cache.get(key);
  if (cached) return cached;
  const request = fetchJson(`/quality-of-life/${state}/${city}`).catch((err) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, request);
  return request;
}

export async function fetchDetailedQualityOfLife(state: string, city: string) {
  const key = createKey(state, city);
  const cached = detailedCache.get(key);
  if (cached) return cached;
  const request = fetchJson(`/quality-of-life/${state}/${city}/details`).catch((err) => {
    detailedCache.delete(key);
    throw err;
  });
  detailedCache.set(key, request);
  return request;
}

export function prefetchDetailedQualityOfLife(state: string, city: string) {
  return fetchDetailedQualityOfLife(state, city);
}
