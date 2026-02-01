export async function fetchHousing(state: string, city: string) {
    const API_BASE = import.meta.env.VITE_API_BASE;
    const res = await fetch(`${API_BASE}/housing/${state}/${city}`);
    if (!res.ok) throw new Error("Failed to fetch housing");
    return res.json();
  }
  