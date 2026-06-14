import { getCached } from "../common/cache.js";

const USER_AGENT = "Atlas/1.0 (https://atlas.app; city data explorer)";

const CITY_BLOCKLIST = [
  "house", "houses", "home", "homes", "residential", "suburb",
  "bungalow", "cottage", "villa", "neighborhood", "flag", "seal",
  "coat_of_arms", ".svg", "_map", "map_", "openstreetmap", "osm_",
  "street_map", "locator", "location_map", "location.", "_location",
  "topograph",
];

// Looser blocklist for vibe/fallback images — nature scenes are welcome
const VIBE_BLOCKLIST = [
  "flag", "seal", "coat_of_arms", ".svg", "_map", "map_",
  "openstreetmap", "osm_", "street_map", "locator", "location_map",
  "location.", "_location", "topograph",
];

// ── Regional vibe fallbacks ────────────────────────────────────────────────────

type Region =
  | "pacific_northwest" | "california" | "desert_southwest" | "rocky_mountain"
  | "great_plains" | "midwest" | "new_england" | "mid_atlantic"
  | "southeast" | "florida" | "texas" | "alaska" | "hawaii";

const STATE_REGION: Record<string, Region> = {
  ak: "alaska",   hi: "hawaii",
  wa: "pacific_northwest", or: "pacific_northwest",
  ca: "california",
  az: "desert_southwest", nv: "desert_southwest", nm: "desert_southwest",
  ut: "rocky_mountain", co: "rocky_mountain", mt: "rocky_mountain",
  id: "rocky_mountain", wy: "rocky_mountain",
  nd: "great_plains", sd: "great_plains", ne: "great_plains", ks: "great_plains",
  mn: "midwest", wi: "midwest", mi: "midwest", il: "midwest",
  in: "midwest", oh: "midwest", ia: "midwest", mo: "midwest",
  me: "new_england", vt: "new_england", nh: "new_england",
  ma: "new_england", ct: "new_england", ri: "new_england",
  ny: "mid_atlantic", nj: "mid_atlantic", pa: "mid_atlantic",
  md: "mid_atlantic", de: "mid_atlantic", va: "mid_atlantic", wv: "mid_atlantic",
  nc: "southeast", sc: "southeast", ga: "southeast", al: "southeast",
  ms: "southeast", tn: "southeast", ky: "southeast", ar: "southeast", la: "southeast",
  fl: "florida",
  tx: "texas", ok: "texas",
};

const REGION_SEARCHES: Record<Region, string[]> = {
  pacific_northwest: ["pacific northwest old growth forest", "cascade mountains forest"],
  california:        ["california golden hills oak", "california coast cliffs"],
  desert_southwest:  ["sonoran desert saguaro cactus", "red rock desert southwest"],
  rocky_mountain:    ["rocky mountains alpine meadow", "colorado rockies landscape"],
  great_plains:      ["great plains grassland", "midwest prairie landscape"],
  midwest:           ["midwest autumn forest", "great lakes shoreline"],
  new_england:       ["new england autumn foliage", "new england forest fall colors"],
  mid_atlantic:      ["appalachian mountains forest", "chesapeake bay landscape"],
  southeast:         ["southern live oak spanish moss", "appalachian foothills forest"],
  florida:           ["florida subtropical palm", "florida everglades wetlands"],
  texas:             ["texas hill country wildflowers", "texas bluebonnets landscape"],
  alaska:            ["alaska wilderness mountains glacier", "denali national park"],
  hawaii:            ["hawaii tropical volcanic landscape", "hawaii lush green valley"],
};

// ── Fetch helpers ─────────────────────────────────────────────────────────────

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

function isLandscape(w: number, h: number): boolean {
  return w > h;
}

async function tryWikipediaPhoto(title: string, blocklist = CITY_BLOCKLIST): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { "User-Agent": USER_AGENT } }
    );
    if (!res.ok) return null;
    const json = await res.json() as any;
    const img = json.originalimage ?? json.thumbnail;
    if (!img) return null;
    if (!isLandscape(img.width, img.height)) return null;
    const filename = img.source.toLowerCase();
    if (blocklist.some((kw) => filename.includes(kw))) return null;
    return img.source as string;
  } catch {
    return null;
  }
}

async function searchCommonsPhoto(query: string, blocklist = CITY_BLOCKLIST): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: query,
      gsrnamespace: "6",
      gsrlimit: "20",
      prop: "imageinfo",
      iiprop: "url|dimensions",
      format: "json",
    });
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return null;
    const json = await res.json() as any;
    const pages = Object.values(json.query?.pages ?? {}) as any[];
    const candidates: Array<{ url: string; pixels: number }> = [];

    for (const page of pages) {
      const info = page.imageinfo?.[0];
      if (!info?.url) continue;
      if (!isLandscape(info.width, info.height)) continue;
      const lower = info.url.toLowerCase();
      if (blocklist.some((kw) => lower.includes(kw))) continue;
      if (!lower.match(/\.(jpg|jpeg|png|webp)(\?|$)/)) continue;
      candidates.push({ url: info.url as string, pixels: info.width * info.height });
    }

    candidates.sort((a, b) => b.pixels - a.pixels);
    return candidates[0]?.url ?? null;
  } catch {
    return null;
  }
}

// ── Lookup strategies ─────────────────────────────────────────────────────────

async function lookupCityPhoto(state: string, city: string): Promise<string | null> {
  const title = city
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("_");

  const stateName = STATE_NAMES[state.toLowerCase()];
  const stateSlug = stateName?.replace(/ /g, "_") ?? "";
  const cityState = stateSlug ? `${title},_${stateSlug}` : null;
  const cityLabel = title.replace(/_/g, " ");
  const stateLabel = stateName ?? "";

  // Wikipedia article variants — most reliable when they exist
  const wikiAttempts = [
    `${title}_skyline`,
    `Downtown_${title}`,
    `${title}_downtown`,
    cityState,
    title,
  ].filter(Boolean) as string[];

  for (const attempt of wikiAttempts) {
    const url = await tryWikipediaPhoto(attempt);
    if (url) return url;
  }

  // Commons searches — always include a city-intent keyword to avoid unrelated location-tagged photos
  const commonsQueries = [
    `${cityLabel} ${stateLabel} skyline`,
    `${cityLabel} ${stateLabel} downtown`,
    `${cityLabel} ${stateLabel} aerial view`,
    `${cityLabel} skyline`,
    `${cityLabel} downtown`,
  ];

  for (const query of commonsQueries) {
    const url = await searchCommonsPhoto(query);
    if (url) return url;
  }

  return null;
}

async function lookupVibePhoto(state: string): Promise<string | null> {
  const region = STATE_REGION[state.toLowerCase()];
  if (!region) return null;

  const queries = REGION_SEARCHES[region];
  for (const query of queries) {
    const url = await searchCommonsPhoto(query, VIBE_BLOCKLIST);
    if (url) return url;
  }
  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getCityPhoto(state: string, city: string): Promise<string | null> {
  const key = `photo:${state.toLowerCase()}:${city.toLowerCase()}`;
  const result = await getCached<{ url: string | null }>(
    key,
    async () => {
      const url = await lookupCityPhoto(state, city) ?? await lookupVibePhoto(state);
      return { url };
    },
    { shouldCache: (r) => r.url !== null }
  );
  return result.url;
}
