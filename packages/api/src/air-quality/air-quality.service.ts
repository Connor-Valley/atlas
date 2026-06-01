import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import type { City } from "../cities/cities.types.js";
import type { AirQualitySummary } from "./air-quality.types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AQI_FILE = path.resolve(__dirname, "../data/aqi_by_county_2023.json");

type AqiRecord = {
  year: number;
  daysWithAqi: number;
  goodDays: number;
  moderateDays: number;
  unhealthyForSensitiveGroupsDays: number;
  unhealthyDays: number;
  veryUnhealthyDays: number;
  hazardousDays: number;
  maxAqi: number;
  p90Aqi: number;
  medianAqi: number;
};

type AqiReference = Record<string, AqiRecord>;

let aqiCache: AqiReference | null = null;

export function initializeAqiCache(): void {
  try {
    const raw = readFileSync(AQI_FILE, "utf-8");
    aqiCache = JSON.parse(raw) as AqiReference;
    console.log(`AQI reference loaded: ${Object.keys(aqiCache).length} counties`);
  } catch (err) {
    console.warn("Failed to load AQI reference file:", err);
  }
}

export function getCityAirQuality(city: City): AirQualitySummary {
  const ref = aqiCache;
  const empty: AirQualitySummary = {
    city: city.name,
    state: city.state,
    medianAqi: null,
    p90Aqi: null,
    maxAqi: null,
    daysWithAqi: null,
    goodDaysPercent: null,
    moderateDaysPercent: null,
    unhealthyDaysPercent: null,
    aqiCategory: null,
    year: null,
    source: AQI_SOURCE,
  };

  if (!ref || !city.county) return empty;

  const stateName = STATE_NAMES[city.state as keyof typeof STATE_NAMES];
  if (!stateName) return empty;

  const countyName = city.county.toLowerCase().replace(/\s+county$/, "");
  const key = `${stateName.toLowerCase()}|${countyName}`;
  const record = ref[key];
  if (!record) return empty;

  const totalDays = record.daysWithAqi;
  const unhealthyTotal =
    record.unhealthyForSensitiveGroupsDays +
    record.unhealthyDays +
    record.veryUnhealthyDays +
    record.hazardousDays;

  return {
    city: city.name,
    state: city.state,
    medianAqi: record.medianAqi,
    p90Aqi: record.p90Aqi,
    maxAqi: record.maxAqi,
    daysWithAqi: totalDays,
    goodDaysPercent: totalDays > 0 ? parseFloat(((record.goodDays / totalDays) * 100).toFixed(1)) : null,
    moderateDaysPercent: totalDays > 0 ? parseFloat(((record.moderateDays / totalDays) * 100).toFixed(1)) : null,
    unhealthyDaysPercent: totalDays > 0 ? parseFloat(((unhealthyTotal / totalDays) * 100).toFixed(1)) : null,
    aqiCategory: aqiCategory(record.medianAqi),
    year: record.year,
    source: AQI_SOURCE,
  };
}

function aqiCategory(medianAqi: number): string {
  if (medianAqi <= 50)  return "Good";
  if (medianAqi <= 100) return "Moderate";
  if (medianAqi <= 150) return "Unhealthy for Sensitive Groups";
  if (medianAqi <= 200) return "Unhealthy";
  if (medianAqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

const STATE_NAMES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
} as const;

const AQI_SOURCE = {
  sourceName: "U.S. EPA Air Quality System (AQS)",
  sourceUrl: "https://aqs.epa.gov/aqsweb/airdata/download_files.html",
  asOf: "2023",
  geographyLevel: "county" as const,
  methodologyNote:
    "Annual AQI summary at county level. Median AQI reflects typical daily air quality. " +
    "Unhealthy days = sum of USG + Unhealthy + Very Unhealthy + Hazardous days as % of monitored days. " +
    "Not all counties have monitoring stations — missing data returned as null.",
};
