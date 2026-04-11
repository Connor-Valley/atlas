import type { TransitAgency, TransitInfo } from "./quality-of-life.types.js";

export const NTD_SOURCE_URL = "https://www.transit.dot.gov/ntd/ntd-data";
export const NTD_AS_OF = "2023";

/**
 * Agency-first transit data keyed by service area bounding box.
 * getTransitInfo() filters agencies whose bounds contain the city's coordinates —
 * no manual city enumeration needed. Suburbs, secondary cities, and any place
 * within a service area are covered automatically.
 *
 * Bounds are intentionally slightly generous to avoid false negatives at edges.
 * Source: FTA National Transit Database (NTD) 2023 annual data.
 * annualRidership = unlinked passenger trips (UPT).
 */
type Bounds = { minLat: number; maxLat: number; minLon: number; maxLon: number };
type AgencyRecord = TransitAgency & { bounds: Bounds };

const AGENCIES: AgencyRecord[] = [
  // ── Northeast ────────────────────────────────────────────────────────────────
  {
    name: "MTA New York City Transit", shortName: "MTA",
    modes: ["subway", "bus"], annualRidership: 2_048_000_000,
    bounds: { minLat: 40.49, maxLat: 40.92, minLon: -74.27, maxLon: -73.70 },
  },
  {
    name: "MTA Long Island Rail Road", shortName: "LIRR",
    modes: ["commuter-rail"], annualRidership: 97_000_000,
    bounds: { minLat: 40.58, maxLat: 41.00, minLon: -74.02, maxLon: -72.00 },
  },
  {
    name: "MTA Metro-North Railroad", shortName: "Metro-North",
    modes: ["commuter-rail"], annualRidership: 82_000_000,
    bounds: { minLat: 40.70, maxLat: 41.55, minLon: -74.25, maxLon: -72.75 },
  },
  {
    name: "NYC Ferry", shortName: "NYC Ferry",
    modes: ["ferry"], annualRidership: 3_600_000,
    bounds: { minLat: 40.57, maxLat: 40.88, minLon: -74.06, maxLon: -73.73 },
  },
  {
    name: "Massachusetts Bay Transportation Authority", shortName: "MBTA",
    modes: ["subway", "bus", "commuter-rail", "ferry"], annualRidership: 370_000_000,
    bounds: { minLat: 41.75, maxLat: 42.80, minLon: -72.00, maxLon: -70.75 },
  },
  {
    name: "Southeastern Pennsylvania Transportation Authority", shortName: "SEPTA",
    modes: ["subway", "bus", "commuter-rail", "streetcar"], annualRidership: 295_000_000,
    bounds: { minLat: 39.70, maxLat: 40.35, minLon: -75.75, maxLon: -74.90 },
  },
  {
    name: "Washington Metropolitan Area Transit Authority", shortName: "WMATA",
    modes: ["subway", "bus"], annualRidership: 270_000_000,
    bounds: { minLat: 38.68, maxLat: 39.20, minLon: -77.55, maxLon: -76.75 },
  },
  {
    name: "Maryland Transit Administration", shortName: "MTA Maryland",
    modes: ["subway", "light-rail", "bus", "commuter-rail"], annualRidership: 60_000_000,
    bounds: { minLat: 39.05, maxLat: 39.65, minLon: -77.00, maxLon: -76.35 },
  },
  {
    name: "NJ Transit", shortName: "NJ Transit",
    modes: ["bus", "commuter-rail", "light-rail"], annualRidership: 265_000_000,
    bounds: { minLat: 38.88, maxLat: 41.40, minLon: -75.65, maxLon: -73.88 },
  },
  {
    name: "Port Authority of Allegheny County", shortName: "Pittsburgh RTD",
    modes: ["bus", "light-rail"], annualRidership: 35_000_000,
    bounds: { minLat: 40.18, maxLat: 40.72, minLon: -80.45, maxLon: -79.68 },
  },
  {
    name: "Capital District Transportation Authority", shortName: "CDTA",
    modes: ["bus"], annualRidership: 13_000_000,
    bounds: { minLat: 42.48, maxLat: 43.10, minLon: -74.35, maxLon: -73.48 },
  },
  {
    name: "Niagara Frontier Transportation Authority", shortName: "NFTA Metro",
    modes: ["bus", "subway"], annualRidership: 14_000_000,
    bounds: { minLat: 42.75, maxLat: 43.20, minLon: -79.18, maxLon: -78.65 },
  },
  {
    name: "Regional Transit Service", shortName: "RTS",
    modes: ["bus"], annualRidership: 9_000_000,
    bounds: { minLat: 42.88, maxLat: 43.40, minLon: -77.95, maxLon: -77.35 },
  },
  {
    name: "Connecticut Department of Transportation", shortName: "CTtransit",
    modes: ["bus"], annualRidership: 12_000_000,
    bounds: { minLat: 40.98, maxLat: 42.10, minLon: -73.75, maxLon: -71.78 },
  },
  {
    name: "Rhode Island Public Transit Authority", shortName: "RIPTA",
    modes: ["bus"], annualRidership: 11_000_000,
    bounds: { minLat: 41.28, maxLat: 42.02, minLon: -71.95, maxLon: -71.08 },
  },
  {
    name: "Greater Portland Metro", shortName: "METRO",
    modes: ["bus"], annualRidership: 1_200_000,
    bounds: { minLat: 43.52, maxLat: 44.02, minLon: -70.52, maxLon: -70.08 },
  },
  {
    name: "Manchester Transit Authority", shortName: "MTA",
    modes: ["bus"], annualRidership: 900_000,
    bounds: { minLat: 42.90, maxLat: 43.12, minLon: -71.65, maxLon: -71.38 },
  },
  {
    name: "Green Mountain Transit", shortName: "GMT",
    modes: ["bus"], annualRidership: 1_800_000,
    bounds: { minLat: 44.28, maxLat: 44.65, minLon: -73.35, maxLon: -73.05 },
  },

  // ── Midwest ──────────────────────────────────────────────────────────────────
  {
    name: "Chicago Transit Authority", shortName: "CTA",
    modes: ["subway", "bus"], annualRidership: 430_000_000,
    // Covers Chicago city + Evanston, Oak Park, Skokie
    bounds: { minLat: 41.60, maxLat: 42.20, minLon: -88.05, maxLon: -87.48 },
  },
  {
    name: "Metra", shortName: "Metra",
    modes: ["commuter-rail"], annualRidership: 32_000_000,
    // Covers broader Chicago metro + Kenosha WI
    bounds: { minLat: 41.25, maxLat: 42.60, minLon: -88.55, maxLon: -87.45 },
  },
  {
    name: "Pace Suburban Bus", shortName: "Pace",
    modes: ["bus"], annualRidership: 22_000_000,
    bounds: { minLat: 41.25, maxLat: 42.55, minLon: -88.55, maxLon: -87.48 },
  },
  {
    name: "Detroit Department of Transportation", shortName: "DDOT",
    modes: ["bus"], annualRidership: 14_000_000,
    // Detroit city limits only
    bounds: { minLat: 42.25, maxLat: 42.46, minLon: -83.30, maxLon: -82.90 },
  },
  {
    name: "Suburban Mobility Authority for Regional Transportation", shortName: "SMART",
    modes: ["bus"], annualRidership: 6_000_000,
    // Oakland, Macomb, Wayne County suburbs — intentionally excludes Detroit city center
    bounds: { minLat: 42.18, maxLat: 43.05, minLon: -83.75, maxLon: -82.68 },
  },
  {
    name: "The Detroit People Mover", shortName: "People Mover",
    modes: ["subway"], annualRidership: 2_000_000,
    bounds: { minLat: 42.32, maxLat: 42.38, minLon: -83.08, maxLon: -82.99 },
  },
  {
    name: "Ann Arbor Area Transportation Authority", shortName: "TheRide",
    modes: ["bus"], annualRidership: 5_800_000,
    // Ann Arbor + Ypsilanti service area
    bounds: { minLat: 42.18, maxLat: 42.42, minLon: -83.95, maxLon: -83.55 },
  },
  {
    name: "The Rapid", shortName: "The Rapid",
    modes: ["bus"], annualRidership: 7_500_000,
    // Grand Rapids metro
    bounds: { minLat: 42.78, maxLat: 43.15, minLon: -85.85, maxLon: -85.35 },
  },
  {
    name: "Capital Area Transportation Authority", shortName: "CATA",
    modes: ["bus"], annualRidership: 3_000_000,
    bounds: { minLat: 42.58, maxLat: 42.82, minLon: -84.72, maxLon: -84.38 },
  },
  {
    name: "Metro Transit", shortName: "Metro Transit",
    modes: ["bus", "light-rail", "commuter-rail"], annualRidership: 70_000_000,
    // Twin Cities metro
    bounds: { minLat: 44.68, maxLat: 45.35, minLon: -93.75, maxLon: -92.85 },
  },
  {
    name: "Greater Cleveland Regional Transit Authority", shortName: "GCRTA",
    modes: ["bus", "subway", "light-rail", "commuter-rail"], annualRidership: 37_000_000,
    bounds: { minLat: 41.08, maxLat: 41.72, minLon: -82.05, maxLon: -81.38 },
  },
  {
    name: "Central Ohio Transit Authority", shortName: "COTA",
    modes: ["bus"], annualRidership: 14_000_000,
    bounds: { minLat: 39.78, maxLat: 40.32, minLon: -83.35, maxLon: -82.68 },
  },
  {
    name: "Southwest Ohio Regional Transit Authority", shortName: "Metro",
    modes: ["bus", "streetcar"], annualRidership: 12_000_000,
    bounds: { minLat: 38.88, maxLat: 39.42, minLon: -84.85, maxLon: -84.18 },
  },
  {
    name: "IndyGo", shortName: "IndyGo",
    modes: ["bus"], annualRidership: 9_000_000,
    bounds: { minLat: 39.62, maxLat: 40.02, minLon: -86.45, maxLon: -85.88 },
  },
  {
    name: "Milwaukee County Transit System", shortName: "MCTS",
    modes: ["bus"], annualRidership: 27_000_000,
    bounds: { minLat: 42.78, maxLat: 43.22, minLon: -88.25, maxLon: -87.78 },
  },
  {
    name: "Madison Metro Transit", shortName: "Metro Transit",
    modes: ["bus"], annualRidership: 11_000_000,
    bounds: { minLat: 42.98, maxLat: 43.32, minLon: -89.65, maxLon: -89.18 },
  },
  {
    name: "Kansas City Area Transportation Authority", shortName: "KCATA",
    modes: ["bus"], annualRidership: 9_000_000,
    bounds: { minLat: 38.78, maxLat: 39.42, minLon: -94.98, maxLon: -94.28 },
  },
  {
    name: "Bi-State Development Agency", shortName: "Metro",
    modes: ["bus", "light-rail"], annualRidership: 28_000_000,
    bounds: { minLat: 38.38, maxLat: 38.92, minLon: -90.65, maxLon: -89.98 },
  },
  {
    name: "Metro Transit Omaha", shortName: "Metro",
    modes: ["bus"], annualRidership: 3_600_000,
    bounds: { minLat: 41.12, maxLat: 41.52, minLon: -96.35, maxLon: -95.78 },
  },
  {
    name: "Des Moines Area Regional Transit", shortName: "DART",
    modes: ["bus"], annualRidership: 3_200_000,
    bounds: { minLat: 41.38, maxLat: 41.82, minLon: -93.98, maxLon: -93.38 },
  },
  {
    name: "Metropolitan Area Transit", shortName: "MAT",
    modes: ["bus"], annualRidership: 1_300_000,
    bounds: { minLat: 46.78, maxLat: 47.02, minLon: -97.15, maxLon: -96.75 },
  },

  // ── South ────────────────────────────────────────────────────────────────────
  {
    name: "Metropolitan Atlanta Rapid Transit Authority", shortName: "MARTA",
    modes: ["subway", "bus"], annualRidership: 71_000_000,
    bounds: { minLat: 33.48, maxLat: 34.12, minLon: -84.85, maxLon: -84.08 },
  },
  {
    name: "Miami-Dade Transit", shortName: "MDT",
    modes: ["subway", "bus", "streetcar"], annualRidership: 58_000_000,
    bounds: { minLat: 25.10, maxLat: 26.02, minLon: -80.95, maxLon: -80.08 },
  },
  {
    name: "Tri-Rail", shortName: "Tri-Rail",
    modes: ["commuter-rail"], annualRidership: 4_400_000,
    // Miami → West Palm Beach corridor
    bounds: { minLat: 25.65, maxLat: 26.95, minLon: -80.42, maxLon: -79.98 },
  },
  {
    name: "Hillsborough Area Regional Transit", shortName: "HART",
    modes: ["bus", "streetcar"], annualRidership: 9_000_000,
    bounds: { minLat: 27.68, maxLat: 28.22, minLon: -82.85, maxLon: -82.18 },
  },
  {
    name: "LYNX Central Florida Regional Transportation Authority", shortName: "LYNX",
    modes: ["bus"], annualRidership: 17_000_000,
    bounds: { minLat: 27.95, maxLat: 28.82, minLon: -81.72, maxLon: -80.95 },
  },
  {
    name: "Jacksonville Transportation Authority", shortName: "JTA",
    modes: ["bus"], annualRidership: 8_000_000,
    bounds: { minLat: 30.08, maxLat: 30.62, minLon: -82.15, maxLon: -81.28 },
  },
  {
    name: "Charlotte Area Transit System", shortName: "CATS",
    modes: ["bus", "light-rail", "streetcar"], annualRidership: 17_000_000,
    bounds: { minLat: 34.98, maxLat: 35.52, minLon: -81.08, maxLon: -80.55 },
  },
  {
    name: "Capital Area Transit", shortName: "CAT",
    modes: ["bus"], annualRidership: 5_000_000,
    bounds: { minLat: 35.58, maxLat: 36.12, minLon: -79.05, maxLon: -78.38 },
  },
  {
    name: "Durham Area Transit Authority", shortName: "DATA",
    modes: ["bus"], annualRidership: 3_800_000,
    bounds: { minLat: 35.82, maxLat: 36.12, minLon: -79.15, maxLon: -78.72 },
  },
  {
    name: "Greensboro Transit Authority", shortName: "GTA",
    modes: ["bus"], annualRidership: 4_000_000,
    bounds: { minLat: 35.92, maxLat: 36.35, minLon: -80.12, maxLon: -79.58 },
  },
  {
    name: "Winston-Salem Transit Authority", shortName: "WSTA",
    modes: ["bus"], annualRidership: 2_800_000,
    bounds: { minLat: 35.98, maxLat: 36.32, minLon: -80.52, maxLon: -80.08 },
  },
  {
    name: "WeGo Public Transit", shortName: "WeGo",
    modes: ["bus"], annualRidership: 7_500_000,
    bounds: { minLat: 35.98, maxLat: 36.42, minLon: -87.15, maxLon: -86.48 },
  },
  {
    name: "Memphis Area Transit Authority", shortName: "MATA",
    modes: ["bus", "streetcar"], annualRidership: 6_500_000,
    bounds: { minLat: 34.98, maxLat: 35.42, minLon: -90.25, maxLon: -89.58 },
  },
  {
    name: "Knoxville Area Transit", shortName: "KAT",
    modes: ["bus"], annualRidership: 2_800_000,
    bounds: { minLat: 35.78, maxLat: 36.22, minLon: -84.38, maxLon: -83.72 },
  },
  {
    name: "Chattanooga Area Regional Transportation Authority", shortName: "CARTA",
    modes: ["bus", "ferry"], annualRidership: 1_500_000,
    bounds: { minLat: 34.88, maxLat: 35.32, minLon: -85.55, maxLon: -85.02 },
  },
  {
    name: "New Orleans Regional Transit Authority", shortName: "RTA",
    modes: ["bus", "streetcar"], annualRidership: 13_000_000,
    bounds: { minLat: 29.88, maxLat: 30.12, minLon: -90.45, maxLon: -89.92 },
  },
  {
    name: "Capital Area Transit System", shortName: "CATS",
    modes: ["bus"], annualRidership: 2_100_000,
    bounds: { minLat: 30.22, maxLat: 30.62, minLon: -91.35, maxLon: -90.95 },
  },
  {
    name: "Shreveport Area Transit System", shortName: "SporTran",
    modes: ["bus"], annualRidership: 1_500_000,
    bounds: { minLat: 32.38, maxLat: 32.72, minLon: -94.02, maxLon: -93.68 },
  },
  {
    name: "JATRAN", shortName: "JATRAN",
    modes: ["bus"], annualRidership: 1_400_000,
    bounds: { minLat: 32.18, maxLat: 32.52, minLon: -90.32, maxLon: -89.98 },
  },
  {
    name: "Central Arkansas Transit Authority", shortName: "CATA",
    modes: ["bus", "streetcar"], annualRidership: 1_300_000,
    bounds: { minLat: 34.58, maxLat: 35.02, minLon: -92.65, maxLon: -92.18 },
  },
  {
    name: "Metropolitan Transit Authority of Harris County", shortName: "METRO",
    modes: ["bus", "light-rail"], annualRidership: 70_000_000,
    bounds: { minLat: 29.48, maxLat: 30.22, minLon: -95.85, maxLon: -94.98 },
  },
  {
    name: "Dallas Area Rapid Transit", shortName: "DART",
    modes: ["bus", "light-rail", "commuter-rail"], annualRidership: 55_000_000,
    bounds: { minLat: 32.55, maxLat: 33.22, minLon: -97.18, maxLon: -96.48 },
  },
  {
    name: "Trinity Metro", shortName: "Trinity Metro",
    modes: ["bus", "commuter-rail"], annualRidership: 6_000_000,
    bounds: { minLat: 32.48, maxLat: 33.02, minLon: -97.68, maxLon: -96.98 },
  },
  {
    name: "VIA Metropolitan Transit", shortName: "VIA",
    modes: ["bus"], annualRidership: 30_000_000,
    bounds: { minLat: 29.18, maxLat: 29.82, minLon: -98.82, maxLon: -98.18 },
  },
  {
    name: "Capital Metro", shortName: "CapMetro",
    modes: ["bus", "commuter-rail"], annualRidership: 19_000_000,
    bounds: { minLat: 30.08, maxLat: 30.65, minLon: -98.08, maxLon: -97.38 },
  },
  {
    name: "El Paso Sun Metro", shortName: "Sun Metro",
    modes: ["bus", "streetcar"], annualRidership: 10_000_000,
    bounds: { minLat: 31.58, maxLat: 32.02, minLon: -106.78, maxLon: -106.18 },
  },
  {
    name: "Citibus", shortName: "Citibus",
    modes: ["bus"], annualRidership: 1_200_000,
    bounds: { minLat: 33.38, maxLat: 33.72, minLon: -102.15, maxLon: -101.72 },
  },
  {
    name: "Corpus Christi Regional Transportation Authority", shortName: "B-Line",
    modes: ["bus"], annualRidership: 2_000_000,
    bounds: { minLat: 27.48, maxLat: 28.02, minLon: -97.75, maxLon: -97.18 },
  },
  {
    name: "Greater Richmond Transit Company", shortName: "GRTC",
    modes: ["bus"], annualRidership: 9_000_000,
    bounds: { minLat: 37.38, maxLat: 37.72, minLon: -77.78, maxLon: -77.18 },
  },
  {
    name: "Hampton Roads Transit", shortName: "HRT",
    modes: ["bus", "ferry"], annualRidership: 9_500_000,
    bounds: { minLat: 36.58, maxLat: 37.22, minLon: -76.95, maxLon: -75.98 },
  },
  {
    name: "Transit Authority of River City", shortName: "TARC",
    modes: ["bus"], annualRidership: 9_500_000,
    bounds: { minLat: 37.88, maxLat: 38.42, minLon: -85.95, maxLon: -85.38 },
  },
  {
    name: "Lextran", shortName: "Lextran",
    modes: ["bus"], annualRidership: 3_400_000,
    bounds: { minLat: 37.88, maxLat: 38.22, minLon: -84.75, maxLon: -84.28 },
  },
  {
    name: "MAX Transit", shortName: "MAX",
    modes: ["bus"], annualRidership: 2_800_000,
    bounds: { minLat: 33.28, maxLat: 33.72, minLon: -87.15, maxLon: -86.58 },
  },
  {
    name: "Central Oklahoma Transportation and Parking Authority", shortName: "EMBARK",
    modes: ["bus", "streetcar"], annualRidership: 2_000_000,
    bounds: { minLat: 35.28, maxLat: 35.72, minLon: -97.78, maxLon: -97.28 },
  },
  {
    name: "Tulsa Transit", shortName: "Tulsa Transit",
    modes: ["bus"], annualRidership: 2_500_000,
    bounds: { minLat: 35.88, maxLat: 36.32, minLon: -96.25, maxLon: -95.72 },
  },
  {
    name: "Central Midlands Regional Transit Authority", shortName: "COMET",
    modes: ["bus"], annualRidership: 1_500_000,
    bounds: { minLat: 33.88, maxLat: 34.22, minLon: -81.35, maxLon: -80.88 },
  },
  {
    name: "Charleston Area Regional Transportation Authority", shortName: "CARTA",
    modes: ["bus"], annualRidership: 2_200_000,
    bounds: { minLat: 32.58, maxLat: 33.02, minLon: -80.35, maxLon: -79.78 },
  },
  {
    name: "Chatham Area Transit", shortName: "CAT",
    modes: ["bus"], annualRidership: 2_600_000,
    bounds: { minLat: 31.88, maxLat: 32.22, minLon: -81.35, maxLon: -80.98 },
  },
  {
    name: "Wichita Transit", shortName: "Wichita Transit",
    modes: ["bus"], annualRidership: 1_700_000,
    bounds: { minLat: 37.48, maxLat: 38.02, minLon: -97.65, maxLon: -97.08 },
  },
  {
    name: "Topeka Metro", shortName: "Metro",
    modes: ["bus"], annualRidership: 1_000_000,
    bounds: { minLat: 38.88, maxLat: 39.22, minLon: -95.95, maxLon: -95.58 },
  },

  // ── West ─────────────────────────────────────────────────────────────────────
  {
    name: "Los Angeles County Metropolitan Transportation Authority", shortName: "Metro",
    modes: ["subway", "light-rail", "bus"], annualRidership: 285_000_000,
    bounds: { minLat: 33.68, maxLat: 34.82, minLon: -118.98, maxLon: -117.58 },
  },
  {
    name: "Metrolink", shortName: "Metrolink",
    modes: ["commuter-rail"], annualRidership: 9_000_000,
    // Covers LA, Ventura, San Bernardino, Riverside, Orange, San Diego counties
    bounds: { minLat: 33.38, maxLat: 34.92, minLon: -119.25, maxLon: -117.08 },
  },
  {
    name: "Orange County Transportation Authority", shortName: "OCTA",
    modes: ["bus", "commuter-rail"], annualRidership: 27_000_000,
    bounds: { minLat: 33.38, maxLat: 33.95, minLon: -118.15, maxLon: -117.38 },
  },
  {
    name: "Riverside Transit Agency", shortName: "RTA",
    modes: ["bus", "commuter-rail"], annualRidership: 12_000_000,
    bounds: { minLat: 33.38, maxLat: 34.15, minLon: -117.78, maxLon: -116.28 },
  },
  {
    name: "San Francisco Municipal Railway", shortName: "Muni",
    modes: ["light-rail", "bus", "cable-car", "streetcar"], annualRidership: 130_000_000,
    // minLon extended to -123.15: SF's TIGERweb centroid is displaced to ~-123.03 because
    // SF County officially includes the Farallon Islands (~30mi offshore).
    bounds: { minLat: 37.68, maxLat: 37.86, minLon: -123.15, maxLon: -122.35 },
  },
  {
    name: "Bay Area Rapid Transit", shortName: "BART",
    modes: ["subway"], annualRidership: 120_000_000,
    // minLon extended to -123.15 for same SF centroid displacement reason.
    bounds: { minLat: 37.48, maxLat: 38.08, minLon: -123.15, maxLon: -121.68 },
  },
  {
    name: "AC Transit", shortName: "AC Transit",
    modes: ["bus"], annualRidership: 50_000_000,
    bounds: { minLat: 37.38, maxLat: 37.92, minLon: -122.45, maxLon: -121.78 },
  },
  {
    name: "Caltrain", shortName: "Caltrain",
    modes: ["commuter-rail"], annualRidership: 15_000_000,
    // SF to San Jose corridor; minLon extended for SF centroid displacement.
    bounds: { minLat: 37.28, maxLat: 37.82, minLon: -123.15, maxLon: -121.88 },
  },
  {
    name: "Golden Gate Ferry", shortName: "GG Ferry",
    modes: ["ferry"], annualRidership: 2_500_000,
    // minLon extended for SF centroid displacement.
    bounds: { minLat: 37.68, maxLat: 38.12, minLon: -123.15, maxLon: -122.18 },
  },
  {
    name: "Santa Clara Valley Transportation Authority", shortName: "VTA",
    modes: ["light-rail", "bus"], annualRidership: 28_000_000,
    bounds: { minLat: 36.88, maxLat: 37.52, minLon: -122.25, maxLon: -121.48 },
  },
  {
    name: "Sacramento Regional Transit District", shortName: "SacRT",
    modes: ["bus", "light-rail"], annualRidership: 22_000_000,
    bounds: { minLat: 38.38, maxLat: 38.82, minLon: -121.68, maxLon: -121.18 },
  },
  {
    name: "Metropolitan Transit System", shortName: "MTS",
    modes: ["bus", "light-rail", "commuter-rail"], annualRidership: 55_000_000,
    bounds: { minLat: 32.48, maxLat: 33.42, minLon: -117.65, maxLon: -116.78 },
  },
  {
    name: "Long Beach Transit", shortName: "LBT",
    modes: ["bus"], annualRidership: 19_000_000,
    bounds: { minLat: 33.72, maxLat: 33.92, minLon: -118.32, maxLon: -118.02 },
  },
  {
    name: "Fresno Area Express", shortName: "FAX",
    modes: ["bus"], annualRidership: 7_500_000,
    bounds: { minLat: 36.58, maxLat: 37.02, minLon: -120.08, maxLon: -119.58 },
  },
  {
    name: "GET Bus", shortName: "GET",
    modes: ["bus"], annualRidership: 5_000_000,
    bounds: { minLat: 35.28, maxLat: 35.58, minLon: -119.28, maxLon: -118.88 },
  },
  {
    name: "San Joaquin Regional Transit District", shortName: "RTD",
    modes: ["bus"], annualRidership: 5_500_000,
    bounds: { minLat: 37.78, maxLat: 38.12, minLon: -121.58, maxLon: -121.08 },
  },
  {
    name: "Stanislaus Regional Transit", shortName: "StanRTA",
    modes: ["bus"], annualRidership: 2_500_000,
    bounds: { minLat: 37.48, maxLat: 37.82, minLon: -121.18, maxLon: -120.78 },
  },
  {
    name: "King County Metro Transit", shortName: "King County Metro",
    modes: ["bus", "ferry"], annualRidership: 120_000_000,
    bounds: { minLat: 47.08, maxLat: 47.82, minLon: -122.65, maxLon: -121.78 },
  },
  {
    name: "Sound Transit", shortName: "Sound Transit",
    modes: ["light-rail", "commuter-rail"], annualRidership: 35_000_000,
    // Seattle to Tacoma and Everett
    bounds: { minLat: 46.98, maxLat: 48.12, minLon: -122.58, maxLon: -121.78 },
  },
  {
    name: "Washington State Ferries", shortName: "WSF",
    modes: ["ferry"], annualRidership: 22_000_000,
    bounds: { minLat: 47.18, maxLat: 48.82, minLon: -123.08, maxLon: -122.02 },
  },
  {
    name: "Pierce Transit", shortName: "Pierce Transit",
    modes: ["bus"], annualRidership: 12_000_000,
    bounds: { minLat: 46.98, maxLat: 47.42, minLon: -122.75, maxLon: -122.08 },
  },
  {
    name: "Spokane Transit Authority", shortName: "STA",
    modes: ["bus"], annualRidership: 8_500_000,
    bounds: { minLat: 47.48, maxLat: 47.82, minLon: -117.68, maxLon: -117.18 },
  },
  {
    name: "TriMet", shortName: "TriMet",
    modes: ["bus", "light-rail", "commuter-rail", "streetcar"], annualRidership: 65_000_000,
    bounds: { minLat: 45.18, maxLat: 45.72, minLon: -123.18, maxLon: -122.28 },
  },
  {
    name: "Lane Transit District", shortName: "LTD",
    modes: ["bus"], annualRidership: 8_200_000,
    bounds: { minLat: 43.88, maxLat: 44.22, minLon: -123.28, maxLon: -122.88 },
  },
  {
    name: "Salem Area Mass Transit District", shortName: "Cherriots",
    modes: ["bus"], annualRidership: 3_200_000,
    bounds: { minLat: 44.78, maxLat: 45.12, minLon: -123.28, maxLon: -122.78 },
  },
  {
    name: "Regional Transportation District", shortName: "RTD",
    modes: ["bus", "light-rail", "commuter-rail"], annualRidership: 58_000_000,
    // Denver metro + Boulder
    bounds: { minLat: 39.48, maxLat: 40.18, minLon: -105.48, maxLon: -104.58 },
  },
  {
    name: "Mountain Metropolitan Transit", shortName: "Mountain Metro",
    modes: ["bus"], annualRidership: 3_200_000,
    bounds: { minLat: 38.68, maxLat: 39.12, minLon: -105.18, maxLon: -104.58 },
  },
  {
    name: "Valley Metro", shortName: "Valley Metro",
    modes: ["bus", "light-rail"], annualRidership: 44_000_000,
    // Maricopa County — Phoenix, Mesa, Tempe, Scottsdale, Chandler, Glendale, etc.
    bounds: { minLat: 33.00, maxLat: 33.88, minLon: -113.08, maxLon: -111.48 },
  },
  {
    name: "Sun Tran", shortName: "Sun Tran",
    modes: ["bus", "streetcar"], annualRidership: 11_000_000,
    bounds: { minLat: 31.98, maxLat: 32.52, minLon: -111.25, maxLon: -110.68 },
  },
  {
    name: "Regional Transportation Commission of Southern Nevada", shortName: "RTC",
    modes: ["bus"], annualRidership: 52_000_000,
    // Clark County — Las Vegas, Henderson, North Las Vegas
    bounds: { minLat: 35.88, maxLat: 36.52, minLon: -115.58, maxLon: -114.88 },
  },
  {
    name: "Regional Transportation Commission of Washoe County", shortName: "RTC Washoe",
    modes: ["bus"], annualRidership: 4_500_000,
    bounds: { minLat: 39.38, maxLat: 40.02, minLon: -120.18, maxLon: -119.48 },
  },
  {
    name: "Utah Transit Authority", shortName: "UTA",
    modes: ["bus", "light-rail", "commuter-rail"], annualRidership: 46_000_000,
    // Wasatch Front — SLC to Provo/Ogden
    bounds: { minLat: 39.98, maxLat: 41.42, minLon: -112.55, maxLon: -111.68 },
  },
  {
    name: "Albuquerque Rapid Transit", shortName: "ABQ Ride",
    modes: ["bus"], annualRidership: 6_500_000,
    bounds: { minLat: 34.88, maxLat: 35.32, minLon: -107.08, maxLon: -106.28 },
  },
  {
    name: "Valley Regional Transit", shortName: "ValleyRide",
    modes: ["bus"], annualRidership: 1_400_000,
    // Ada + Canyon County (Boise, Nampa, Meridian, Caldwell)
    bounds: { minLat: 43.48, maxLat: 43.82, minLon: -116.78, maxLon: -116.08 },
  },
  {
    name: "People Mover", shortName: "People Mover",
    modes: ["bus"], annualRidership: 2_100_000,
    bounds: { minLat: 60.98, maxLat: 61.52, minLon: -150.55, maxLon: -149.48 },
  },
  {
    name: "DTS TheBus", shortName: "TheBus",
    modes: ["bus"], annualRidership: 65_000_000,
    bounds: { minLat: 21.18, maxLat: 21.75, minLon: -158.35, maxLon: -157.58 },
  },
  {
    name: "Honolulu Rail Transit", shortName: "Skyline",
    modes: ["subway"], annualRidership: 3_000_000,
    bounds: { minLat: 21.18, maxLat: 21.52, minLon: -158.22, maxLon: -157.78 },
  },

  // ── Great Plains / Mountain ───────────────────────────────────────────────────
  {
    name: "StarTran", shortName: "StarTran",
    modes: ["bus"], annualRidership: 1_800_000,
    bounds: { minLat: 40.68, maxLat: 41.02, minLon: -96.98, maxLon: -96.48 },
  },
  {
    name: "Sioux Falls Transit", shortName: "SFT",
    modes: ["bus"], annualRidership: 900_000,
    bounds: { minLat: 43.38, maxLat: 43.72, minLon: -96.98, maxLon: -96.48 },
  },
  {
    name: "Rapid Ride", shortName: "Rapid Ride",
    modes: ["bus"], annualRidership: 400_000,
    bounds: { minLat: 43.98, maxLat: 44.22, minLon: -103.38, maxLon: -103.08 },
  },
  {
    name: "MET Transit", shortName: "MET Transit",
    modes: ["bus"], annualRidership: 600_000,
    bounds: { minLat: 45.68, maxLat: 46.02, minLon: -108.88, maxLon: -108.38 },
  },
  {
    name: "Mountain Line", shortName: "Mountain Line",
    modes: ["bus"], annualRidership: 800_000,
    bounds: { minLat: 46.78, maxLat: 47.12, minLon: -114.28, maxLon: -113.88 },
  },
  {
    name: "Cheyenne Transit Program", shortName: "CTP",
    modes: ["bus"], annualRidership: 300_000,
    bounds: { minLat: 41.08, maxLat: 41.32, minLon: -105.08, maxLon: -104.68 },
  },
  {
    name: "Casper Area Transit", shortName: "CAT",
    modes: ["bus"], annualRidership: 200_000,
    bounds: { minLat: 42.78, maxLat: 43.02, minLon: -106.58, maxLon: -106.18 },
  },
];

export function getTransitInfo(lat: number, lon: number): TransitInfo | null {
  const agencies = AGENCIES
    .filter(a => lat >= a.bounds.minLat && lat <= a.bounds.maxLat
              && lon >= a.bounds.minLon && lon <= a.bounds.maxLon)
    .map(({ bounds: _bounds, ...rest }) => rest as TransitAgency);
  return agencies.length ? { agencies } : null;
}
