export async function fetchCity(state: string, city: string) {
  const API_BASE = import.meta.env.VITE_API_BASE;
  const res = await fetch(`${API_BASE}/cities/${state}/${city}`);

  if (!res.ok) {
    let message = "Failed to fetch city";
    try {
      const body = await res.json();
      if (typeof body?.error === "string") {
        message = body.error;
      }
    } catch {
      // Keep the default message when the response isn't JSON.
    }

    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }

  return res.json();
}
  
