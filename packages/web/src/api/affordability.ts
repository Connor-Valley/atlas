export async function fetchAffordability(state: string, city: string) {
  const API_BASE = import.meta.env.VITE_API_BASE;
    const res = await fetch(
      `${API_BASE}/affordability/${state}/${city}`
    );
  
    if (!res.ok) {
      throw new Error("Request failed");
    }
  
    return res.json();
  }
  