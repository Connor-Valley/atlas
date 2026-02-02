const API_BASE = import.meta.env.VITE_API_BASE;

export interface StateOption {
    code: string;
    name: string;
}

export async function getStates(): Promise<StateOption[]> {
    const response = await fetch(`${API_BASE}/states`);
    if (!response.ok) {
        throw new Error("failed to fetch states");
    }
    return response.json();
}

export async function getCitiesForState(stateCode: string): Promise<{ name: string; slug: string }[]> {
    const response = await fetch(`${API_BASE}/states/${stateCode}/cities`);
    if (!response.ok) {
        throw new Error(`failed to fetch cities for state: ${stateCode}`);
    }
    return response.json();
}