export async function fetchHousing(state: string, city: string) {
    const API_BASE = import.meta.env.VITE_API_BASE;
    const res = await fetch(`${API_BASE}/housing/${state}/${city}`);
    if (!res.ok) throw new Error("Failed to fetch housing");
    return res.json();
  }

export async function fetchDetailedHousing(state: string, city: string) {
    const API_BASE = import.meta.env.VITE_API_BASE;
    const res = await fetch(`${API_BASE}/housing/${state}/${city}/details`);
    if (!res.ok) throw new Error("Failed to fetch detailed housing");
    return res.json();
  }
