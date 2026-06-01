/**
 * Builds political_lean_2020.json from MIT Election Lab county presidential data.
 *
 * Data source: MIT Election Data and Science Lab, Harvard Dataverse
 * https://doi.org/10.7910/DVN/VOQCHQ  (countypres_2000-2020.csv)
 *
 * Usage:
 *   pnpm --filter @atlas/api build-political-lean
 *
 * The CSV has one row per candidate per county per year. We filter to 2020
 * presidential results, sum DEMOCRAT and REPUBLICAN votes by county FIPS,
 * then compute lean labels.
 */

import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(__dirname, "../src/data/political_lean_2020.json");

// One-row-per-county 2020 presidential results
// Columns: state_name,county_name,county_fips,dem_votes,gop_votes,total_votes,per_dem,per_gop,...
const CSV_URL =
  "https://raw.githubusercontent.com/tonmcg/US_County_Level_Election_Results_08-20/master/2020_US_County_Level_Presidential_Results.csv";

type CountyAccum = {
  countyName: string;
  statePo: string;
  dem: number;
  rep: number;
  total: number;
};

type LeanLabel =
  | "Strong Democrat"
  | "Democrat"
  | "Lean Democrat"
  | "Swing"
  | "Lean Republican"
  | "Republican"
  | "Strong Republican";

function leanLabel(marginPct: number): LeanLabel {
  const abs = Math.abs(marginPct);
  const side = marginPct >= 0 ? "Democrat" : "Republican";
  if (abs < 5) return "Swing";
  if (abs < 10) return `Lean ${side}` as LeanLabel;
  if (abs < 20) return side as LeanLabel;
  return `Strong ${side}` as LeanLabel;
}

function zeroPad(fips: string | number, len = 5): string {
  return String(fips).padStart(len, "0");
}

async function main() {
  console.log("Fetching MIT Election Lab county presidential data...");

  const res = await fetch(CSV_URL, {
    headers: { "Accept": "text/csv, text/plain, */*" },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch data: ${res.status} ${res.statusText}\n` +
      `Download the file manually from https://doi.org/10.7910/DVN/VOQCHQ\n` +
      `and place it at packages/api/data/countypres_2000-2020.csv, then re-run with:\n` +
      `  tsx scripts/build-political-lean.ts --local`
    );
  }

  const text = await res.text();
  const lines = text.split("\n");
  const header = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));

  // Format: state_name,county_fips,county_name,votes_gop,votes_dem,total_votes,diff,per_gop,per_dem,per_point_diff
  const idx = {
    county_name: header.indexOf("county_name"),
    county_fips: header.indexOf("county_fips"),
    total_votes: header.indexOf("total_votes"),
    per_dem: header.indexOf("per_dem"),
    per_gop: header.indexOf("per_gop"),
  };

  const output: Record<string, object> = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(",").map(c => c.replace(/"/g, "").trim());
    const rawFips = cols[idx.county_fips];
    if (!rawFips || rawFips === "NA") continue;

    const fips = zeroPad(rawFips);
    const total = parseInt(cols[idx.total_votes]) || 0;
    if (total === 0) continue;

    const demPct = parseFloat((parseFloat(cols[idx.per_dem]) * 100).toFixed(1));
    const repPct = parseFloat((parseFloat(cols[idx.per_gop]) * 100).toFixed(1));
    const marginPct = parseFloat((demPct - repPct).toFixed(1));

    output[fips] = {
      year: 2020,
      countyName: cols[idx.county_name] ?? "",
      demPct,
      repPct,
      marginPct,
      lean: leanLabel(marginPct),
    };
  }

  mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(output));
  console.log(`Written ${Object.keys(output).length} counties to ${OUT_FILE}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
