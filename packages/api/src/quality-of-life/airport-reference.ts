import type { AirportBusyness, AirportInfo } from "./quality-of-life.types.js";

export const FAA_AIRPORT_REFERENCE_AS_OF = "2025-01-01";
export const FAA_AIRPORT_SOURCE_URL = "https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/Airport_Data/";

export const BTS_SOURCE_URL = "https://www.bts.gov/topics/airlines-and-airports/passengers";
export const BTS_ENPLANEMENTS_AS_OF = "2023";

// US total commercial enplanements 2023 (~900M), used for percentile calc
const US_TOTAL_ENPLANEMENTS = 900_000;

export type AirportRecord = AirportInfo & {
  lat: number;
  lon: number;
  /** Annual enplanements in thousands (BTS 2023) */
  enplanements: number;
  /** Primary airline(s) that use this as a hub or focus city */
  hubAirlines?: string[];
};

/**
 * ~170 US commercial service airports with coordinates and BTS 2023 enplanement data.
 * Coordinates are approximate center-field lat/lon.
 * Enplanements are in thousands (e.g. 51000 = 51 million passengers).
 */
export const AIRPORTS: AirportRecord[] = [
  // === LARGE HUBS (≥1% of US enplanements) ===
  { code: "ATL", name: "Hartsfield-Jackson Atlanta International", city: "Atlanta", state: "GA", category: "primary-commercial", lat: 33.6407, lon: -84.4277, enplanements: 51_000, hubAirlines: ["Delta"] },
  { code: "LAX", name: "Los Angeles International", city: "Los Angeles", state: "CA", category: "primary-commercial", lat: 33.9425, lon: -118.4081, enplanements: 40_000, hubAirlines: ["American", "Delta", "United"] },
  { code: "ORD", name: "Chicago O'Hare International", city: "Chicago", state: "IL", category: "primary-commercial", lat: 41.9742, lon: -87.9073, enplanements: 40_000, hubAirlines: ["American", "United"] },
  { code: "DFW", name: "Dallas/Fort Worth International", city: "Dallas", state: "TX", category: "primary-commercial", lat: 32.8998, lon: -97.0403, enplanements: 38_000, hubAirlines: ["American"] },
  { code: "DEN", name: "Denver International", city: "Denver", state: "CO", category: "primary-commercial", lat: 39.8561, lon: -104.6737, enplanements: 36_000, hubAirlines: ["United", "Southwest"] },
  { code: "LAS", name: "Harry Reid International", city: "Las Vegas", state: "NV", category: "primary-commercial", lat: 36.0840, lon: -115.1537, enplanements: 27_000, hubAirlines: ["Southwest"] },
  { code: "MCO", name: "Orlando International", city: "Orlando", state: "FL", category: "primary-commercial", lat: 28.4294, lon: -81.3089, enplanements: 26_000 },
  { code: "SEA", name: "Seattle-Tacoma International", city: "Seattle", state: "WA", category: "primary-commercial", lat: 47.4502, lon: -122.3088, enplanements: 26_000, hubAirlines: ["Alaska", "Delta"] },
  { code: "CLT", name: "Charlotte Douglas International", city: "Charlotte", state: "NC", category: "primary-commercial", lat: 35.2140, lon: -80.9431, enplanements: 28_500, hubAirlines: ["American"] },
  { code: "JFK", name: "John F. Kennedy International", city: "New York", state: "NY", category: "primary-commercial", lat: 40.6413, lon: -73.7781, enplanements: 30_000, hubAirlines: ["American", "Delta", "JetBlue"] },
  { code: "PHX", name: "Phoenix Sky Harbor International", city: "Phoenix", state: "AZ", category: "primary-commercial", lat: 33.4373, lon: -112.0078, enplanements: 26_000, hubAirlines: ["American", "Southwest"] },
  { code: "MIA", name: "Miami International", city: "Miami", state: "FL", category: "primary-commercial", lat: 25.7959, lon: -80.2870, enplanements: 24_000, hubAirlines: ["American"] },
  { code: "BOS", name: "Boston Logan International", city: "Boston", state: "MA", category: "primary-commercial", lat: 42.3656, lon: -71.0096, enplanements: 20_000, hubAirlines: ["American", "JetBlue"] },
  { code: "MSP", name: "Minneapolis-Saint Paul International", city: "Minneapolis", state: "MN", category: "primary-commercial", lat: 44.8848, lon: -93.2223, enplanements: 19_500, hubAirlines: ["Delta"] },
  { code: "EWR", name: "Newark Liberty International", city: "Newark", state: "NJ", category: "primary-commercial", lat: 40.6895, lon: -74.1745, enplanements: 19_000, hubAirlines: ["United"] },
  { code: "DTW", name: "Detroit Metropolitan Wayne County", city: "Detroit", state: "MI", category: "primary-commercial", lat: 42.2126, lon: -83.3534, enplanements: 18_000, hubAirlines: ["Delta"] },

  // === MEDIUM HUBS (0.25–1% of US enplanements) ===
  { code: "SFO", name: "San Francisco International", city: "San Francisco", state: "CA", category: "primary-commercial", lat: 37.6213, lon: -122.3790, enplanements: 22_000, hubAirlines: ["United"] },
  { code: "IAH", name: "George Bush Intercontinental", city: "Houston", state: "TX", category: "primary-commercial", lat: 29.9902, lon: -95.3368, enplanements: 21_000, hubAirlines: ["United"] },
  { code: "BWI", name: "Baltimore/Washington International Thurgood Marshall", city: "Baltimore", state: "MD", category: "primary-commercial", lat: 39.1754, lon: -76.6683, enplanements: 15_000, hubAirlines: ["Southwest"] },
  { code: "SLC", name: "Salt Lake City International", city: "Salt Lake City", state: "UT", category: "primary-commercial", lat: 40.7899, lon: -111.9791, enplanements: 14_500, hubAirlines: ["Delta"] },
  { code: "PHL", name: "Philadelphia International", city: "Philadelphia", state: "PA", category: "primary-commercial", lat: 39.8744, lon: -75.2424, enplanements: 14_500, hubAirlines: ["American"] },
  { code: "LGA", name: "LaGuardia", city: "New York", state: "NY", category: "primary-commercial", lat: 40.7772, lon: -73.8726, enplanements: 14_000, hubAirlines: ["American", "Delta"] },
  { code: "DCA", name: "Ronald Reagan Washington National", city: "Washington", state: "DC", category: "primary-commercial", lat: 38.8521, lon: -77.0377, enplanements: 12_000, hubAirlines: ["American"] },
  { code: "MDW", name: "Chicago Midway International", city: "Chicago", state: "IL", category: "primary-commercial", lat: 41.7868, lon: -87.7522, enplanements: 10_000, hubAirlines: ["Southwest"] },
  { code: "HNL", name: "Daniel K. Inouye International", city: "Honolulu", state: "HI", category: "primary-commercial", lat: 21.3187, lon: -157.9225, enplanements: 10_500, hubAirlines: ["Hawaiian"] },
  { code: "SAN", name: "San Diego International", city: "San Diego", state: "CA", category: "primary-commercial", lat: 32.7338, lon: -117.1933, enplanements: 12_500 },
  { code: "TPA", name: "Tampa International", city: "Tampa", state: "FL", category: "primary-commercial", lat: 27.9755, lon: -82.5332, enplanements: 11_000 },
  { code: "PDX", name: "Portland International", city: "Portland", state: "OR", category: "primary-commercial", lat: 45.5898, lon: -122.5951, enplanements: 9_500, hubAirlines: ["Alaska"] },
  { code: "BNA", name: "Nashville International", city: "Nashville", state: "TN", category: "primary-commercial", lat: 36.1245, lon: -86.6782, enplanements: 9_500 },
  { code: "AUS", name: "Austin-Bergstrom International", city: "Austin", state: "TX", category: "primary-commercial", lat: 30.1975, lon: -97.6664, enplanements: 10_500 },
  { code: "DAL", name: "Dallas Love Field", city: "Dallas", state: "TX", category: "primary-commercial", lat: 32.8481, lon: -96.8518, enplanements: 8_000, hubAirlines: ["Southwest"] },
  { code: "HOU", name: "William P. Hobby Airport", city: "Houston", state: "TX", category: "primary-commercial", lat: 29.6454, lon: -95.2789, enplanements: 5_500, hubAirlines: ["Southwest"] },
  { code: "SAT", name: "San Antonio International", city: "San Antonio", state: "TX", category: "primary-commercial", lat: 29.5337, lon: -98.4698, enplanements: 5_000 },
  { code: "STL", name: "St. Louis Lambert International", city: "St. Louis", state: "MO", category: "primary-commercial", lat: 38.7487, lon: -90.3700, enplanements: 7_000 },
  { code: "MCI", name: "Kansas City International", city: "Kansas City", state: "MO", category: "primary-commercial", lat: 39.2976, lon: -94.7139, enplanements: 6_500 },
  { code: "MSY", name: "Louis Armstrong New Orleans International", city: "New Orleans", state: "LA", category: "primary-commercial", lat: 29.9934, lon: -90.2580, enplanements: 6_000 },
  { code: "PIT", name: "Pittsburgh International", city: "Pittsburgh", state: "PA", category: "primary-commercial", lat: 40.4915, lon: -80.2329, enplanements: 5_200 },
  { code: "CVG", name: "Cincinnati/Northern Kentucky International", city: "Cincinnati", state: "OH", category: "primary-commercial", lat: 39.0489, lon: -84.6678, enplanements: 4_500 },
  { code: "RDU", name: "Raleigh-Durham International", city: "Raleigh", state: "NC", category: "primary-commercial", lat: 35.8776, lon: -78.7875, enplanements: 6_500 },
  { code: "IND", name: "Indianapolis International", city: "Indianapolis", state: "IN", category: "primary-commercial", lat: 39.7173, lon: -86.2944, enplanements: 4_600 },
  { code: "CMH", name: "John Glenn Columbus International", city: "Columbus", state: "OH", category: "primary-commercial", lat: 39.9980, lon: -82.8919, enplanements: 4_200 },
  { code: "ABQ", name: "Albuquerque International Sunport", city: "Albuquerque", state: "NM", category: "primary-commercial", lat: 35.0402, lon: -106.6090, enplanements: 3_500 },
  { code: "BOI", name: "Boise Airport", city: "Boise", state: "ID", category: "primary-commercial", lat: 43.5644, lon: -116.2228, enplanements: 3_600 },
  { code: "MKE", name: "Milwaukee Mitchell International", city: "Milwaukee", state: "WI", category: "primary-commercial", lat: 42.9472, lon: -87.8966, enplanements: 4_000 },
  { code: "BHM", name: "Birmingham-Shuttlesworth International", city: "Birmingham", state: "AL", category: "primary-commercial", lat: 33.5629, lon: -86.7535, enplanements: 2_900 },
  { code: "OMA", name: "Eppley Airfield", city: "Omaha", state: "NE", category: "primary-commercial", lat: 41.3032, lon: -95.8941, enplanements: 2_300 },
  { code: "OKC", name: "Will Rogers World Airport", city: "Oklahoma City", state: "OK", category: "primary-commercial", lat: 35.3931, lon: -97.6007, enplanements: 2_300 },
  { code: "CHS", name: "Charleston International", city: "North Charleston", state: "SC", category: "primary-commercial", lat: 32.8986, lon: -80.0405, enplanements: 2_400 },
  { code: "SDF", name: "Louisville Muhammad Ali International", city: "Louisville", state: "KY", category: "primary-commercial", lat: 38.1744, lon: -85.7360, enplanements: 2_200 },
  { code: "ANC", name: "Ted Stevens Anchorage International", city: "Anchorage", state: "AK", category: "primary-commercial", lat: 61.1743, lon: -149.9963, enplanements: 2_700 },
  { code: "BDL", name: "Bradley International", city: "Windsor Locks", state: "CT", category: "primary-commercial", lat: 41.9389, lon: -72.6832, enplanements: 2_800 },
  { code: "PVD", name: "Rhode Island T.F. Green International", city: "Warwick", state: "RI", category: "primary-commercial", lat: 41.7240, lon: -71.4282, enplanements: 2_000 },

  // === SMALL HUBS (0.05–0.25% of US enplanements) ===
  { code: "JAX", name: "Jacksonville International", city: "Jacksonville", state: "FL", category: "primary-commercial", lat: 30.4941, lon: -81.6879, enplanements: 3_800 },
  { code: "SJC", name: "Norman Y. Mineta San Jose International", city: "San Jose", state: "CA", category: "primary-commercial", lat: 37.3626, lon: -121.9290, enplanements: 5_500 },
  { code: "OAK", name: "Oakland International", city: "Oakland", state: "CA", category: "primary-commercial", lat: 37.7213, lon: -122.2208, enplanements: 5_000 },
  { code: "ONT", name: "Ontario International", city: "Ontario", state: "CA", category: "primary-commercial", lat: 34.0560, lon: -117.6012, enplanements: 2_700 },
  { code: "BUR", name: "Hollywood Burbank Airport", city: "Burbank", state: "CA", category: "primary-commercial", lat: 34.2007, lon: -118.3585, enplanements: 2_400 },
  { code: "LGB", name: "Long Beach Airport", city: "Long Beach", state: "CA", category: "primary-commercial", lat: 33.8177, lon: -118.1516, enplanements: 1_500 },
  { code: "SMF", name: "Sacramento International", city: "Sacramento", state: "CA", category: "primary-commercial", lat: 38.6954, lon: -121.5908, enplanements: 6_000 },
  { code: "SNA", name: "John Wayne Airport", city: "Santa Ana", state: "CA", category: "primary-commercial", lat: 33.6757, lon: -117.8682, enplanements: 4_600 },
  { code: "RNO", name: "Reno-Tahoe International", city: "Reno", state: "NV", category: "primary-commercial", lat: 39.4991, lon: -119.7681, enplanements: 2_400 },
  { code: "LIT", name: "Bill and Hillary Clinton National Airport", city: "Little Rock", state: "AR", category: "primary-commercial", lat: 34.7294, lon: -92.2243, enplanements: 1_600 },
  { code: "XNA", name: "Northwest Arkansas National", city: "Bentonville", state: "AR", category: "primary-commercial", lat: 36.2819, lon: -94.3068, enplanements: 1_200 },
  { code: "TUL", name: "Tulsa International", city: "Tulsa", state: "OK", category: "primary-commercial", lat: 36.1984, lon: -95.8881, enplanements: 1_700 },
  { code: "ELP", name: "El Paso International", city: "El Paso", state: "TX", category: "primary-commercial", lat: 31.8072, lon: -106.3779, enplanements: 1_600 },
  { code: "LBB", name: "Lubbock Preston Smith International", city: "Lubbock", state: "TX", category: "primary-commercial", lat: 33.6636, lon: -101.8228, enplanements: 700 },
  { code: "MAF", name: "Midland International Air and Space Port", city: "Midland", state: "TX", category: "primary-commercial", lat: 31.9425, lon: -102.2019, enplanements: 900 },
  { code: "AMA", name: "Rick Husband Amarillo International", city: "Amarillo", state: "TX", category: "primary-commercial", lat: 35.2194, lon: -101.7059, enplanements: 600 },
  { code: "CRP", name: "Corpus Christi International", city: "Corpus Christi", state: "TX", category: "primary-commercial", lat: 27.7704, lon: -97.5012, enplanements: 600 },
  { code: "DSM", name: "Des Moines International", city: "Des Moines", state: "IA", category: "primary-commercial", lat: 41.5340, lon: -93.6631, enplanements: 2_000 },
  { code: "CID", name: "The Eastern Iowa Airport", city: "Cedar Rapids", state: "IA", category: "primary-commercial", lat: 41.8842, lon: -91.7108, enplanements: 900 },
  { code: "MSN", name: "Dane County Regional Airport", city: "Madison", state: "WI", category: "primary-commercial", lat: 43.1399, lon: -89.3375, enplanements: 1_500 },
  { code: "GRR", name: "Gerald R. Ford International", city: "Grand Rapids", state: "MI", category: "primary-commercial", lat: 42.8808, lon: -85.5228, enplanements: 1_800 },
  { code: "FNT", name: "Bishop International Airport", city: "Flint", state: "MI", category: "primary-commercial", lat: 42.9654, lon: -83.7436, enplanements: 500 },
  { code: "LAN", name: "Capital Region International Airport", city: "Lansing", state: "MI", category: "primary-commercial", lat: 42.7787, lon: -84.5874, enplanements: 400 },
  { code: "DAY", name: "Dayton International", city: "Dayton", state: "OH", category: "primary-commercial", lat: 39.9024, lon: -84.2194, enplanements: 1_200 },
  { code: "CLE", name: "Cleveland Hopkins International", city: "Cleveland", state: "OH", category: "primary-commercial", lat: 41.4117, lon: -81.8498, enplanements: 4_200 },
  { code: "TOL", name: "Toledo Express Airport", city: "Toledo", state: "OH", category: "primary-commercial", lat: 41.5868, lon: -83.8078, enplanements: 300 },
  { code: "GSO", name: "Piedmont Triad International", city: "Greensboro", state: "NC", category: "primary-commercial", lat: 36.0978, lon: -79.9373, enplanements: 1_200 },
  { code: "GSP", name: "Greenville-Spartanburg International", city: "Greer", state: "SC", category: "primary-commercial", lat: 34.8957, lon: -82.2189, enplanements: 1_500 },
  { code: "MYR", name: "Myrtle Beach International", city: "Myrtle Beach", state: "SC", category: "primary-commercial", lat: 33.6797, lon: -78.9283, enplanements: 1_100 },
  { code: "CAE", name: "Columbia Metropolitan Airport", city: "Columbia", state: "SC", category: "primary-commercial", lat: 33.9388, lon: -81.1195, enplanements: 800 },
  { code: "SAV", name: "Savannah/Hilton Head International", city: "Savannah", state: "GA", category: "primary-commercial", lat: 32.1276, lon: -81.2021, enplanements: 1_600 },
  { code: "AGS", name: "Augusta Regional Airport", city: "Augusta", state: "GA", category: "primary-commercial", lat: 33.3699, lon: -81.9645, enplanements: 400 },
  { code: "DAB", name: "Daytona Beach International", city: "Daytona Beach", state: "FL", category: "primary-commercial", lat: 29.1799, lon: -81.0581, enplanements: 500 },
  { code: "RSW", name: "Southwest Florida International", city: "Fort Myers", state: "FL", category: "primary-commercial", lat: 26.5362, lon: -81.7552, enplanements: 5_500 },
  { code: "PBI", name: "Palm Beach International", city: "West Palm Beach", state: "FL", category: "primary-commercial", lat: 26.6832, lon: -80.0956, enplanements: 3_500 },
  { code: "SRQ", name: "Sarasota-Bradenton International", city: "Sarasota", state: "FL", category: "primary-commercial", lat: 27.3954, lon: -82.5543, enplanements: 2_200 },
  { code: "PIE", name: "St. Pete-Clearwater International", city: "Clearwater", state: "FL", category: "primary-commercial", lat: 27.9102, lon: -82.6874, enplanements: 1_200 },
  { code: "GNV", name: "Gainesville Regional Airport", city: "Gainesville", state: "FL", category: "primary-commercial", lat: 29.6900, lon: -82.2717, enplanements: 400 },
  { code: "TLH", name: "Tallahassee International", city: "Tallahassee", state: "FL", category: "primary-commercial", lat: 30.3965, lon: -84.3503, enplanements: 600 },
  { code: "PNS", name: "Pensacola International", city: "Pensacola", state: "FL", category: "primary-commercial", lat: 30.4734, lon: -87.1866, enplanements: 1_200 },
  { code: "VPS", name: "Northwest Florida Beaches International", city: "Panama City Beach", state: "FL", category: "primary-commercial", lat: 30.4832, lon: -86.5239, enplanements: 800 },
  { code: "MEM", name: "Memphis International", city: "Memphis", state: "TN", category: "primary-commercial", lat: 35.0424, lon: -89.9767, enplanements: 2_200 },
  { code: "TYS", name: "McGhee Tyson Airport", city: "Knoxville", state: "TN", category: "primary-commercial", lat: 35.8110, lon: -83.9940, enplanements: 1_500 },
  { code: "CHA", name: "Lovell Field Airport", city: "Chattanooga", state: "TN", category: "primary-commercial", lat: 35.0353, lon: -85.2038, enplanements: 700 },
  { code: "TRI", name: "Tri-Cities Regional Airport", city: "Blountville", state: "TN", category: "primary-commercial", lat: 36.4752, lon: -82.4074, enplanements: 400 },
  { code: "HSV", name: "Huntsville International Airport", city: "Huntsville", state: "AL", category: "primary-commercial", lat: 34.6372, lon: -86.7751, enplanements: 900 },
  { code: "MOB", name: "Mobile Regional Airport", city: "Mobile", state: "AL", category: "primary-commercial", lat: 30.6912, lon: -88.2428, enplanements: 400 },
  { code: "MGM", name: "Montgomery Regional Airport", city: "Montgomery", state: "AL", category: "primary-commercial", lat: 32.3006, lon: -86.3940, enplanements: 300 },
  { code: "GTR", name: "Golden Triangle Regional Airport", city: "Columbus", state: "MS", category: "primary-commercial", lat: 33.4503, lon: -88.5914, enplanements: 100 },
  { code: "JAN", name: "Jackson-Medgar Wiley Evers International", city: "Jackson", state: "MS", category: "primary-commercial", lat: 32.3112, lon: -90.0759, enplanements: 800 },
  { code: "GPT", name: "Gulfport-Biloxi International", city: "Gulfport", state: "MS", category: "primary-commercial", lat: 30.4073, lon: -89.0701, enplanements: 400 },
  { code: "SHV", name: "Shreveport Regional Airport", city: "Shreveport", state: "LA", category: "primary-commercial", lat: 32.4466, lon: -93.8256, enplanements: 500 },
  { code: "BTR", name: "Baton Rouge Metropolitan Airport", city: "Baton Rouge", state: "LA", category: "primary-commercial", lat: 30.5332, lon: -91.1496, enplanements: 700 },
  { code: "LFT", name: "Lafayette Regional Airport", city: "Lafayette", state: "LA", category: "primary-commercial", lat: 30.2053, lon: -91.9876, enplanements: 400 },
  { code: "TUP", name: "Tupelo Regional Airport", city: "Tupelo", state: "MS", category: "primary-commercial", lat: 34.2681, lon: -88.7699, enplanements: 100 },
  { code: "LEX", name: "Blue Grass Airport", city: "Lexington", state: "KY", category: "primary-commercial", lat: 38.0365, lon: -84.6059, enplanements: 1_000 },
  { code: "BZN", name: "Bozeman Yellowstone International", city: "Bozeman", state: "MT", category: "primary-commercial", lat: 45.7775, lon: -111.1527, enplanements: 1_200 },
  { code: "GFK", name: "Grand Forks International", city: "Grand Forks", state: "ND", category: "primary-commercial", lat: 47.9493, lon: -97.1761, enplanements: 300 },
  { code: "FAR", name: "Hector International", city: "Fargo", state: "ND", category: "primary-commercial", lat: 46.9207, lon: -96.8158, enplanements: 800 },
  { code: "BIS", name: "Bismarck Airport", city: "Bismarck", state: "ND", category: "primary-commercial", lat: 46.7727, lon: -100.7467, enplanements: 400 },
  { code: "FSD", name: "Sioux Falls Regional Airport", city: "Sioux Falls", state: "SD", category: "primary-commercial", lat: 43.5820, lon: -96.7419, enplanements: 700 },
  { code: "RAP", name: "Rapid City Regional Airport", city: "Rapid City", state: "SD", category: "primary-commercial", lat: 44.0453, lon: -103.0574, enplanements: 500 },
  { code: "ICT", name: "Wichita Dwight D. Eisenhower National", city: "Wichita", state: "KS", category: "primary-commercial", lat: 37.6499, lon: -97.4331, enplanements: 1_500 },
  { code: "MHT", name: "Manchester-Boston Regional", city: "Manchester", state: "NH", category: "primary-commercial", lat: 42.9326, lon: -71.4357, enplanements: 900 },
  { code: "BTV", name: "Patrick Leahy Burlington International", city: "Burlington", state: "VT", category: "primary-commercial", lat: 44.4720, lon: -73.1533, enplanements: 700 },
  { code: "PWM", name: "Portland International Jetport", city: "Portland", state: "ME", category: "primary-commercial", lat: 43.6462, lon: -70.3093, enplanements: 1_100 },
  { code: "BGR", name: "Bangor International Airport", city: "Bangor", state: "ME", category: "primary-commercial", lat: 44.8074, lon: -68.8281, enplanements: 400 },
  { code: "ACK", name: "Nantucket Memorial Airport", city: "Nantucket", state: "MA", category: "primary-commercial", lat: 41.2531, lon: -70.0602, enplanements: 200 },
  { code: "HYA", name: "Barnstable Municipal Airport", city: "Hyannis", state: "MA", category: "primary-commercial", lat: 41.6693, lon: -70.2804, enplanements: 200 },
  { code: "ALB", name: "Albany International", city: "Albany", state: "NY", category: "primary-commercial", lat: 42.7483, lon: -73.8017, enplanements: 1_400 },
  { code: "BUF", name: "Buffalo Niagara International", city: "Buffalo", state: "NY", category: "primary-commercial", lat: 42.9405, lon: -78.7322, enplanements: 2_300 },
  { code: "ROC", name: "Greater Rochester International", city: "Rochester", state: "NY", category: "primary-commercial", lat: 43.1189, lon: -77.6724, enplanements: 1_500 },
  { code: "SYR", name: "Syracuse Hancock International", city: "Syracuse", state: "NY", category: "primary-commercial", lat: 43.1112, lon: -76.1063, enplanements: 1_000 },
  { code: "PWK", name: "Chicago Executive Airport", city: "Wheeling", state: "IL", category: "primary-commercial", lat: 42.1142, lon: -87.9015, enplanements: 200 },
  { code: "GRB", name: "Austin Straubel International", city: "Green Bay", state: "WI", category: "primary-commercial", lat: 44.4851, lon: -88.1296, enplanements: 700 },
  { code: "LSE", name: "La Crosse Regional Airport", city: "La Crosse", state: "WI", category: "primary-commercial", lat: 43.8790, lon: -91.2567, enplanements: 200 },
  { code: "DLH", name: "Duluth International Airport", city: "Duluth", state: "MN", category: "primary-commercial", lat: 46.8421, lon: -92.1936, enplanements: 300 },
  { code: "RST", name: "Rochester International Airport", city: "Rochester", state: "MN", category: "primary-commercial", lat: 43.9083, lon: -92.5000, enplanements: 300 },
  { code: "SBN", name: "South Bend International", city: "South Bend", state: "IN", category: "primary-commercial", lat: 41.7087, lon: -86.3173, enplanements: 700 },
  { code: "EVV", name: "Evansville Regional Airport", city: "Evansville", state: "IN", category: "primary-commercial", lat: 38.0369, lon: -87.5324, enplanements: 500 },
  { code: "FWA", name: "Fort Wayne International Airport", city: "Fort Wayne", state: "IN", category: "primary-commercial", lat: 40.9785, lon: -85.1952, enplanements: 500 },
  { code: "RFD", name: "Chicago Rockford International", city: "Rockford", state: "IL", category: "primary-commercial", lat: 42.1954, lon: -89.0972, enplanements: 200 },
  { code: "BMI", name: "Central Illinois Regional Airport", city: "Bloomington", state: "IL", category: "primary-commercial", lat: 40.4771, lon: -88.9159, enplanements: 200 },
  { code: "PIA", name: "General Wayne A. Downing Peoria International", city: "Peoria", state: "IL", category: "primary-commercial", lat: 40.6642, lon: -89.6933, enplanements: 300 },
  { code: "MLI", name: "Quad City International Airport", city: "Moline", state: "IL", category: "primary-commercial", lat: 41.4485, lon: -90.5075, enplanements: 700 },
  { code: "SGF", name: "Springfield-Branson National Airport", city: "Springfield", state: "MO", category: "primary-commercial", lat: 37.2457, lon: -93.3886, enplanements: 600 },
  { code: "COU", name: "Columbia Regional Airport", city: "Columbia", state: "MO", category: "primary-commercial", lat: 38.8181, lon: -92.2196, enplanements: 200 },
  { code: "TUL", name: "Tulsa International", city: "Tulsa", state: "OK", category: "primary-commercial", lat: 36.1984, lon: -95.8881, enplanements: 1_700 },
  { code: "GEG", name: "Spokane International", city: "Spokane", state: "WA", category: "primary-commercial", lat: 47.6199, lon: -117.5338, enplanements: 2_200 },
  { code: "PSP", name: "Palm Springs International", city: "Palm Springs", state: "CA", category: "primary-commercial", lat: 33.8297, lon: -116.5067, enplanements: 1_200 },
  { code: "SBA", name: "Santa Barbara Municipal Airport", city: "Santa Barbara", state: "CA", category: "primary-commercial", lat: 34.4262, lon: -119.8401, enplanements: 600 },
  { code: "SBP", name: "San Luis Obispo County Regional Airport", city: "San Luis Obispo", state: "CA", category: "primary-commercial", lat: 35.2368, lon: -120.6476, enplanements: 300 },
  { code: "FAT", name: "Fresno Yosemite International", city: "Fresno", state: "CA", category: "primary-commercial", lat: 36.7762, lon: -119.7182, enplanements: 1_200 },
  { code: "MFR", name: "Rogue Valley International-Medford", city: "Medford", state: "OR", category: "primary-commercial", lat: 42.3742, lon: -122.8735, enplanements: 700 },
  { code: "EUG", name: "Eugene Airport", city: "Eugene", state: "OR", category: "primary-commercial", lat: 44.1246, lon: -123.2119, enplanements: 900 },
  { code: "RDM", name: "Roberts Field", city: "Redmond", state: "OR", category: "primary-commercial", lat: 44.2541, lon: -121.1500, enplanements: 700 },
  { code: "YKM", name: "Yakima Air Terminal", city: "Yakima", state: "WA", category: "primary-commercial", lat: 46.5682, lon: -120.5440, enplanements: 200 },
  { code: "BLI", name: "Bellingham International Airport", city: "Bellingham", state: "WA", category: "primary-commercial", lat: 48.7928, lon: -122.5376, enplanements: 500 },
  { code: "PSC", name: "Tri-Cities Airport", city: "Pasco", state: "WA", category: "primary-commercial", lat: 46.2647, lon: -119.1190, enplanements: 500 },
  { code: "JAC", name: "Jackson Hole Airport", city: "Jackson", state: "WY", category: "primary-commercial", lat: 43.6073, lon: -110.7377, enplanements: 600 },
  { code: "COS", name: "Colorado Springs Airport", city: "Colorado Springs", state: "CO", category: "primary-commercial", lat: 38.8059, lon: -104.7008, enplanements: 1_300 },
  { code: "GJT", name: "Grand Junction Regional Airport", city: "Grand Junction", state: "CO", category: "primary-commercial", lat: 39.1224, lon: -108.5270, enplanements: 500 },
  { code: "DRO", name: "Durango-La Plata County Airport", city: "Durango", state: "CO", category: "primary-commercial", lat: 37.1515, lon: -107.7540, enplanements: 300 },
  { code: "ASE", name: "Aspen/Pitkin County Airport", city: "Aspen", state: "CO", category: "primary-commercial", lat: 39.2232, lon: -106.8688, enplanements: 300 },
  { code: "MTJ", name: "Montrose Regional Airport", city: "Montrose", state: "CO", category: "primary-commercial", lat: 38.5098, lon: -107.8941, enplanements: 400 },
  { code: "LAS", name: "Harry Reid International", city: "Las Vegas", state: "NV", category: "primary-commercial", lat: 36.0840, lon: -115.1537, enplanements: 27_000 },
  { code: "TUS", name: "Tucson International Airport", city: "Tucson", state: "AZ", category: "primary-commercial", lat: 32.1161, lon: -110.9410, enplanements: 2_200 },
  { code: "FLG", name: "Flagstaff Pulliam Airport", city: "Flagstaff", state: "AZ", category: "primary-commercial", lat: 35.1385, lon: -111.6715, enplanements: 200 },
  { code: "GCN", name: "Grand Canyon National Park Airport", city: "Tusayan", state: "AZ", category: "primary-commercial", lat: 35.9524, lon: -112.1470, enplanements: 100 },
  { code: "SJU", name: "Luis Muñoz Marín International", city: "San Juan", state: "PR", category: "primary-commercial", lat: 18.4394, lon: -66.0018, enplanements: 5_000 },
  { code: "GUM", name: "Antonio B. Won Pat International", city: "Tamuning", state: "GU", category: "primary-commercial", lat: 13.4834, lon: 144.7960, enplanements: 2_000 },
  { code: "CRW", name: "West Virginia International Yeager", city: "Charleston", state: "WV", category: "primary-commercial", lat: 38.3731, lon: -81.5932, enplanements: 400 },
  { code: "CKB", name: "North Central West Virginia Airport", city: "Clarksburg", state: "WV", category: "primary-commercial", lat: 39.2966, lon: -80.2281, enplanements: 200 },
  { code: "HTS", name: "Tri-State Milton J. Ferguson Field", city: "Huntington", state: "WV", category: "primary-commercial", lat: 38.3668, lon: -82.5580, enplanements: 200 },
  { code: "ACY", name: "Atlantic City International Airport", city: "Egg Harbor Township", state: "NJ", category: "primary-commercial", lat: 39.4576, lon: -74.5772, enplanements: 700 },
  { code: "AVP", name: "Wilkes-Barre/Scranton International", city: "Scranton", state: "PA", category: "primary-commercial", lat: 41.3385, lon: -75.7234, enplanements: 600 },
  { code: "MDT", name: "Harrisburg International Airport", city: "Harrisburg", state: "PA", category: "primary-commercial", lat: 40.1935, lon: -76.7634, enplanements: 800 },
  { code: "ABE", name: "Lehigh Valley International Airport", city: "Allentown", state: "PA", category: "primary-commercial", lat: 40.6521, lon: -75.4408, enplanements: 700 },
  { code: "ERI", name: "Erie International Airport", city: "Erie", state: "PA", category: "primary-commercial", lat: 42.0831, lon: -80.1739, enplanements: 400 },
  { code: "ORF", name: "Norfolk International Airport", city: "Norfolk", state: "VA", category: "primary-commercial", lat: 36.8976, lon: -76.0132, enplanements: 2_200 },
  { code: "RIC", name: "Richmond International Airport", city: "Richmond", state: "VA", category: "primary-commercial", lat: 37.5052, lon: -77.3197, enplanements: 2_400 },
  { code: "ROA", name: "Roanoke-Blacksburg Regional Airport", city: "Roanoke", state: "VA", category: "primary-commercial", lat: 37.3255, lon: -79.9754, enplanements: 700 },
  { code: "CHO", name: "Charlottesville-Albemarle Airport", city: "Charlottesville", state: "VA", category: "primary-commercial", lat: 38.1386, lon: -78.4529, enplanements: 400 },
  { code: "IAD", name: "Washington Dulles International", city: "Dulles", state: "VA", category: "primary-commercial", lat: 38.9531, lon: -77.4565, enplanements: 13_000 },
  { code: "OAJ", name: "Albert J. Ellis Airport", city: "Jacksonville", state: "NC", category: "primary-commercial", lat: 34.8292, lon: -77.6121, enplanements: 400 },
  { code: "ILM", name: "Wilmington International Airport", city: "Wilmington", state: "NC", category: "primary-commercial", lat: 34.2706, lon: -77.9026, enplanements: 900 },
  { code: "AVL", name: "Asheville Regional Airport", city: "Asheville", state: "NC", category: "primary-commercial", lat: 35.4362, lon: -82.5418, enplanements: 1_100 },
  { code: "FAY", name: "Fayetteville Regional Airport", city: "Fayetteville", state: "NC", category: "primary-commercial", lat: 34.9912, lon: -78.8803, enplanements: 400 },
];

// De-duplicate by code (some entries like LAS appear twice)
const seen = new Set<string>();
const UNIQUE_AIRPORTS = AIRPORTS.filter(a => {
  if (seen.has(a.code)) return false;
  seen.add(a.code);
  return true;
});

// Build lookup map
const AIRPORT_MAP = new Map<string, AirportRecord>(
  UNIQUE_AIRPORTS.map(a => [a.code, a])
);

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find the nearest airport to the given coordinates.
 * Returns null if no lat/lon provided.
 */
export function findNearestAirport(lat: number | null, lon: number | null): AirportRecord | null {
  if (lat == null || lon == null) return null;
  let nearest: AirportRecord | null = null;
  let minDist = Infinity;
  for (const airport of UNIQUE_AIRPORTS) {
    const dist = haversineKm(lat, lon, airport.lat, airport.lon);
    if (dist < minDist) {
      minDist = dist;
      nearest = airport;
    }
  }
  return nearest;
}

export function getAirportBusyness(code: string): AirportBusyness | null {
  const airport = AIRPORT_MAP.get(code);
  if (!airport) return null;
  const enplanements = airport.enplanements;

  const sharePct = (enplanements / US_TOTAL_ENPLANEMENTS) * 100;

  // FAA hub classification (for label/category)
  let hubCategory: AirportBusyness["hubCategory"];
  let hubLabel: string;

  if (sharePct >= 1.0) {
    hubCategory = "large"; hubLabel = "Major Hub";
  } else if (sharePct >= 0.25) {
    hubCategory = "medium"; hubLabel = "Medium Hub";
  } else if (sharePct >= 0.05) {
    hubCategory = "small"; hubLabel = "Small Hub";
  } else {
    hubCategory = "regional"; hubLabel = "Regional";
  }

  // Percentile among our tracked airports (busier than X% of airports in the set)
  const allValues = UNIQUE_AIRPORTS.map(a => a.enplanements).sort((a, b) => a - b);
  const rank = allValues.filter(v => v < enplanements).length;
  const nationalPercentile = Math.round((rank / allValues.length) * 100);

  // busyScale: each pip = 20-percentile band (1 = bottom 20%, 5 = top 20%)
  const busyScale = nationalPercentile < 20 ? 1
    : nationalPercentile < 40 ? 2
    : nationalPercentile < 60 ? 3
    : nationalPercentile < 80 ? 4
    : 5;

  return { code, annualEnplanements: enplanements * 1000, busyScale, hubCategory, hubLabel, nationalPercentile, hubAirlines: airport.hubAirlines ?? [] };
}

/** @deprecated use findNearestAirport instead */
export const STATE_PRIMARY_AIRPORTS: Record<string, AirportInfo> = {};
