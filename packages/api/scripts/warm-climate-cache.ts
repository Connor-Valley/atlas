/**
 * Pre-warms the climate cache for the cities that actually get looked up in bulk — the same
 * population-ranked candidate pool the "top cities" state search scores on the frontend
 * (see packages/web/src/lib/topCities.ts, CANDIDATE_POOL_SIZE). Without this, that feature's
 * first cold run for a state fires up to 150 *live* Open-Meteo/FEMA calls at once; running this
 * ahead of time means real user traffic almost always hits an already-warm cache.
 *
 * Safe to re-run any time — getCityClimate() already caches per-source (weather vs hazard) and
 * skips cities that are still within their TTL, so a repeat run only fetches what's missing or
 * expired. Rate-limited well below Open-Meteo's free-tier caps (600/min, 10,000/day) so it can
 * safely run alongside real traffic.
 *
 * Usage:
 *   pnpm --filter @atlas/api warm-climate-cache
 *
 * Env overrides:
 *   WARM_CITIES_PER_STATE  (default 150 — matches the frontend's candidate pool size)
 *   WARM_CONCURRENCY       (default 2)
 *   WARM_DELAY_MS          (default 500 — delay between each worker's fetches)
 */

import path from "path";
import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
loadEnv({ path: path.join(root, ".env.development") });
loadEnv({ path: path.join(root, ".env") });
loadEnv();

const { SUPPORTED_STATES } = await import("../src/states/states.types.js");
const { getCitiesForState } = await import("../src/states/states.service.js");
const { getCity } = await import("../src/cities/cities.service.js");
const { getCityClimate } = await import("../src/climate/climate.service.js");
const { CURRENT_ACS_YEAR } = await import("../src/constants.js");

const CITIES_PER_STATE = Number(process.env.WARM_CITIES_PER_STATE ?? 150);
const CONCURRENCY = Number(process.env.WARM_CONCURRENCY ?? 2);
const DELAY_MS = Number(process.env.WARM_DELAY_MS ?? 500);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Candidate = { state: string; slug: string; name: string };

async function mapLimit<T>(items: T[], limit: number, fn: (item: T, index: number) => Promise<void>): Promise<void> {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
      await sleep(DELAY_MS);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

async function main() {
  console.log(`Building candidate list: top ${CITIES_PER_STATE} cities per state...`);

  const candidates: Candidate[] = [];
  for (const state of SUPPORTED_STATES) {
    try {
      const cities = await getCitiesForState(state, CURRENT_ACS_YEAR);
      const top = [...cities].sort((a, b) => b.population - a.population).slice(0, CITIES_PER_STATE);
      for (const c of top) candidates.push({ state, slug: c.slug, name: c.name });
    } catch (e) {
      console.error(`Failed to list cities for ${state}:`, (e as Error).message);
    }
  }

  console.log(`Warming climate cache for ${candidates.length} cities (concurrency ${CONCURRENCY}, ${DELAY_MS}ms spacing)...`);

  let done = 0;
  let failed = 0;
  const startedAt = Date.now();

  await mapLimit(candidates, CONCURRENCY, async (candidate) => {
    try {
      const city = await getCity(candidate.state, candidate.slug, CURRENT_ACS_YEAR);
      const climate = await getCityClimate(city);
      if (climate.avgTempF === null && climate.hazardRisks === null) failed++;
    } catch (e) {
      failed++;
      console.error(`Failed: ${candidate.state}/${candidate.slug}:`, (e as Error).message);
    } finally {
      done++;
      if (done % 50 === 0 || done === candidates.length) {
        console.log(`  ${done}/${candidates.length} (${failed} fully failed)`);
      }
    }
  });

  const elapsedMin = ((Date.now() - startedAt) / 60_000).toFixed(1);
  console.log(`Done in ${elapsedMin}m. ${done - failed}/${done} cities have at least partial climate data.`);
}

main();
