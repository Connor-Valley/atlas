import type { City } from "../cities/cities.types.js";
import type { CityHousing, DetailedCityHousing, HousingStructure, FhfaData } from "./housing.types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Constants for mortgage calculations
const MORTGAGE_DEFAULTS = {
  DOWN_PAYMENT_PERCENT: 0.20, // 20% down payment
  INTEREST_RATE: 0.065, // 6.5% annual interest rate
  LOAN_TERM_YEARS: 30, // 30-year mortgage
} as const;

// =============================================================================
// HPI Data Cache - Loaded Once at Startup
// =============================================================================

/**
 * Data structure for HPI records
 */
type HpiRecord = {
  year: number;
  period: number; // quarter (1-4)
  index: number;
};

/**
 * In-memory cache of HPI data by MSA name
 * Loaded once at startup to avoid parsing CSV on every request
 */
let hpiDataCache: Map<string, HpiRecord[]> = new Map();
let stateHpiCache: Map<string, HpiRecord[]> = new Map();
let cacheInitialized = false;

// State name to abbreviation mapping for normalizing state cache keys
const STATE_NAME_TO_ABBR: Record<string, string> = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
  "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
  "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
  "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO",
  "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
  "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
  "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY"
};

/**
 * Initialize HPI data cache from CSV file
 * Called once at server startup
 */
export function initializeHpiCache(): void {
  try {
    const csvPath = path.join(__dirname, "../../data/hpi_master.csv");

    if (!fs.existsSync(csvPath)) {
      console.warn(`FHFA CSV file not found at ${csvPath}. FHFA data will be unavailable.`);
      cacheInitialized = true;
      return;
    }

    console.log('Loading FHFA HPI data...');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');

    let msaCount = 0;
    let stateCount = 0;
    const levelSet = new Set<string>();
    const flavorsSet = new Set<string>();

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const fields = parseCSVLine(line);
      if (fields.length < 10) continue;

      const [hpiType, hpiFlavor, frequency, level, placeName, _placeId, yr, period, indexNsa, indexSa] = fields;

      // Track what levels and flavors exist
      levelSet.add(level);
      flavorsSet.add(hpiFlavor);

      const year = parseInt(yr);
      const quarter = parseInt(period);
      const index = parseFloat(indexSa || indexNsa);

      if (!isNaN(year) && !isNaN(quarter) && !isNaN(index)) {
        const record: HpiRecord = {
          year,
          period: quarter,
          index,
        };

        // Process MSA-level data for primary lookup
        // Accept both purchase-only and all-transactions for maximum coverage
        if (hpiType === "traditional" &&
            frequency === "quarterly" &&
            level === "MSA" &&
            (hpiFlavor === "purchase-only" || hpiFlavor === "all-transactions")) {

          if (!hpiDataCache.has(placeName)) {
            hpiDataCache.set(placeName, []);
            msaCount++;
          }
          hpiDataCache.get(placeName)!.push(record);
        }

        // Process state-level data for fallback
        // Accept both purchase-only and all-transactions for maximum coverage
        else if (hpiType === "traditional" &&
                 frequency === "quarterly" &&
                 (level === "State" || level === "state" || level === "ST") &&
                 (hpiFlavor === "purchase-only" || hpiFlavor === "all-transactions")) {

          // Normalize state name to abbreviation for consistent lookup
          const stateAbbr = STATE_NAME_TO_ABBR[placeName];
          if (stateAbbr) {
            if (!stateHpiCache.has(stateAbbr)) {
              stateHpiCache.set(stateAbbr, []);
              stateCount++;
            }
            stateHpiCache.get(stateAbbr)!.push(record);
          }
        }
      }
    }

    console.log(`Found levels in CSV: ${Array.from(levelSet).join(', ')}`);
    console.log(`Found flavors in CSV: ${Array.from(flavorsSet).join(', ')}`);
    console.log(`Processed ${msaCount} MSAs and ${stateCount} states`);

    // Prioritize purchase-only data over all-transactions for better data quality
    prioritizeDataQuality();

    // Sort all data by date (most recent first)
    for (const [_msa, records] of hpiDataCache) {
      records.sort((a, b) => b.year - a.year || b.period - a.period);
    }
    for (const [_state, records] of stateHpiCache) {
      records.sort((a, b) => b.year - a.year || b.period - a.period);
    }

    cacheInitialized = true;
    console.log(`FHFA HPI cache initialized with ${hpiDataCache.size} MSAs and ${stateHpiCache.size} states`);
  } catch (error) {
    console.error('Failed to initialize HPI cache:', error);
    cacheInitialized = true; // Mark as initialized to prevent retries
  }
}

/**
 * Prioritizes purchase-only data over all-transactions when both are available
 * This ensures better data quality while maintaining maximum coverage
 */
function prioritizeDataQuality(): void {
  // Re-parse CSV to separate purchase-only and all-transactions data
  const csvPath = path.join(__dirname, "../../data/hpi_master.csv");
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');

  const purchaseOnlyMsas = new Set<string>();
  const purchaseOnlyStates = new Set<string>();

  // First pass: identify MSAs/states with purchase-only data
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);
    if (fields.length < 10) continue;

    const [hpiType, hpiFlavor, frequency, level, placeName] = fields;

    if (hpiType === "traditional" && frequency === "quarterly" && hpiFlavor === "purchase-only") {
      if (level === "MSA") {
        purchaseOnlyMsas.add(placeName);
      } else if (level === "State" || level === "state" || level === "ST") {
        const stateAbbr = STATE_NAME_TO_ABBR[placeName];
        if (stateAbbr) {
          purchaseOnlyStates.add(stateAbbr);
        }
      }
    }
  }

  // Clear caches and rebuild with prioritized data
  hpiDataCache.clear();
  stateHpiCache.clear();

  // Second pass: load data with prioritization
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);
    if (fields.length < 10) continue;

    const [hpiType, hpiFlavor, frequency, level, placeName, _placeId, yr, period, indexNsa, indexSa] = fields;

    const year = parseInt(yr);
    const quarter = parseInt(period);
    const index = parseFloat(indexSa || indexNsa);

    if (!isNaN(year) && !isNaN(quarter) && !isNaN(index)) {
      const record: HpiRecord = {
        year,
        period: quarter,
        index,
      };

      // MSA-level data with prioritization
      if (hpiType === "traditional" && frequency === "quarterly" && level === "MSA") {
        const shouldInclude = hpiFlavor === "purchase-only" ||
                             (hpiFlavor === "all-transactions" && !purchaseOnlyMsas.has(placeName));

        if (shouldInclude) {
          if (!hpiDataCache.has(placeName)) {
            hpiDataCache.set(placeName, []);
          }
          hpiDataCache.get(placeName)!.push(record);
        }
      }

      // State-level data with prioritization
      else if (hpiType === "traditional" && frequency === "quarterly" &&
               (level === "State" || level === "state" || level === "ST")) {
        const stateAbbr = STATE_NAME_TO_ABBR[placeName];
        if (stateAbbr) {
          const shouldInclude = hpiFlavor === "purchase-only" ||
                               (hpiFlavor === "all-transactions" && !purchaseOnlyStates.has(stateAbbr));

          if (shouldInclude) {
            if (!stateHpiCache.has(stateAbbr)) {
              stateHpiCache.set(stateAbbr, []);
            }
            stateHpiCache.get(stateAbbr)!.push(record);
          }
        }
      }
    }
  }
}

/**
 * Fetches basic housing data for a city from the US Census API
 */
export async function getCityHousing(city: City, year: number): Promise<CityHousing> {
  const censusVariables = [
    "B25064_001E", // median gross rent
    "B25003_001E", // total occupied units
    "B25003_003E", // renter-occupied units
    "B25077_001E", // median home value
  ];

  const url = buildCensusUrl(censusVariables, city, year);
  const data = await fetchCensusData(url);

  const [medianRent, totalUnits, renterUnits, medianHomeValue] = data;
  const renterShare = calculateRenterShare(totalUnits, renterUnits);
  const displayCity = cleanCityName(city.name);

  return {
    city: displayCity,
    state: city.state,
    medianRent: parseNumeric(medianRent),
    renterShare,
    medianHomeValue: parseOptionalNumeric(medianHomeValue),
  };
}

/**
 * Fetches comprehensive housing data for a city including demographics,
 * structure breakdown, and home price trends
 */
export async function getDetailedCityHousing(city: City, year: number): Promise<DetailedCityHousing> {
  const censusVariables = [
    // Basic housing data
    "B25064_001E", // median gross rent
    "B25003_001E", // total occupied units
    "B25003_003E", // renter-occupied units
    "B25077_001E", // median home value
    // Additional detailed data
    "B19013_001E", // median household income
    "B25070_010E", // renter households paying 30%+ of income on rent
    "B25070_001E", // total renter households (for rent burden calculation)
    "B25002_001E", // total housing units
    "B25002_003E", // vacant housing units
    // Housing structure types (B25024)
    "B25024_002E", // 1 unit, detached
    "B25024_003E", // 1 unit, attached
    "B25024_004E", // 2 units
    "B25024_005E", // 3-4 units
    "B25024_006E", // 5-9 units
    "B25024_007E", // 10-19 units
    "B25024_008E", // 20-49 units
    "B25024_009E", // 50+ units
    "B25024_010E", // mobile home
    "B25024_011E", // other
    // Year built
    "B25035_001E", // median year structure built
  ];

  const url = buildCensusUrl(censusVariables, city, year);
  const rawData = await fetchCensusData(url);

  const parsedData = parseDetailedHousingData(rawData);
  const housingStructure = calculateHousingStructure(parsedData.structure);
  const ownershipMetrics = calculateOwnershipAffordability(parsedData.medianHomeValue, parsedData.medianHouseholdIncome);

  // Fetch FHFA data (fast in-memory lookup)
  const fhfaData = getFhfaData(city);

  return {
    city: cleanCityName(city.name),
    state: city.state,
    medianRent: parsedData.medianRent,
    renterShare: parsedData.renterShare,
    medianHomeValue: parseOptionalNumeric(rawData[3]),
    medianHouseholdIncome: parsedData.medianHouseholdIncome,
    rentBurdenPercent: parsedData.rentBurdenPercent,
    vacancyRate: parsedData.vacancyRate,
    housingStructure,
    medianYearBuilt: parsedData.medianYearBuilt,
    estimatedMortgage: ownershipMetrics.estimatedMortgage,
    mortgageToIncomeRatio: ownershipMetrics.mortgageToIncomeRatio,
    fhfaData,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Builds Census API URL for given variables and geographic location
 */
function buildCensusUrl(variables: string[], city: City, year: number): string {
  return `https://api.census.gov/data/${year}/acs/acs5` +
    `?get=${variables.join(",")}` +
    `&for=place:${city.placeCode}&in=state:${city.stateFips}` +
    (process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : "");
}

/**
 * Fetches and validates data from Census API
 */
async function fetchCensusData(url: string): Promise<string[]> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch Census data: ${res.status} ${text}`);
  }

  const data = (await res.json()) as string[][];
  const row = data[1];
  if (!row) {
    throw new Error("Census response missing data row");
  }

  return row;
}

/**
 * Safely parses numeric values from Census API responses
 */
function parseNumeric(value: string | undefined): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Parses optional numeric values that can be undefined
 */
function parseOptionalNumeric(value: string | undefined): number | undefined {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

/**
 * Calculates normalized renter share ratio
 */
function calculateRenterShare(totalUnits: string | undefined, renterUnits: string | undefined): number {
  const total = parseNumeric(totalUnits);
  const renters = parseNumeric(renterUnits);
  return total > 0 ? parseFloat((renters / total).toFixed(4)) : 0;
}

/**
 * Cleans city name by removing "city" suffix
 */
function cleanCityName(cityName: string): string {
  return cityName.replace(/\s+city$/i, "");
}

/**
 * Parses detailed housing data from Census API response
 */
function parseDetailedHousingData(rawData: string[]) {
  const n = parseNumeric;

  const [
    medianRent, totalUnits, renterUnits, medianHomeValue,
    medianHouseholdIncome, rentBurdenedHouseholds, totalRenterHouseholds,
    totalHousingUnits, vacantUnits, singleDetached, singleAttached,
    duplex, units3to4, units5to9, units10to19, units20to49,
    units50plus, mobile, other, medianYearBuilt,
  ] = rawData;

  return {
    medianRent: n(medianRent),
    medianHomeValue: n(medianHomeValue),
    medianHouseholdIncome: n(medianHouseholdIncome),
    medianYearBuilt: n(medianYearBuilt),
    renterShare: calculateRenterShare(totalUnits, renterUnits),
    rentBurdenPercent: n(totalRenterHouseholds) > 0
      ? parseFloat((n(rentBurdenedHouseholds) / n(totalRenterHouseholds)).toFixed(4))
      : 0,
    vacancyRate: n(totalHousingUnits) > 0
      ? parseFloat((n(vacantUnits) / n(totalHousingUnits)).toFixed(4))
      : 0,
    structure: {
      singleDetached: n(singleDetached),
      singleAttached: n(singleAttached),
      duplex: n(duplex),
      units3to4: n(units3to4),
      units5to9: n(units5to9),
      units10to19: n(units10to19),
      units20to49: n(units20to49),
      units50plus: n(units50plus),
      mobile: n(mobile),
      other: n(other),
    }
  };
}

/**
 * Calculates housing structure breakdown as normalized ratios
 */
function calculateHousingStructure(structure: any): HousingStructure {
  const structureCounts = {
    singleFamily: structure.singleDetached + structure.singleAttached,
    duplex: structure.duplex,
    smallApartment: structure.units3to4 + structure.units5to9,
    largeApartment: structure.units10to19 + structure.units20to49 + structure.units50plus,
    mobile: structure.mobile,
    other: structure.other,
  };

  const totalUnits = Object.values(structureCounts).reduce((sum, count) => sum + count, 0);

  if (totalUnits === 0) {
    return {
      singleFamily: 0,
      duplex: 0,
      smallApartment: 0,
      largeApartment: 0,
      mobile: 0,
      other: 0,
    };
  }

  return {
    singleFamily: parseFloat((structureCounts.singleFamily / totalUnits).toFixed(4)),
    duplex: parseFloat((structureCounts.duplex / totalUnits).toFixed(4)),
    smallApartment: parseFloat((structureCounts.smallApartment / totalUnits).toFixed(4)),
    largeApartment: parseFloat((structureCounts.largeApartment / totalUnits).toFixed(4)),
    mobile: parseFloat((structureCounts.mobile / totalUnits).toFixed(4)),
    other: parseFloat((structureCounts.other / totalUnits).toFixed(4)),
  };
}

/**
 * Calculates monthly mortgage payment and affordability ratio
 */
function calculateOwnershipAffordability(medianHomeValue: number, medianHouseholdIncome: number) {
  if (!medianHomeValue || medianHomeValue <= 0) {
    return {
      estimatedMortgage: 0,
      mortgageToIncomeRatio: 0,
    };
  }

  // Calculate loan amount after down payment
  const downPayment = medianHomeValue * MORTGAGE_DEFAULTS.DOWN_PAYMENT_PERCENT;
  const loanAmount = medianHomeValue - downPayment;

  // Calculate monthly mortgage payment using standard mortgage formula
  // M = P * [r(1+r)^n] / [(1+r)^n - 1]
  const monthlyInterestRate = MORTGAGE_DEFAULTS.INTEREST_RATE / 12;
  const numberOfPayments = MORTGAGE_DEFAULTS.LOAN_TERM_YEARS * 12;

  let monthlyPayment: number;
  if (monthlyInterestRate > 0) {
    const compound = Math.pow(1 + monthlyInterestRate, numberOfPayments);
    monthlyPayment = loanAmount * (monthlyInterestRate * compound) / (compound - 1);
  } else {
    // Handle case where interest rate is 0
    monthlyPayment = loanAmount / numberOfPayments;
  }

  // Calculate mortgage-to-income ratio
  const monthlyIncome = medianHouseholdIncome / 12;
  const mortgageToIncomeRatio = monthlyIncome > 0
    ? parseFloat((monthlyPayment / monthlyIncome).toFixed(4))
    : 0;

  return {
    estimatedMortgage: Math.round(monthlyPayment),
    mortgageToIncomeRatio,
  };
}

// =============================================================================
// FHFA Data Integration
// =============================================================================

/**
 * Fetches FHFA home price index data for a city's metropolitan area
 * Uses in-memory cache - no file I/O or shell commands
 * Falls back to state-level data when MSA mapping is unavailable
 */
function getFhfaData(city: City): FhfaData | undefined {
  if (!cacheInitialized) {
    throw new Error("HPI cache not initialized. Call initializeHpiCache() at startup.");
  }

  // Try MSA-level data first
  const msaName = getMsaNameForCity(city);
  if (msaName) {
    const hpiData = hpiDataCache.get(msaName);
    if (hpiData && hpiData.length > 0) {
      const result = calculatePriceChanges(hpiData);
      return {
        ...result,
        level: "msa",
        geographyName: msaName
      };
    }
  }

  // Fall back to state-level data
  const stateData = stateHpiCache.get(city.state);
  if (stateData && stateData.length > 0) {
    const result = calculatePriceChanges(stateData);
    return {
      ...result,
      level: "state",
      geographyName: city.state
    };
  }

  return undefined;
}

/**
 * Maps a city to its corresponding Metropolitan Statistical Area (MSA) name
 * Uses dynamic resolution by searching through available MSA names in cache
 * Implements robust matching to prevent false matches between similar city/state names
 */
function getMsaNameForCity(city: City): string | null {
  const cityLower = city.name.toLowerCase();
  const stateAbbr = city.state.toUpperCase(); // Ensure uppercase for consistency

  for (const msaName of hpiDataCache.keys()) {
    // First, check if this MSA contains our target state
    if (!msaContainsState(msaName, stateAbbr)) {
      continue;
    }

    // Then check if city appears in MSA name with proper word boundaries
    if (msaContainsCity(msaName, cityLower)) {
      return msaName;
    }
  }

  return null;
}

/**
 * Checks if an MSA name contains the specified state abbreviation
 * Handles multi-state MSAs and prevents false matches
 */
function msaContainsState(msaName: string, stateAbbr: string): boolean {
  // Common MSA patterns:
  // "City-City, ST"
  // "City-City-City, ST"
  // "City-City, ST-ST" (multi-state)
  // "City-City, ST (MSAD)"
  // "City-City-City, ST-ST-ST (MSAD)"

  // Extract the state portion (everything after the last comma)
  const commaIndex = msaName.lastIndexOf(',');
  if (commaIndex === -1) return false;

  const statePortion = msaName.substring(commaIndex + 1).trim();

  // Remove any suffix like "(MSAD)" to get clean state abbreviations
  const cleanStatePortion = statePortion.replace(/\s*\([^)]*\)\s*$/, '').trim();

  // Split by hyphens to handle multi-state MSAs like "MI-OH" or "NY-NJ"
  const states = cleanStatePortion.split('-').map(s => s.trim().toUpperCase());

  // Check if our target state is in the list
  return states.includes(stateAbbr);
}

/**
 * Checks if an MSA name contains the specified city name with proper word boundaries
 * Prevents false matches for partial city names
 */
function msaContainsCity(msaName: string, cityLower: string): boolean {
  // Extract the city portion (everything before the last comma)
  const commaIndex = msaName.lastIndexOf(',');
  if (commaIndex === -1) return false;

  const cityPortion = msaName.substring(0, commaIndex).toLowerCase();

  // Split by hyphens to get individual city names
  const cities = cityPortion.split('-').map(c => c.trim());

  // Check for exact match in any city position
  for (const city of cities) {
    if (city === cityLower) {
      return true;
    }

    // Also check if the target city is a significant part of a compound city name
    // but only if it's at word boundaries to prevent false matches
    const words = city.split(/\s+/);
    if (words.includes(cityLower)) {
      return true;
    }
  }

  return false;
}

/**
 * Parses a CSV line handling quoted fields properly
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);

  return fields;
}

/**
 * Calculates price change metrics from HPI data
 */
function calculatePriceChanges(hpiData: HpiRecord[]): Omit<FhfaData, 'level' | 'geographyName'> {
  if (hpiData.length === 0) {
    throw new Error("No HPI data available for calculation");
  }

  const latest = hpiData[0]; // Most recent quarter
  let yoyChange = 0;
  let qoqChange = 0;
  let fiveYearChange = 0;

  const previousQuarter = hpiData.find(record =>
    (record.year === latest.year && record.period === latest.period - 1) ||
    (record.year === latest.year - 1 && latest.period === 1 && record.period === 4)
  );

  if (previousQuarter) {
    qoqChange = parseFloat(((latest.index - previousQuarter.index) / previousQuarter.index).toFixed(4));
  }

  const yearAgo = hpiData.find(record =>
    record.year === latest.year - 1 && record.period === latest.period
  );

  if (yearAgo) {
    yoyChange = parseFloat(((latest.index - yearAgo.index) / yearAgo.index).toFixed(4));
  }

  const fiveYearsAgo = hpiData.find(record =>
    record.year === latest.year - 5 && record.period === latest.period
  );

  if (fiveYearsAgo) {
    fiveYearChange = parseFloat(((latest.index - fiveYearsAgo.index) / fiveYearsAgo.index).toFixed(4));
  }

  return {
    yoyChange,
    qoqChange,
    fiveYearChange: fiveYearsAgo ? fiveYearChange : undefined,
    lastUpdated: `${latest.year} Q${latest.period}`,
  };
}

