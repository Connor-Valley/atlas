import { STATE_FIPS, type SupportedState } from "../states/states.types.js";
import { toNumber } from "../common/census.js";

export type PlaceType =
  | "city"
  | "town"
  | "village"
  | "borough"
  | "municipality"
  | "township"
  | "cdp"
  | "unified-government"
  | "urban-county"
  | "unknown";

export type ResolvedPlace = {
  fullName: string;
  baseName: string;
  displayName: string;
  slug: string;
  aliases: string[];
  placeType: PlaceType;
  geographyType: "place" | "county-subdivision";
  state: string;
  stateFips: string;
  countyFips: string;
  placeCode: string;
  population: number;
  // County Census bakes into the NAME field itself to disambiguate two
  // same-named places in the state, e.g. "Kailua CDP (Hawaii County)" — set
  // only when present, so it can be used for our own disambiguation display.
  countyHint: string | null;
};

type ListedPlace = {
  name: string;
  slug: string;
  place: ResolvedPlace;
};

const PREFIX_PATTERNS: Array<{ regex: RegExp; placeType: PlaceType }> = [
  { regex: /^city of\s+/i, placeType: "city" },
  { regex: /^town of\s+/i, placeType: "town" },
  { regex: /^village of\s+/i, placeType: "village" },
  { regex: /^borough of\s+/i, placeType: "borough" },
  { regex: /^municipality of\s+/i, placeType: "municipality" },
  { regex: /^township of\s+/i, placeType: "township" },
];

const SUFFIX_PATTERNS: Array<{ regex: RegExp; placeType: PlaceType; priority: number }> = [
  { regex: /\s+city$/i, placeType: "city", priority: 8 },
  { regex: /\s+town$/i, placeType: "town", priority: 7 },
  { regex: /\s+village$/i, placeType: "village", priority: 7 },
  { regex: /\s+borough$/i, placeType: "borough", priority: 7 },
  { regex: /\s+municipality$/i, placeType: "municipality", priority: 7 },
  { regex: /\s+charter township$/i, placeType: "township", priority: 6 },
  { regex: /\s+township$/i, placeType: "township", priority: 6 },
  { regex: /\s+cdp$/i, placeType: "cdp", priority: 3 },
  { regex: /\s+unified government$/i, placeType: "unified-government", priority: 5 },
  { regex: /\s+urban county$/i, placeType: "urban-county", priority: 5 },
];

const placeCache = new Map<string, Promise<ResolvedPlace[]>>();

export async function getResolvedPlacesForState(
  state: string,
  year: number,
): Promise<ResolvedPlace[]> {
  const stateCode = state.toUpperCase() as SupportedState;
  const stateFips = STATE_FIPS[stateCode];

  if (!stateFips) {
    throw new Error(`Unsupported state: ${stateCode}`);
  }

  const cacheKey = `${year}:${stateCode}`;
  const cached = placeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const request = fetchResolvedPlaces(stateCode, stateFips, year);
  placeCache.set(cacheKey, request);

  try {
    return await request;
  } catch (error) {
    placeCache.delete(cacheKey);
    throw error;
  }
}

export async function getListedPlacesForState(
  state: string,
  year: number,
): Promise<Array<{ name: string; slug: string; population: number }>> {
  const listed = await getListedResolvedPlacesForState(state, year);
  return listed.map(({ name, slug, place }) => ({ name, slug, population: place.population }));
}

export async function resolvePlace(
  state: string,
  citySlug: string,
  year: number,
): Promise<ResolvedPlace> {
  const places = await getResolvedPlacesForState(state, year);
  // Multiple same-named places across counties (e.g. three "Caledonia township"s
  // in three different MI counties) can share this exact slug — rank the same
  // way getListedPlacesForState does so we resolve to the same place it lists
  // as canonical, not just whichever the Census API happened to return first.
  const directMatches = places.filter((place) => place.slug === citySlug);
  if (directMatches.length > 0) {
    return [...directMatches].sort(comparePlaces)[0]!;
  }

  const normalizedSlug = slugify(citySlug.replace(/-/g, " "));
  const aliasMatches = places.filter((place) => place.aliases.includes(normalizedSlug));
  if (aliasMatches.length > 0) {
    return [...aliasMatches].sort(comparePlaces)[0]!;
  }

  throw new Error("City not found");
}

async function getListedResolvedPlacesForState(
  state: string,
  year: number,
): Promise<ListedPlace[]> {
  const places = await getResolvedPlacesForState(state, year);
  const groups = new Map<string, ResolvedPlace[]>();

  for (const place of places) {
    const group = groups.get(place.slug) ?? [];
    group.push(place);
    groups.set(place.slug, group);
  }

  const listed: ListedPlace[] = [];

  for (const [baseSlug, candidates] of groups) {
    const sorted = [...candidates].sort(comparePlaces);

    listed.push({
      name: sorted[0].displayName,
      slug: baseSlug,
      place: sorted[0],
    });

    if (sorted.length === 1) {
      continue;
    }

    const seen = new Set<string>([baseSlug]);
    for (const place of sorted.slice(1)) {
      let slug = `${baseSlug}-${place.placeType}`;
      if (seen.has(slug)) {
        slug = `${slug}-${place.placeCode}`;
      }
      seen.add(slug);

      listed.push({
        name: `${place.displayName} (${normalizeCountyName(place.countyHint ?? place.fullName.split(",")[1] ?? "")})`,
        slug,
        place,
      });
    }
  }

  return listed.sort((a, b) => b.place.population - a.place.population);
}

async function fetchResolvedPlaces(
  stateCode: SupportedState,
  stateFips: string,
  year: number,
): Promise<ResolvedPlace[]> {
  const [placeResponse, countySubdivisionResponse] = await Promise.all([
    fetch(
      `https://api.census.gov/data/${year}/acs/acs5` +
        `?get=NAME,B01003_001E&for=place:*&in=state:${stateFips}` +
        (process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : ""),
    ),
    fetch(
      `https://api.census.gov/data/${year}/acs/acs5` +
        `?get=NAME,B01003_001E&for=county%20subdivision:*&in=state:${stateFips}` +
        (process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : ""),
    ),
  ]);

  if (!placeResponse.ok) {
    throw new Error(`Unable to fetch places for state: ${stateCode}`);
  }

  if (!countySubdivisionResponse.ok) {
    throw new Error(`Unable to fetch county subdivisions for state: ${stateCode}`);
  }

  const placeData = (await placeResponse.json()) as string[][];
  const [, ...placeRows] = placeData;
  const countySubdivisionData = (await countySubdivisionResponse.json()) as string[][];
  const [, ...countySubdivisionRows] = countySubdivisionData;

  return [
    ...placeRows.map((row) => buildResolvedPlace(stateCode, row, "place")),
    ...countySubdivisionRows
      .map((row) => buildResolvedPlace(stateCode, row, "county-subdivision"))
      .filter((place) => place.placeType === "township"),
  ];
}

function buildResolvedPlace(
  stateCode: string,
  row: string[],
  geographyType: "place" | "county-subdivision",
): ResolvedPlace {
  const [fullName, populationRaw, stateFips, countyOrPlaceCode, maybePlaceCode] = row;
  const rawLocalName = extractLocalName(fullName);
  const { base: localName, countyHint } = stripEmbeddedCounty(rawLocalName);
  const placeType = detectPlaceType(localName);
  const baseName = cleanPlaceName(localName);
  const displayName = buildDisplayName(localName, placeType, baseName);
  const placeCode = geographyType === "county-subdivision" ? (maybePlaceCode ?? "") : countyOrPlaceCode;
  const countyCode = geographyType === "county-subdivision" ? countyOrPlaceCode : "";
  const aliases = Array.from(new Set([
    slugify(displayName),
    slugify(baseName),
    slugify(localName),
  ].filter(Boolean)));

  return {
    fullName,
    baseName,
    displayName,
    slug: aliases[0]!,
    aliases,
    placeType,
    geographyType,
    state: stateCode,
    stateFips,
    countyFips: geographyType === "county-subdivision" ? `${stateFips}${countyCode}` : "",
    placeCode,
    population: toNumber(populationRaw),
    countyHint,
  };
}

function extractLocalName(fullName: string): string {
  return fullName.split(",")[0]?.trim() ?? fullName.trim();
}

// Strips a trailing "(X County)" that Census bakes directly into the NAME
// field to disambiguate two same-named places within a state — it sits
// before any place-type suffix (e.g. "Kailua CDP (Hawaii County)"), so
// without this, "CDP" is no longer at the end of the string and none of our
// suffix patterns match, leaving it to leak through into the display name.
function stripEmbeddedCounty(localName: string): { base: string; countyHint: string | null } {
  // "counties" plural covers cross-county CDPs, e.g. "(Kemper and Neshoba Counties)".
  const match = localName.match(/^(.*?)\s*\(([^()]*\bcount(?:y|ies)\b[^()]*)\)\s*$/i);
  if (!match) return { base: localName, countyHint: null };
  return { base: match[1]!.trim(), countyHint: match[2]!.trim() };
}

function cleanPlaceName(localName: string): string {
  let cleaned = localName;

  for (const { regex } of PREFIX_PATTERNS) {
    cleaned = cleaned.replace(regex, "");
  }

  for (const { regex } of SUFFIX_PATTERNS) {
    cleaned = cleaned.replace(regex, "");
  }

  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned || localName.trim();
}

function buildDisplayName(localName: string, placeType: PlaceType, baseName: string): string {
  const trimmed = localName.replace(/\s+/g, " ").trim();

  if (placeType === "city" || placeType === "cdp") {
    // "CDP" (Census Designated Place) is a Census Bureau technical designation
    // for unincorporated communities, never part of the place's actual name —
    // unlike "Township"/"Village"/etc., which are often genuinely part of it.
    return toTitleCase(baseName);
  }
  if (/^village of\s+/i.test(trimmed)) {
    return toTitleCase(`${baseName} Village`);
  }
  if (/^borough of\s+/i.test(trimmed)) {
    return toTitleCase(`${baseName} Borough`);
  }
  if (/^municipality of\s+/i.test(trimmed)) {
    return toTitleCase(`${baseName} Municipality`);
  }
  if (/^town of\s+/i.test(trimmed)) {
    return toTitleCase(`${baseName} Town`);
  }

  return toTitleCase(trimmed);
}

function detectPlaceType(localName: string): PlaceType {
  for (const { regex, placeType } of PREFIX_PATTERNS) {
    if (regex.test(localName)) {
      return placeType;
    }
  }

  const matched = SUFFIX_PATTERNS
    .filter(({ regex }) => regex.test(localName))
    .sort((a, b) => b.priority - a.priority)[0];

  return matched?.placeType ?? "unknown";
}

function comparePlaces(a: ResolvedPlace, b: ResolvedPlace): number {
  return rankPlace(b) - rankPlace(a) || b.population - a.population || a.displayName.localeCompare(b.displayName);
}

function rankPlace(place: ResolvedPlace): number {
  switch (place.placeType) {
    case "city":
      return 100;
    case "town":
    case "village":
    case "borough":
    case "municipality":
      return 90;
    case "township":
      return 80;
    case "unified-government":
    case "urban-county":
      return 70;
    case "cdp":
      return 40;
    default:
      return 50;
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}


function normalizeCountyName(value: string): string {
  return value.replace(/\bCount(?:y|ies)\b/i, "").trim();
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (word.length <= 2 && word === word.toUpperCase()) {
        return word;
      }
      // Capitalize after hyphens/parens/slashes too, not just at the start of
      // the space-separated token — otherwise "Athens-Clarke" title-cases to
      // "Athens-clarke" and "(Honolulu" (mid-parenthetical) stays "(honolulu".
      return word.toLowerCase().replace(/(^|[-(/])([a-z])/g, (_m, boundary, letter) => boundary + letter.toUpperCase());
    })
    .join(" ");
}
