export async function fetchCity(state: string, city: string) {
    const API_BASE = import.meta.env.VITE_API_BASE;
    const res = await fetch(`${API_BASE}/cities/${state}/${city}`);
    if (!res.ok) throw new Error("Failed to fetch city");
    return res.json();
  }
  