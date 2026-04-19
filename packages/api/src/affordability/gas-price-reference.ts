// State gas price premiums relative to the national average (regular unleaded)
// Source: EIA Annual Average Regular Grade Gasoline Prices, 2024
// Values are decimal fractions: 0.25 = 25% above national avg, -0.12 = 12% below
// National average in 2024: ~$3.31/gallon
// Premiums are historically stable — driven by state taxes, reformulated fuel
// requirements, and regional distribution costs rather than short-term market swings.

export const GAS_PRICE_REFERENCE_AS_OF = "2024";
export const GAS_PRICE_SOURCE = "EIA Annual Average Regular Grade Gasoline Prices";

// 2023 ACS 5-year national median household income — used to normalize
// city income against a national baseline for the adjusted fuel burden metric.
export const NATIONAL_MEDIAN_HOUSEHOLD_INCOME = 77_000;

// % premium above (+) or below (-) the national average, as a decimal fraction.
export const STATE_GAS_PREMIUMS: Record<string, number> = {
  AL: -0.134, // ~$2.87/gal
  AK:  0.154, // ~$3.82/gal — remote supply chains
  AZ:  0.030, // ~$3.41/gal
  AR: -0.134, // ~$2.87/gal
  CA:  0.410, // ~$4.67/gal — highest taxes + CARB reformulated fuel
  CO: -0.030, // ~$3.21/gal
  CT:  0.069, // ~$3.54/gal
  DE: -0.046, // ~$3.16/gal
  DC:  0.039, // ~$3.44/gal
  FL: -0.015, // ~$3.26/gal
  GA: -0.115, // ~$2.93/gal
  HI:  0.426, // ~$4.72/gal — highest in US, remote island supply
  ID:  0.048, // ~$3.47/gal
  IL:  0.112, // ~$3.68/gal — high state gas taxes
  IN: -0.039, // ~$3.18/gal
  IA: -0.082, // ~$3.04/gal
  KS: -0.097, // ~$3.00/gal
  KY: -0.115, // ~$2.93/gal
  LA: -0.121, // ~$2.91/gal
  ME:  0.030, // ~$3.41/gal
  MD: -0.009, // ~$3.28/gal
  MA:  0.021, // ~$3.38/gal
  MI: -0.012, // ~$3.27/gal
  MN: -0.030, // ~$3.21/gal
  MS: -0.154, // ~$2.80/gal — among lowest in US
  MO: -0.109, // ~$2.95/gal
  MT: -0.021, // ~$3.24/gal
  NE: -0.097, // ~$3.00/gal
  NV:  0.124, // ~$3.72/gal — high taxes + Nevada blends
  NH: -0.012, // ~$3.27/gal
  NJ: -0.051, // ~$3.14/gal
  NM: -0.082, // ~$3.04/gal
  NY:  0.033, // ~$3.42/gal
  NC: -0.082, // ~$3.04/gal
  ND: -0.082, // ~$3.04/gal
  OH: -0.012, // ~$3.27/gal
  OK: -0.134, // ~$2.87/gal
  OR:  0.139, // ~$3.77/gal — CARB-like standards + high taxes
  PA:  0.054, // ~$3.49/gal — high state gas tax
  RI:  0.021, // ~$3.38/gal
  SC: -0.115, // ~$2.93/gal
  SD: -0.082, // ~$3.04/gal
  TN: -0.134, // ~$2.87/gal
  TX: -0.121, // ~$2.91/gal
  UT:  0.021, // ~$3.38/gal
  VT:  0.030, // ~$3.41/gal
  VA: -0.067, // ~$3.09/gal
  WA:  0.196, // ~$3.96/gal — high taxes + CARB blends
  WV: -0.082, // ~$3.04/gal
  WI: -0.039, // ~$3.18/gal
  WY: -0.082, // ~$3.04/gal
};
