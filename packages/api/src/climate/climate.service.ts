import type { City } from "../cities/cities.types.js";
import type { ClimateSummary, HazardRisk, NaturalHazardRisks } from "./climate.types.js";
import { getCached } from "../common/cache.js";
import { trackCall } from "../common/metrics.js";

const START_YEAR = 2014;
const END_YEAR = 2023;
const YEAR_COUNT = END_YEAR - START_YEAR + 1;
const SUNSHINE_THRESHOLD_SECONDS = 6 * 3600;
const HOT_DAY_CELSIUS = 35;      // ≥ 95°F
const FREEZING_DAY_CELSIUS = 0;  // ≤ 32°F

// The underlying data (2014–2023 historical average) only shifts when START_YEAR/END_YEAR
// change, which happens at most once a year — so this can sit far longer than the default
// TTL without going stale, which also keeps us well clear of upstream rate limits.
const CLIMATE_TTL_SECONDS = 180 * 24 * 60 * 60; // 180 days

// Weather and hazard risk come from two independent upstream services, so they're cached
// under separate keys with their own negative-cache guard. Bundling them under one cache
// entry would let a successful hazard fetch mask (and lock in) a failed weather fetch for
// the full TTL, or vice versa — each source needs to be free to retry on its own.
export async function getCityClimate(city: City): Promise<ClimateSummary> {
  const [weatherData, hazardRisks] = await Promise.all([
    city.lat != null && city.lon != null
      ? getCached(
          `climate-weather:${city.state}:${city.slug}`,
          () => fetchWeatherData(city.lat as number, city.lon as number),
          { shouldCache: (r) => r !== null, ttlSeconds: CLIMATE_TTL_SECONDS },
        )
      : null,
    city.countyFips
      ? getCached(
          `climate-hazard:${city.state}:${city.slug}`,
          () => fetchHazardRisks(city.countyFips),
          { shouldCache: (r) => r !== null, ttlSeconds: CLIMATE_TTL_SECONDS },
        )
      : null,
  ]);

  if (!weatherData) {
    return buildResult(city, null, hazardRisks);
  }

  const { daily } = weatherData;
  const temps = daily.temperature_2m_mean;
  const maxTemps = daily.temperature_2m_max;
  const minTemps = daily.temperature_2m_min;
  const sunshine = daily.sunshine_duration;
  const precip = daily.precipitation_sum;
  const snowfall = daily.snowfall_sum;
  const times = daily.time;

  const validTemps = temps.filter((v): v is number => v != null);
  if (!validTemps.length) return buildResult(city, null, hazardRisks);

  const avgTempC = validTemps.reduce((s, v) => s + v, 0) / validTemps.length;

  // Seasonal groupings by month
  const summerMaxes: number[] = [];
  const winterMins: number[] = [];

  for (let i = 0; i < times.length; i++) {
    const month = parseInt(times[i].slice(5, 7), 10);
    const maxT = maxTemps[i];
    const minT = minTemps[i];
    if (maxT != null && (month === 6 || month === 7 || month === 8)) summerMaxes.push(maxT);
    if (minT != null && (month === 12 || month === 1 || month === 2)) winterMins.push(minT);
  }

  const summerAvgHighC = summerMaxes.length
    ? summerMaxes.reduce((s, v) => s + v, 0) / summerMaxes.length
    : null;
  const winterAvgLowC = winterMins.length
    ? winterMins.reduce((s, v) => s + v, 0) / winterMins.length
    : null;

  const validMaxes = maxTemps.filter((v): v is number => v != null);
  const validMins = minTemps.filter((v): v is number => v != null);

  const totalSunnyDays = sunshine.filter((s): s is number => s != null && s >= SUNSHINE_THRESHOLD_SECONDS).length;
  const totalPrecipMm = precip.reduce<number>((s, v) => s + (v ?? 0), 0);
  const totalSnowCm = snowfall.reduce<number>((s, v) => s + (v ?? 0), 0);
  const totalHotDays = validMaxes.filter(v => v >= HOT_DAY_CELSIUS).length;
  const totalFreezingDays = validMins.filter(v => v <= FREEZING_DAY_CELSIUS).length;

  return buildResult(city, {
    avgTempF: cToF(avgTempC),
    summerAvgHighF: summerAvgHighC != null ? cToF(summerAvgHighC) : null,
    winterAvgLowF: winterAvgLowC != null ? cToF(winterAvgLowC) : null,
    sunnyDaysPerYear: Math.round(totalSunnyDays / YEAR_COUNT),
    annualPrecipitationInches: parseFloat((totalPrecipMm / YEAR_COUNT / 25.4).toFixed(1)),
    annualSnowfallInches: parseFloat((totalSnowCm / YEAR_COUNT / 2.54).toFixed(1)),
    hotDaysPerYear: Math.round(totalHotDays / YEAR_COUNT),
    freezingDaysPerYear: Math.round(totalFreezingDays / YEAR_COUNT),
  }, hazardRisks);
}

type WeatherMetrics = {
  avgTempF: number;
  summerAvgHighF: number | null;
  winterAvgLowF: number | null;
  sunnyDaysPerYear: number;
  annualPrecipitationInches: number;
  annualSnowfallInches: number;
  hotDaysPerYear: number;
  freezingDaysPerYear: number;
};

function buildResult(
  city: City,
  weather: WeatherMetrics | null,
  hazardRisks: NaturalHazardRisks | null,
): ClimateSummary {
  return {
    city: city.name,
    state: city.state,
    avgTempF: weather?.avgTempF ?? null,
    summerAvgHighF: weather?.summerAvgHighF ?? null,
    winterAvgLowF: weather?.winterAvgLowF ?? null,
    sunnyDaysPerYear: weather?.sunnyDaysPerYear ?? null,
    annualPrecipitationInches: weather?.annualPrecipitationInches ?? null,
    annualSnowfallInches: weather?.annualSnowfallInches ?? null,
    hotDaysPerYear: weather?.hotDaysPerYear ?? null,
    freezingDaysPerYear: weather?.freezingDaysPerYear ?? null,
    hazardRisks,
    dataYearRange: weather ? `${START_YEAR}–${END_YEAR}` : null,
    source: OPEN_METEO_SOURCE,
  };
}

// ── Open-Meteo ─────────────────────────────────────────────────────────────

type OpenMeteoDaily = {
  time: string[];
  temperature_2m_mean: (number | null)[];
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
  sunshine_duration: (number | null)[];
  precipitation_sum: (number | null)[];
  snowfall_sum: (number | null)[];
};

async function fetchWeatherData(lat: number, lon: number): Promise<{ daily: OpenMeteoDaily } | null> {
  const url =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${lat}&longitude=${lon}` +
    `&start_date=${START_YEAR}-01-01&end_date=${END_YEAR}-12-31` +
    `&daily=temperature_2m_mean,temperature_2m_max,temperature_2m_min,sunshine_duration,precipitation_sum,snowfall_sum` +
    `&timezone=America%2FNew_York`;

  const res = await fetchWithRetry(url, "open-meteo");
  if (!res) return null;

  try {
    const data = (await res.json()) as { daily?: OpenMeteoDaily };
    return data.daily ? { daily: data.daily } : null;
  } catch (e) {
    console.error("[climate] failed to parse Open-Meteo response", { lat, lon, error: (e as Error).message });
    return null;
  }
}

// ── FEMA National Risk Index ────────────────────────────────────────────────

const NRI_FIELDS = [
  "STCOFIPS",
  "RISK_SCORE", "RISK_RATNG",
  "TRND_RISKS", "TRND_RISKR",
  "HRCN_RISKS", "HRCN_RISKR",
  "IFLD_RISKS", "IFLD_RISKR",   // Inland Flooding (RFLD was renamed to IFLD in NRI 2023)
  "CFLD_RISKS", "CFLD_RISKR",
  "WFIR_RISKS", "WFIR_RISKR",
  "ERQK_RISKS", "ERQK_RISKR",
  "WNTW_RISKS", "WNTW_RISKR",
  "HWAV_RISKS", "HWAV_RISKR",
  "DRGT_RISKS", "DRGT_RISKR",
].join(",");

const NRI_SERVICE =
  "https://services.arcgis.com/XG15cJAlne2vxtgt/ArcGIS/rest/services/National_Risk_Index_Counties/FeatureServer/0/query";

async function fetchHazardRisks(countyFips: string): Promise<NaturalHazardRisks | null> {
  if (!countyFips || countyFips.length !== 5) return null;

  // ArcGIS requires + for spaces and %27 for single quotes in the WHERE clause
  const url =
    `${NRI_SERVICE}?where=STCOFIPS+%3D+%27${countyFips}%27` +
    `&outFields=${NRI_FIELDS}&returnGeometry=false&f=json`;

  const res = await fetchWithRetry(url, "fema-nri");
  if (!res) return null;

  try {
    type NriResponse = {
      features?: Array<{ attributes: Record<string, number | string | null> }>;
    };
    const data = (await res.json()) as NriResponse;
    const attrs = data.features?.[0]?.attributes;
    if (!attrs) return null;

    const risk = (scoreKey: string, ratingKey: string): HazardRisk => ({
      score: typeof attrs[scoreKey] === "number" ? parseFloat((attrs[scoreKey] as number).toFixed(1)) : null,
      rating: typeof attrs[ratingKey] === "string" ? (attrs[ratingKey] as string) : null,
    });

    return {
      compositeScore: typeof attrs.RISK_SCORE === "number" ? parseFloat((attrs.RISK_SCORE as number).toFixed(1)) : null,
      compositeRating: typeof attrs.RISK_RATNG === "string" ? (attrs.RISK_RATNG as string) : null,
      tornado: risk("TRND_RISKS", "TRND_RISKR"),
      hurricane: risk("HRCN_RISKS", "HRCN_RISKR"),
      riverineFlooding: risk("IFLD_RISKS", "IFLD_RISKR"),
      coastalFlooding: risk("CFLD_RISKS", "CFLD_RISKR"),
      wildfire: risk("WFIR_RISKS", "WFIR_RISKR"),
      earthquake: risk("ERQK_RISKS", "ERQK_RISKR"),
      winterWeather: risk("WNTW_RISKS", "WNTW_RISKR"),
      heatWave: risk("HWAV_RISKS", "HWAV_RISKR"),
      drought: risk("DRGT_RISKS", "DRGT_RISKR"),
      source: FEMA_NRI_SOURCE,
    };
  } catch (e) {
    console.error("[climate] failed to parse FEMA NRI response", { countyFips, error: (e as Error).message });
    return null;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

// A single failed attempt (network blip, upstream 429/5xx) shouldn't be treated the same as
// "this city has no data" — that distinction is what caching downstream needs to be correct.
async function fetchWithRetry(url: string, label: string, attempts = 3): Promise<Response | null> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      void trackCall(label);
      const res = await fetch(url);
      if (res.ok) return res;
      if (!RETRYABLE_STATUSES.has(res.status)) {
        console.error(`[climate] ${label} returned non-retryable status`, { status: res.status, url });
        return null;
      }
      console.warn(`[climate] ${label} returned ${res.status}, attempt ${attempt}/${attempts}`);
    } catch (e) {
      console.warn(`[climate] ${label} request failed, attempt ${attempt}/${attempts}`, { error: (e as Error).message });
    }
    if (attempt < attempts) await sleep(300 * 2 ** (attempt - 1));
  }
  console.error(`[climate] ${label} failed after ${attempts} attempts`, { url });
  return null;
}

function cToF(celsius: number): number {
  return parseFloat(((celsius * 9) / 5 + 32).toFixed(1));
}

const OPEN_METEO_SOURCE = {
  sourceName: "Open-Meteo Historical Weather Archive (ERA5)",
  sourceUrl: "https://open-meteo.com/en/docs/historical-weather-api",
  asOf: `${START_YEAR}–${END_YEAR} average`,
  geographyLevel: "place" as const,
  methodologyNote:
    `10-year daily averages (${START_YEAR}–${END_YEAR}). ` +
    `Summer avg high = Jun–Aug daily max. Winter avg low = Dec–Feb daily min. ` +
    `Hot days = days ≥95°F. Freezing days = days with low ≤32°F. ` +
    `Sunny days = days with ≥6h sunshine.`,
};

const FEMA_NRI_SOURCE = {
  sourceName: "FEMA National Risk Index",
  sourceUrl: "https://hazards.fema.gov/nri/",
  asOf: "2023",
  geographyLevel: "county" as const,
  methodologyNote:
    "County-level hazard risk scores are national percentiles (0–100). " +
    "Higher scores indicate greater relative risk compared to all US counties.",
};
