import { getCached } from "../common/cache.js";
import { fetchWithRetry } from "../common/http-retry.js";

// Backfills the two fields the Meteostat station fallback usually can't answer (see
// climate-fallback.service.ts): most stations don't carry a sunshine sensor or a snow-depth
// sensor at all. NASA POWER is a global gridded reanalysis product (MERRA-2 / CERES SYN1deg),
// so unlike station data it has zero geographic gaps and needs no nearest-neighbor matching —
// every lat/lon gets a real value. No API key required.
const START_YEAR = 2014;
const END_YEAR = 2023;
const YEAR_COUNT = END_YEAR - START_YEAR + 1;
const FILL_VALUE = -999;
const MIN_VALID_DAYS = 100;

// There's no direct "hours of sunshine" parameter in POWER. The standard proxy (used in solar
// engineering) is the clearness index — measured surface irradiance divided by what would
// reach the ground with a perfectly clear sky (top-of-atmosphere irradiance, adjusted for
// atmosphere). Kt >= ~0.6 conventionally indicates a mostly-clear day. This is a real estimate,
// not a measurement — it won't line up day-for-day with Open-Meteo's measured sunshine hours.
const CLEARNESS_SUNNY_THRESHOLD = 0.6;

// PRECSNOLAND is liquid-water-equivalent snow precipitation (mm/day), not a snow depth. Snow is
// much less dense than liquid water — the standard climatological rule of thumb is ~10in of
// snow per 1in of liquid equivalent, though the true ratio varies with temperature. This is an
// approximation, same as the clearness-index sunny-days figure above.
const SNOW_TO_LIQUID_RATIO = 10;

const CACHE_TTL_SECONDS = 180 * 24 * 60 * 60;

export type PowerSupplement = {
  sunnyDaysPerYear: number | null;
  annualSnowfallInches: number | null;
};

export function getPowerSupplement(lat: number, lon: number): Promise<PowerSupplement | null> {
  const key = `climate-power:${lat.toFixed(2)}:${lon.toFixed(2)}`;
  return getCached(key, () => fetchPowerSupplement(lat, lon), {
    shouldCache: (r) => r !== null,
    ttlSeconds: CACHE_TTL_SECONDS,
  });
}

type PowerDailyResponse = {
  properties?: {
    parameter?: {
      ALLSKY_SFC_SW_DWN?: Record<string, number>;
      TOA_SW_DWN?: Record<string, number>;
      PRECSNOLAND?: Record<string, number>;
    };
  };
};

async function fetchPowerSupplement(lat: number, lon: number): Promise<PowerSupplement | null> {
  const url =
    `https://power.larc.nasa.gov/api/temporal/daily/point` +
    `?parameters=ALLSKY_SFC_SW_DWN,TOA_SW_DWN,PRECSNOLAND&community=AG` +
    `&longitude=${lon}&latitude=${lat}` +
    `&start=${START_YEAR}0101&end=${END_YEAR}1231&format=JSON`;

  const res = await fetchWithRetry(url, "nasa-power");
  if (!res) return null;

  try {
    const data = (await res.json()) as PowerDailyResponse;
    const sw = data.properties?.parameter?.ALLSKY_SFC_SW_DWN;
    const toa = data.properties?.parameter?.TOA_SW_DWN;
    const snow = data.properties?.parameter?.PRECSNOLAND;
    if (!sw || !toa || !snow) return null;

    let clearDays = 0;
    let clearDaysValid = 0;
    for (const day of Object.keys(sw)) {
      const swVal = sw[day];
      const toaVal = toa[day];
      if (swVal == null || swVal === FILL_VALUE || toaVal == null || toaVal === FILL_VALUE || toaVal <= 0) continue;
      clearDaysValid++;
      if (swVal / toaVal >= CLEARNESS_SUNNY_THRESHOLD) clearDays++;
    }

    let totalSnowMm = 0;
    let snowDaysValid = 0;
    for (const day of Object.keys(snow)) {
      const v = snow[day];
      if (v == null || v === FILL_VALUE) continue;
      totalSnowMm += v;
      snowDaysValid++;
    }

    return {
      sunnyDaysPerYear: clearDaysValid >= MIN_VALID_DAYS ? Math.round(clearDays / YEAR_COUNT) : null,
      annualSnowfallInches:
        snowDaysValid >= MIN_VALID_DAYS
          ? parseFloat(((totalSnowMm * SNOW_TO_LIQUID_RATIO) / 25.4 / YEAR_COUNT).toFixed(1))
          : null,
    };
  } catch (e) {
    console.error("[nasa-power] failed to parse response", { lat, lon, error: (e as Error).message });
    return null;
  }
}
