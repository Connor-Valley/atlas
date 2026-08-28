import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Precomputed from a decade (2014-2023) of Meteostat's daily bulk station data — see
// packages/api/scripts/build-climate-normals.py for how these were generated and how to
// regenerate them. Used only when a live Open-Meteo fetch fails, so a rate-limit blip or
// outage doesn't leave weather fields empty.
type StationLocation = { id: string; lat: number; lon: number };

export type StationNormals = {
  avgTempF: number;
  summerAvgHighF: number | null;
  winterAvgLowF: number | null;
  sunnyDaysPerYear: number | null;
  annualPrecipitationInches: number | null;
  hotDaysPerYear: number | null;
  freezingDaysPerYear: number | null;
  snowDaysPerYear: number | null;
  yearsCovered: number;
};

let stations: StationLocation[] | null = null;
let normalsByStation: Record<string, StationNormals> | null = null;

function ensureLoaded(): void {
  if (stations && normalsByStation) return;
  stations = JSON.parse(
    readFileSync(path.resolve(__dirname, "../data/climate-stations.json"), "utf-8"),
  ) as StationLocation[];
  normalsByStation = JSON.parse(
    readFileSync(path.resolve(__dirname, "../data/climate-station-normals.json"), "utf-8"),
  ) as Record<string, StationNormals>;
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type NearestStationResult = {
  normals: StationNormals;
  distanceMiles: number;
};

export function findNearestStationNormals(lat: number, lon: number): NearestStationResult | null {
  ensureLoaded();
  if (!stations || !stations.length) return null;

  let best: StationLocation | null = null;
  let bestDist = Infinity;
  for (const s of stations) {
    const dist = haversineMiles(lat, lon, s.lat, s.lon);
    if (dist < bestDist) {
      bestDist = dist;
      best = s;
    }
  }
  if (!best) return null;

  const normals = normalsByStation?.[best.id];
  if (!normals) return null;

  return { normals, distanceMiles: Math.round(bestDist * 10) / 10 };
}
