import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import type { City } from "../cities/cities.types.js";
import type { PoliticalLean, PoliticalLeanLabel } from "./political-lean.types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, "../data/political_lean_2020.json");

type LeanRecord = {
  year: number;
  demPct: number;
  repPct: number;
  marginPct: number;
  lean: PoliticalLeanLabel;
  countyName: string;
};

type LeanReference = Record<string, LeanRecord>;

let leanCache: LeanReference | null = null;

export function initializePoliticalLeanCache(): void {
  try {
    const raw = readFileSync(DATA_FILE, "utf-8");
    leanCache = JSON.parse(raw) as LeanReference;
    console.log(`Political lean reference loaded: ${Object.keys(leanCache).length} counties`);
  } catch (err) {
    console.warn("Failed to load political lean reference file:", err);
  }
}

export function getCityPoliticalLean(city: City): PoliticalLean | null {
  if (!leanCache) return null;

  const record = leanCache[city.countyFips];
  if (!record) return null;

  return {
    city: city.name.replace(/\s+city$/i, ""),
    state: city.state,
    year: record.year,
    demPct: record.demPct,
    repPct: record.repPct,
    marginPct: record.marginPct,
    lean: record.lean,
    countyName: record.countyName,
    source: POLITICAL_SOURCE,
  };
}

const POLITICAL_SOURCE = {
  sourceName: "MIT Election Data and Science Lab, Harvard Dataverse",
  sourceUrl: "https://doi.org/10.7910/DVN/VOQCHQ",
  asOf: "2020 Presidential Election",
  geographyLevel: "county" as const,
  methodologyNote:
    "County-level 2020 presidential results. Margin = Democrat% − Republican% (positive = Democrat advantage). " +
    "Lean labels: Swing (<5%), Lean (5–10%), [Party] (10–20%), Strong [Party] (20%+).",
};
