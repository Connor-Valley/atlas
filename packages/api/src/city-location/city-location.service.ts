import { getCached } from "../common/cache.js";
import { getCitiesForState } from "../states/states.service.js";
import type { CityLocation } from "./city-location.types.js";

export type MajorCityLocation = CityLocation & { name: string; slug: string; population: number };

const USER_AGENT = "Atlas/1.0 (https://atlas.app; city data explorer)";

const STATE_NAMES: Record<string, string> = {
  al: "Alabama", ak: "Alaska", az: "Arizona", ar: "Arkansas",
  ca: "California", co: "Colorado", ct: "Connecticut", de: "Delaware",
  fl: "Florida", ga: "Georgia", hi: "Hawaii", id: "Idaho",
  il: "Illinois", in: "Indiana", ia: "Iowa", ks: "Kansas",
  ky: "Kentucky", la: "Louisiana", me: "Maine", md: "Maryland",
  ma: "Massachusetts", mi: "Michigan", mn: "Minnesota", ms: "Mississippi",
  mo: "Missouri", mt: "Montana", ne: "Nebraska", nv: "Nevada",
  nh: "New Hampshire", nj: "New Jersey", nm: "New Mexico", ny: "New York",
  nc: "North Carolina", nd: "North Dakota", oh: "Ohio", ok: "Oklahoma",
  or: "Oregon", pa: "Pennsylvania", ri: "Rhode Island", sc: "South Carolina",
  sd: "South Dakota", tn: "Tennessee", tx: "Texas", ut: "Utah",
  vt: "Vermont", va: "Virginia", wa: "Washington", wv: "West Virginia",
  wi: "Wisconsin", wy: "Wyoming",
};

// Nominatim (OpenStreetMap) — free, keyless geocoding. Usage policy caps us at ~1 request/sec
// and asks for a descriptive User-Agent; our 15-day cache means each city only ever hits this
// once. https://operations.osmfoundation.org/policies/nominatim/
async function lookupCityLocation(state: string, city: string): Promise<CityLocation | null> {
  const stateName = STATE_NAMES[state.toLowerCase()];
  if (!stateName) return null;

  const cityLabel = city
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const params = new URLSearchParams({
    format: "json",
    q: `${cityLabel}, ${stateName}, USA`,
    countrycodes: "us",
    limit: "1",
  });

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return null;

    const results = await res.json() as Array<{ lat: string; lon: string }>;
    const first = results[0];
    if (!first) return null;

    return { lat: parseFloat(first.lat), lng: parseFloat(first.lon) };
  } catch {
    return null;
  }
}

export async function getCityLocation(state: string, city: string): Promise<CityLocation | null> {
  const key = `location:${state.toLowerCase()}:${city.toLowerCase()}`;
  return getCached<CityLocation | null>(
    key,
    () => lookupCityLocation(state, city),
    { shouldCache: (r) => r !== null }
  );
}

// Most-populous cities in the state, for the "quiet" context dots on the map. Geocoded
// sequentially (not Promise.all) to stay within Nominatim's ~1 req/sec usage policy on a cold
// cache — each city is cached individually afterward, so repeat opens are instant.
export async function getMajorCitiesInState(
  state: string,
  excludeSlug: string,
  limit = 8
): Promise<MajorCityLocation[]> {
  let ranked: Array<{ name: string; slug: string; population: number }>;
  try {
    ranked = await getCitiesForState(state);
  } catch {
    return [];
  }
  const candidates = ranked.filter((c) => c.slug !== excludeSlug).slice(0, limit);

  const results: MajorCityLocation[] = [];
  for (const candidate of candidates) {
    const location = await getCityLocation(state, candidate.slug);
    if (location) {
      results.push({ ...location, name: candidate.name, slug: candidate.slug, population: candidate.population });
    }
  }
  return results;
}
