const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";

export type CityLocation = {
  lat: number;
  lng: number;
};

export async function fetchCityLocation(state: string, city: string): Promise<CityLocation | null> {
  try {
    const res = await fetch(`${API_BASE}/city-location/${encodeURIComponent(state)}/${encodeURIComponent(city)}`);
    if (!res.ok) return null;
    return await res.json() as CityLocation | null;
  } catch {
    return null;
  }
}

export type MajorCityLocation = CityLocation & { name: string; slug: string; population: number };

export async function fetchMajorCitiesInState(state: string, excludeSlug: string, limit = 20): Promise<MajorCityLocation[]> {
  try {
    const res = await fetch(`${API_BASE}/city-location/${encodeURIComponent(state)}/major-cities/${encodeURIComponent(excludeSlug)}?limit=${limit}`);
    if (!res.ok) return [];
    return await res.json() as MajorCityLocation[];
  } catch {
    return [];
  }
}
