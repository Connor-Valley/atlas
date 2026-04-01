const incomeCache = new Map<string, Promise<any>>();
const detailedIncomeCache = new Map<string, Promise<any>>();

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
  const cached = incomeCache.get(key);
  if (cached) return cached;

  const request = loader().catch((error) => {
    incomeCache.delete(key);
    throw error;
  });

  incomeCache.set(key, request);
  return request;
}

export async function fetchIncome(state: string, city: string) {
  const key = createKey(state, city);
  return getCached(key, () => fetchJson(`/income/${state}/${city}`));
}

export function prefetchIncome(state: string, city: string) {
  return fetchIncome(state, city);
}

export async function fetchDetailedIncome(state: string, city: string) {
  const key = createKey(state, city);
  const cached = detailedIncomeCache.get(key);
  if (cached) return cached;
  const request = fetchJson(`/income/${state}/${city}/details`).catch((error) => {
    detailedIncomeCache.delete(key);
    throw error;
  });
  detailedIncomeCache.set(key, request);
  return request;
}
