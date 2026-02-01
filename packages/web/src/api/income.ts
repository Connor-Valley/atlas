export async function fetchIncome(state: string, city: string) {
    const API_BASE = import.meta.env.VITE_API_BASE;
    const res = await fetch(`${API_BASE}/income/${state}/${city}`);
    if (!res.ok) throw new Error("Failed to fetch income");
    return res.json();
  }
  