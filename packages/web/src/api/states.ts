export interface StateOption {
    code: string;
    name: string;
}

export async function getStates(): Promise<StateOption[]> {
    const API_BASE = import.meta.env.VITE_API_BASE;
    const response = await fetch(`${API_BASE}/states`);
    if (!response.ok) {
        throw new Error("failed to fetch states");
    }
    return response.json();
}