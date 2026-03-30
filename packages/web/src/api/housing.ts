const housingCache = new Map<string, Promise<any>>();
const detailedHousingCache = new Map<string, Promise<any>>();

function createKey(state: string, city: string) {
  return `${state.toLowerCase()}::${city.toLowerCase()}`;
}

async function fetchJson(path: string) {
  const API_BASE = import.meta.env.VITE_API_BASE;
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return res.json();
}

function getCached(
  cache: Map<string, Promise<any>>,
  key: string,
  loader: () => Promise<any>,
) {
  const cached = cache.get(key);
  if (cached) return cached;

  const request = loader().catch((error) => {
    cache.delete(key);
    throw error;
  });

  cache.set(key, request);
  return request;
}

export async function fetchHousing(state: string, city: string) {
  const key = createKey(state, city);
  return getCached(housingCache, key, () => fetchJson(`/housing/${state}/${city}`));
}

export async function fetchDetailedHousing(state: string, city: string) {
  const key = createKey(state, city);
  return getCached(
    detailedHousingCache,
    key,
    () => fetchJson(`/housing/${state}/${city}/details`),
  );
}

export function prefetchDetailedHousing(state: string, city: string) {
  return fetchDetailedHousing(state, city);
}
