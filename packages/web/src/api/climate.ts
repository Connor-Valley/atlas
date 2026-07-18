const cache = new Map<string, Promise<any>>();

function createKey(state: string, city: string) {
  return `${state.toLowerCase()}::${city.toLowerCase()}`;
}

async function fetchJson(path: string) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE}${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return res.json();
}

function getCached(key: string, loader: () => Promise<any>) {
  const cached = cache.get(key);
  if (cached) return cached;
  const request = loader().catch((err) => { cache.delete(key); throw err; });
  cache.set(key, request);
  return request;
}

export async function fetchClimate(state: string, city: string) {
  const key = createKey(state, city);
  return getCached(key, () => fetchJson(`/climate/${state}/${city}`));
}

export function prefetchClimate(state: string, city: string) {
  fetchClimate(state, city);
}
