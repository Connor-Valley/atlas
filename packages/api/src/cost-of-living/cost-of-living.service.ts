import type { City } from "../cities/cities.types.js";
import type { CostOfLivingIndex, ColCategory } from "./cost-of-living.types.js";

const BEA_BASE = "https://apps.bea.gov/api/data";
const RPP_YEAR = "2023";
const LINECODE = "3"; // RPPs: All items

type RppRecord = { rpp: number; name: string; year: number };

let msaCache: Map<string, RppRecord> | null = null; // keyed by normalized MSA name
let stateCache: Map<string, RppRecord> | null = null; // keyed by state abbreviation

const STATE_FIPS_TO_ABBR: Record<string, string> = {
  "01000": "AL", "02000": "AK", "04000": "AZ", "05000": "AR", "06000": "CA",
  "08000": "CO", "09000": "CT", "10000": "DE", "11000": "DC", "12000": "FL",
  "13000": "GA", "15000": "HI", "16000": "ID", "17000": "IL", "18000": "IN",
  "19000": "IA", "20000": "KS", "21000": "KY", "22000": "LA", "23000": "ME",
  "24000": "MD", "25000": "MA", "26000": "MI", "27000": "MN", "28000": "MS",
  "29000": "MO", "30000": "MT", "31000": "NE", "32000": "NV", "33000": "NH",
  "34000": "NJ", "35000": "NM", "36000": "NY", "37000": "NC", "38000": "ND",
  "39000": "OH", "40000": "OK", "41000": "OR", "42000": "PA", "44000": "RI",
  "45000": "SC", "46000": "SD", "47000": "TN", "48000": "TX", "49000": "UT",
  "50000": "VT", "51000": "VA", "53000": "WA", "54000": "WV", "55000": "WI",
  "56000": "WY",
};

function stripMsaSuffix(name: string): string {
  return name
    .replace(/\s*\(Metropolitan Statistical Area\)\s*$/i, "")
    .replace(/\s*\(Micropolitan Statistical Area\)\s*$/i, "")
    .replace(/\s*\(Metropolitan Division\)\s*$/i, "")
    .trim();
}

const ZIP_URL = "https://apps.bea.gov/regional/zip/RPP.zip";

async function fetchBEARppViaApi(tableName: "MARPP" | "SARPP", geoFips: "MSA" | "STATE"): Promise<{ GeoFips: string; GeoName: string; DataValue: string; TimePeriod: string }[]> {
  const key = process.env.BEA_API_KEY;
  if (!key) throw new Error("BEA_API_KEY not set");

  const url = `${BEA_BASE}/?UserID=${key}&method=GetData&datasetname=Regional` +
    `&TableName=${tableName}&LineCode=${LINECODE}&GeoFips=${geoFips}&Year=${RPP_YEAR}&ResultFormat=JSON`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`BEA API error: ${res.status}`);

  const json = (await res.json()) as any;
  const results = json?.BEAAPI?.Results;
  if (results?.Error) throw new Error(`BEA API: ${results.Error.APIErrorDescription}`);

  return results?.Data ?? [];
}

function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { cols.push(cur.trim()); cur = ""; }
    else { cur += ch; }
  }
  cols.push(cur.trim());
  return cols;
}

async function loadRppFromZip(): Promise<{ msaData: Map<string, RppRecord>; stateData: Map<string, RppRecord> }> {
  const { execSync } = await import("child_process");

  console.log("[col] Downloading BEA RPP.zip (no API key)...");
  const res = await fetch(ZIP_URL);
  if (!res.ok) throw new Error(`Failed to download RPP.zip: ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  const tmpZip = "/tmp/bea_rpp_svc.zip";
  const { writeFileSync } = await import("fs");
  writeFileSync(tmpZip, buf);

  const parseCsv = (filename: string) => {
    const csv = execSync(`unzip -p "${tmpZip}" "${filename}"`, { maxBuffer: 10 * 1024 * 1024 }).toString();
    const lines = csv.split("\n");
    const header = parseCsvLine(lines[0]);
    const yearIdx = header.lastIndexOf("2023");
    if (yearIdx === -1) throw new Error("2023 column not found");

    const rows: { GeoFips: string; GeoName: string; DataValue: string; TimePeriod: string }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i].trim());
      if (!cols[4] || cols[4] !== "3") continue; // LineCode 3 = RPPs: All items
      rows.push({ GeoFips: cols[0], GeoName: cols[1], DataValue: cols[yearIdx], TimePeriod: "2023" });
    }
    return rows;
  };

  const msaRows = parseCsv("MARPP_MSA_2008_2023.csv");
  const stateRows = parseCsv("SARPP_STATE_2008_2023.csv");

  return { msaData: buildMsaMap(msaRows), stateData: buildStateMap(stateRows) };
}

function buildMsaMap(rows: { GeoFips: string; GeoName: string; DataValue: string; TimePeriod: string }[]): Map<string, RppRecord> {
  const map = new Map<string, RppRecord>();
  for (const row of rows) {
    const rpp = parseFloat(row.DataValue);
    if (isNaN(rpp) || row.GeoFips === "00000" || row.GeoFips === "00999") continue;
    const name = stripMsaSuffix(row.GeoName);
    map.set(name, { rpp, name, year: parseInt(row.TimePeriod) });
  }
  return map;
}

function buildStateMap(rows: { GeoFips: string; GeoName: string; DataValue: string; TimePeriod: string }[]): Map<string, RppRecord> {
  const map = new Map<string, RppRecord>();
  for (const row of rows) {
    const abbr = STATE_FIPS_TO_ABBR[row.GeoFips.trim()];
    if (!abbr) continue;
    const rpp = parseFloat(row.DataValue);
    if (isNaN(rpp)) continue;
    map.set(abbr, { rpp, name: row.GeoName, year: parseInt(row.TimePeriod) });
  }
  return map;
}

export async function initializeColCache(): Promise<void> {
  try {
    // Try live API first, fall back to free ZIP download
    const key = process.env.BEA_API_KEY;
    if (key) {
      try {
        const [msaRows, stateRows] = await Promise.all([
          fetchBEARppViaApi("MARPP", "MSA"),
          fetchBEARppViaApi("SARPP", "STATE"),
        ]);
        msaCache = buildMsaMap(msaRows);
        stateCache = buildStateMap(stateRows);
        console.log(`[col] RPP loaded via API: ${msaCache.size} MSAs, ${stateCache.size} states`);
        return;
      } catch (apiErr) {
        console.warn(`[col] BEA API failed (${apiErr instanceof Error ? apiErr.message : apiErr}), falling back to ZIP...`);
      }
    }

    const { msaData, stateData } = await loadRppFromZip();
    msaCache = msaData;
    stateCache = stateData;
    console.log(`[col] RPP loaded via ZIP: ${msaCache.size} MSAs, ${stateCache.size} states`);
  } catch (err) {
    console.warn("[col] Failed to load BEA RPP data:", err instanceof Error ? err.message : err);
  }
}

function findMsaForCity(city: City): RppRecord | null {
  if (!msaCache) return null;

  const cityLower = city.name.replace(/\s+city$/i, "").toLowerCase();
  const stateUpper = city.state.toUpperCase();

  for (const [msaName, record] of msaCache) {
    const commaIdx = msaName.lastIndexOf(",");
    if (commaIdx === -1) continue;

    const statePart = msaName.slice(commaIdx + 1).trim();
    const cityPart = msaName.slice(0, commaIdx).toLowerCase();

    // State portion may be multi-state, e.g. "IL-IN-WI"
    const states = statePart.split("-").map(s => s.trim().toUpperCase());
    if (!states.includes(stateUpper)) continue;

    // City portion may be hyphenated, e.g. "Chicago-Naperville-Elgin"
    const cities = cityPart.split("-").map(c => c.trim());
    if (cities.some(c => c === cityLower || c.startsWith(cityLower + " "))) {
      return record;
    }
  }

  return null;
}

function colCategory(rpp: number): ColCategory {
  if (rpp < 85) return "Much Below Average";
  if (rpp < 95) return "Below Average";
  if (rpp < 105) return "Near Average";
  if (rpp < 115) return "Above Average";
  return "Much Above Average";
}

export function getCityColIndex(city: City): CostOfLivingIndex | null {
  const msaMatch = findMsaForCity(city);

  if (msaMatch) {
    const rppVsNational = parseFloat((msaMatch.rpp - 100).toFixed(1));
    return {
      city: city.name.replace(/\s+city$/i, ""),
      state: city.state,
      rppIndex: msaMatch.rpp,
      rppVsNational,
      category: colCategory(msaMatch.rpp),
      level: "msa",
      geographyName: msaMatch.name,
      year: msaMatch.year,
      source: COL_SOURCE,
    };
  }

  const stateRecord = stateCache?.get(city.state);
  if (stateRecord) {
    const rppVsNational = parseFloat((stateRecord.rpp - 100).toFixed(1));
    return {
      city: city.name.replace(/\s+city$/i, ""),
      state: city.state,
      rppIndex: stateRecord.rpp,
      rppVsNational,
      category: colCategory(stateRecord.rpp),
      level: "state",
      geographyName: stateRecord.name,
      year: stateRecord.year,
      source: COL_SOURCE,
    };
  }

  return null;
}

const COL_SOURCE = {
  sourceName: "U.S. Bureau of Economic Analysis, Regional Price Parities",
  sourceUrl: "https://apps.bea.gov/iTable/?reqid=70&step=1&acrdn=8",
  asOf: RPP_YEAR,
  geographyLevel: "msa" as const,
  methodologyNote:
    "RPP index where 100 = U.S. average. Composite of goods, services, and rents. " +
    "MSA-level data used when available; falls back to state-level. " +
    "Positive rppVsNational means cost of living is above the national average.",
};
