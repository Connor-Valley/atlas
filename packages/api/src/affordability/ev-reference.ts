// State-level EV and electricity reference data
// Used to contextualize fuel costs for electric vehicles alongside gas.

export const EV_REFERENCE_AS_OF = "2024";
export const ELECTRICITY_SOURCE = "EIA Annual Average Retail Electricity Prices, 2024";
export const EV_CHARGERS_SOURCE = "DOE Alternative Fuels Data Center (AFDC), 2024";
export const EV_ADOPTION_SOURCE = "DOE / IEA EV Stock Share of Registered Vehicles, 2023";

// 2024 US average retail electricity price — used for illustrative example display.
export const NATIONAL_ELECTRICITY_CENTS_PER_KWH = 14.9;

// National averages used as baseline comparisons in the UI.
export const NATIONAL_EV_CHARGERS_PER_100K = 70;
export const NATIONAL_EV_ADOPTION_PCT = 1.8;

// Electricity price premium above (+) or below (-) the national average, as a decimal fraction.
// Source: EIA Annual Average Retail Electricity Prices by State, 2024 (~14.9¢/kWh national avg).
export const STATE_ELECTRICITY_PREMIUMS: Record<string, number> = {
  AL: -0.094, // ~13.5¢/kWh
  AK:  0.544, // ~23.0¢/kWh — remote grid, high generation costs
  AZ: -0.060, // ~14.0¢/kWh
  AR: -0.329, // ~10.0¢/kWh — among lowest in US
  CA:  0.678, // ~25.0¢/kWh — high demand + grid infrastructure costs
  CO: -0.060, // ~14.0¢/kWh
  CT:  0.611, // ~24.0¢/kWh — densely regulated NE grid
  DE:  0.007, // ~15.0¢/kWh
  DC:  0.040, // ~15.5¢/kWh
  FL: -0.060, // ~14.0¢/kWh
  GA: -0.128, // ~13.0¢/kWh
  HI:  1.819, // ~42.0¢/kWh — highest in US, isolated island grid
  ID: -0.329, // ~10.0¢/kWh — hydro-dominated grid
  IL: -0.034, // ~14.5¢/kWh
  IN: -0.128, // ~13.0¢/kWh
  IA: -0.195, // ~12.0¢/kWh
  KS: -0.161, // ~12.5¢/kWh
  KY: -0.228, // ~11.5¢/kWh
  LA: -0.262, // ~11.0¢/kWh — cheap natural gas generation
  ME:  0.342, // ~20.0¢/kWh
  MD:  0.040, // ~15.5¢/kWh
  MA:  0.544, // ~23.0¢/kWh — high-cost NE grid
  MI:  0.141, // ~17.0¢/kWh
  MN:  0.007, // ~15.0¢/kWh
  MS: -0.195, // ~12.0¢/kWh
  MO: -0.195, // ~12.0¢/kWh
  MT: -0.228, // ~11.5¢/kWh — hydro power
  NE: -0.195, // ~12.0¢/kWh
  NV: -0.034, // ~14.5¢/kWh
  NH:  0.309, // ~19.5¢/kWh
  NJ:  0.141, // ~17.0¢/kWh
  NM: -0.094, // ~13.5¢/kWh
  NY:  0.477, // ~22.0¢/kWh — high transmission + distribution costs
  NC: -0.094, // ~13.5¢/kWh
  ND: -0.228, // ~11.5¢/kWh
  OH: -0.060, // ~14.0¢/kWh
  OK: -0.262, // ~11.0¢/kWh
  OR: -0.161, // ~12.5¢/kWh — hydro-dominated but some markup
  PA:  0.074, // ~16.0¢/kWh
  RI:  0.510, // ~22.5¢/kWh
  SC: -0.094, // ~13.5¢/kWh
  SD: -0.195, // ~12.0¢/kWh
  TN: -0.195, // ~12.0¢/kWh — TVA power
  TX: -0.128, // ~13.0¢/kWh — competitive deregulated market
  UT: -0.262, // ~11.0¢/kWh
  VT:  0.242, // ~18.5¢/kWh
  VA: -0.060, // ~14.0¢/kWh
  WA: -0.262, // ~11.0¢/kWh — hydro power (Columbia River)
  WV: -0.161, // ~12.5¢/kWh — coal generation
  WI:  0.074, // ~16.0¢/kWh
  WY: -0.262, // ~11.0¢/kWh
};

// Public EV charging stations per 100,000 residents.
// Source: DOE Alternative Fuels Data Center, 2024.
export const STATE_EV_CHARGERS_PER_100K: Record<string, number> = {
  AL:  25,
  AK:  45,
  AZ:  95,
  AR:  22,
  CA: 185,
  CO: 125,
  CT:  90,
  DE:  75,
  DC: 130,
  FL:  65,
  GA:  55,
  HI:  85,
  ID:  70,
  IL:  55,
  IN:  40,
  IA:  40,
  KS:  40,
  KY:  30,
  LA:  25,
  ME:  75,
  MD:  70,
  MA: 105,
  MI:  55,
  MN:  60,
  MS:  18,
  MO:  40,
  MT:  65,
  NE:  45,
  NV:  95,
  NH:  85,
  NJ:  65,
  NM:  65,
  NY:  70,
  NC:  60,
  ND:  25,
  OH:  50,
  OK:  35,
  OR: 120,
  PA:  60,
  RI:  75,
  SC:  50,
  SD:  30,
  TN:  45,
  TX:  50,
  UT: 105,
  VT: 210,
  VA:  70,
  WA: 140,
  WV:  30,
  WI:  55,
  WY:  55,
};

// EVs as a percentage of total registered vehicles.
// Source: DOE / IEA EV stock data, 2023.
export const STATE_EV_ADOPTION_PCT: Record<string, number> = {
  AL: 0.5,
  AK: 0.9,
  AZ: 2.8,
  AR: 0.4,
  CA: 6.8,
  CO: 4.1,
  CT: 2.4,
  DE: 1.8,
  DC: 3.5,
  FL: 2.2,
  GA: 1.8,
  HI: 3.2,
  ID: 1.2,
  IL: 1.5,
  IN: 0.7,
  IA: 0.6,
  KS: 0.6,
  KY: 0.5,
  LA: 0.5,
  ME: 1.4,
  MD: 2.5,
  MA: 3.1,
  MI: 1.2,
  MN: 1.4,
  MS: 0.3,
  MO: 0.7,
  MT: 1.0,
  NE: 0.6,
  NV: 3.5,
  NH: 1.8,
  NJ: 3.2,
  NM: 1.5,
  NY: 2.4,
  NC: 1.6,
  ND: 0.3,
  OH: 1.0,
  OK: 0.6,
  OR: 5.2,
  PA: 1.6,
  RI: 2.1,
  SC: 1.1,
  SD: 0.4,
  TN: 0.9,
  TX: 1.6,
  UT: 2.8,
  VT: 4.5,
  VA: 2.2,
  WA: 5.1,
  WV: 0.5,
  WI: 1.0,
  WY: 0.7,
};
