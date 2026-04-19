const PHOTO_BLOCKLIST = [
  "house",
  "houses",
  "home",
  "homes",
  "residential",
  "suburb",
  "bungalow",
  "cottage",
  "villa",
  "neighborhood",
  "flag",
  "seal",
  "coat_of_arms",
  ".svg",
  "_map",
  "map_",
  "openstreetmap",
  "osm_",
  "street_map",
  "locator",
  "location_map",
  "location.",
  "_location",
  "topograph",
  "cloud",
  "sunset",
  "sunrise",
  "mountain",
  "lake",
  "river",
  "ocean",
  "sea",
  "beach",
  "forest",
  "prairie",
  "nature",
  "landscape",
];

const STATE_NAMES: Record<string, string> = {
  al: "Alabama", ak: "Alaska", az: "Arizona", ar: "Arkansas",
  ca: "California", co: "Colorado", ct: "Connecticut", de: "Delaware",
  fl: "Florida", ga: "Georgia", hi: "Hawaii", id: "Idaho",
  il: "Illinois", in: "Indiana", ia: "Iowa", ks: "Kansas",
  ky: "Kentucky", la: "Louisiana", me: "Maine", md: "Maryland",
  ma: "Massachusetts", mi: "Michigan", mn: "Minnesota", ms: "Mississippi",
  mo: "Missouri", mt: "Montana", ne: "Nebraska", nv: "Nevada",
  nh: "New_Hampshire", nj: "New_Jersey", nm: "New_Mexico", ny: "New_York",
  nc: "North_Carolina", nd: "North_Dakota", oh: "Ohio", ok: "Oklahoma",
  or: "Oregon", pa: "Pennsylvania", ri: "Rhode_Island", sc: "South_Carolina",
  sd: "South_Dakota", tn: "Tennessee", tx: "Texas", ut: "Utah",
  vt: "Vermont", va: "Virginia", wa: "Washington", wv: "West_Virginia",
  wi: "Wisconsin", wy: "Wyoming",
};

async function tryWikipediaPhoto(title: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const img = json.originalimage ?? json.thumbnail;
    if (!img) return null;
    if (img.width <= img.height) return null;
    const filename = img.source.toLowerCase();
    if (PHOTO_BLOCKLIST.some((kw) => filename.includes(kw))) return null;
    return img.source;
  } catch {
    return null;
  }
}

async function searchCommonsPhoto(query: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: query,
      gsrnamespace: "6",
      gsrlimit: "15",
      prop: "imageinfo",
      iiprop: "url|dimensions",
      format: "json",
      origin: "*",
    });
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
    if (!res.ok) return null;
    const json = await res.json();
    const pages = Object.values(json.query?.pages ?? {}) as any[];
    for (const page of pages) {
      const info = page.imageinfo?.[0];
      if (!info?.url) continue;
      if (info.width <= info.height) continue;
      const lower = info.url.toLowerCase();
      if (PHOTO_BLOCKLIST.some((kw) => lower.includes(kw))) continue;
      if (!lower.match(/\.(jpg|jpeg|png|webp)$/)) continue;
      return info.url;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchCityPhoto(state: string, city: string): Promise<string | null> {
  const title = city
    .split("-")
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("_");

  const stateName = STATE_NAMES[state.toLowerCase()];
  const cityState = stateName ? `${title},_${stateName.replace(/ /g, "_")}` : null;
  const cityLabel = title.replace(/_/g, " ");
  const stateLabel = stateName ?? "";

  return (
    await tryWikipediaPhoto(`Downtown_${title}`)
    ?? await tryWikipediaPhoto(`${title}_skyline`)
    ?? await tryWikipediaPhoto(`${title}_downtown`)
    ?? (cityState ? await tryWikipediaPhoto(cityState) : null)
    ?? await searchCommonsPhoto(`${cityLabel} ${stateLabel} downtown skyline`)
    ?? await searchCommonsPhoto(`${cityLabel} ${stateLabel} skyline`)
    ?? await searchCommonsPhoto(`${cityLabel} ${stateLabel} downtown`)
    ?? await searchCommonsPhoto(`${cityLabel} skyline`)
  );
}
