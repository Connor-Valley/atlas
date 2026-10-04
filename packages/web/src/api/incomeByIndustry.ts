export type SeniorityLevel = "entry" | "mid" | "senior";

export type IndustrySalaryTier = {
  level: SeniorityLevel;
  annualWage: number | null;
};

export type IndustrySalaryData = {
  industry: string;
  industryLabel: string;
  tiers: IndustrySalaryTier[];
  employment: number | null;
  employmentPerThousand: number | null;
  locationQuotient: number | null;
  geographyLevel: "msa" | "state";
  geographyName: string;
  year: number;
  source: string;
};

const cache = new Map<string, Promise<IndustrySalaryData | null>>();

function createKey(state: string, city: string, industry: string) {
  return `${state.toLowerCase()}::${city.toLowerCase()}::${industry}`;
}

export async function fetchIndustrySalary(
  state: string,
  city: string,
  industry: string
): Promise<IndustrySalaryData | null> {
  const key = createKey(state, city, industry);
  const cached = cache.get(key);
  if (cached) return cached;

  const request = (async () => {
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/income-by-industry/${state}/${city}/${industry}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch income-by-industry for ${state}/${city}/${industry}`);
    return res.json();
  })().catch((err) => { cache.delete(key); throw err; });

  cache.set(key, request);
  return request;
}
