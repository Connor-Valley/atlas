const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";

export async function fetchCityPhoto(state: string, city: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/city-photo/${encodeURIComponent(state)}/${encodeURIComponent(city)}`);
    if (!res.ok) return null;
    const json = await res.json() as { url: string | null };
    return json.url;
  } catch {
    return null;
  }
}
