import type { UserPreferences } from '../composables/usePreferences';
import { DEFAULT_PREFERENCES, deriveWeightsFromQuiz } from '../composables/usePreferences';

export type DimensionScores = {
  affordability:     number | null;
  jobMarket:         number | null;
  climate:           number | null;
  opportunity:       number | null;
  lifestyleVibrancy: number | null;
  airQuality:        number | null;
  safety:            number | null;
  connectivity:      number | null;
};

export type ScoreInputs = {
  income:        any;
  affordability: any;
  costOfLiving:  any;
  profile:       any;
  qol:           any;
  climate:       any;
  airQuality:    any;
  lifestyle:     any;
  politicalLean: any;
  housing:       any;
};

export type CityCharacteristics = {
  affordability:     string | null;
  jobMarket:         string | null;
  climate:           string | null;
  opportunity:       string | null;
  lifestyleVibrancy: string | null;
  airQuality:        string | null;
  connectivity:      string | null;
  politicalLean:     string | null;
};

export type AtlasScoreResult = {
  score: number;
  breakdown: DimensionScores;
  cityChars: CityCharacteristics;
  politicalScore: number | null;
  isPersonalized: boolean;
};

// ── Normalization (used for non-personalized raw scoring) ─────────────────────

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function score(value: number | null | undefined, min: number, max: number, direction: 'higher' | 'lower'): number | null {
  if (value == null) return null;
  const n = normalize(value, min, max);
  return direction === 'lower' ? 100 - n : n;
}

function wavg(pairs: Array<{ s: number | null; w: number }>): number | null {
  const valid = pairs.filter(({ s }) => s != null);
  if (!valid.length) return null;
  const totalW = valid.reduce((a, { w }) => a + w, 0);
  return valid.reduce((a, { s, w }) => a + s! * w, 0) / totalW;
}

function avg(...values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v != null);
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// Regional labor-market size (total employed residents within 25mi, see
// income.jobsWithin25Miles / regional-jobs.service.ts on the API) — the primary Job Market
// signal now, replacing median household income, which describes who lives somewhere, not
// what job market is actually reachable from there (see cityJobMarketChar below). Log-scaled
// since raw job counts span orders of magnitude (rural counties in the hundreds, major metros
// in the millions).
function regionalJobsScore(income: any): number | null {
  const jobs = income?.jobsWithin25Miles;
  if (jobs == null || jobs <= 0) return null;
  return score(Math.log10(jobs), 3, 6.7, 'higher'); // 1,000 to ~5,000,000 jobs
}

// ── Raw dimension scorers (non-personalized mode only) ────────────────────────

function rawAffordabilityScore(affordability: any, costOfLiving: any, housing: any): number | null {
  const rentToIncomeS = score(affordability?.rentToIncomeRatio, 0.15, 0.6, 'lower');
  const rppS          = score(costOfLiving?.rppIndex, 80, 130, 'lower');
  const rentGrowthS   = score(housing?.rentGrowthPct5yr, -5, 30, 'lower');
  return avg(rentToIncomeS, rppS, rentGrowthS);
}

function rawJobMarketScore(income: any, qol: any): number | null {
  const regionalS  = regionalJobsScore(income);
  const unempS     = score(qol?.unemploymentRate?.value, 0.02, 0.12, 'lower');
  const growthS    = score(income?.employmentGrowthPct5yr, -5, 15, 'higher');
  const sectors    = income?.industryBreakdown as Array<{ share: number }> | undefined;
  const diversity  = sectors?.length
    ? Math.max(0, 1 - sectors.reduce((sum, s) => sum + s.share * s.share, 0))
    : null;
  const diversityS = score(diversity, 0, 1, 'higher');
  return wavg([
    { s: regionalS,  w: 0.35 },
    { s: unempS,     w: 0.35 },
    { s: growthS,    w: 0.20 },
    { s: diversityS, w: 0.10 },
  ]);
}

function rawClimateScore(climate: any): number | null {
  if (!climate) return null;
  const hazardS    = score(climate.hazardRisks?.compositeScore, 0, 100, 'lower');
  const sunnyS     = score(climate.sunnyDaysPerYear, 100, 300, 'higher');
  const deviationS = score(climate.avgTempF != null ? Math.abs(climate.avgTempF - 65) : null, 0, 40, 'lower');
  return wavg([{ s: avg(sunnyS, deviationS), w: 0.85 }, { s: hazardS, w: 0.15 }]);
}

// Deliberately does NOT use educational attainment — a well-educated bedroom suburb with no
// local employer base isn't a stronger "opportunity" city just because residents commute
// elsewhere or work remotely. Poverty rate and labor force participation are legitimate,
// degree-independent signals of economic opportunity.
function rawOpportunityScore(income: any, qol: any): number | null {
  const povertyS = score(income?.povertyRate, 3, 30, 'lower');
  const laborS   = score(qol?.laborForceParticipationRate?.value, 0.55, 0.75, 'higher');
  return avg(povertyS, laborS);
}

function rawLifestyleScore(lifestyle: any, profile: any): number | null {
  const restaurantS = score(lifestyle?.restaurants?.perTenThousandResidents, 5, 80, 'higher');
  const barsS       = score(lifestyle?.bars?.perTenThousandResidents, 2, 40, 'higher');
  const artsS       = score(lifestyle?.artsAndCulture?.perTenThousandResidents, 1, 20, 'higher');
  const commuteS    = score(profile?.meanCommuteMinutes, 10, 55, 'lower');
  const remoteS     = score(profile?.remoteWorkShare, 0.05, 0.40, 'higher');
  return avg(restaurantS, barsS, artsS, commuteS, remoteS);
}

function rawAirQualityScore(airQuality: any): number | null {
  const aqiS      = score(airQuality?.medianAqi, 20, 120, 'lower');
  const goodDaysS = score(airQuality?.goodDaysPercent, 30, 90, 'higher');
  return avg(aqiS, goodDaysS);
}

function rawConnectivityScore(profile: any, qol: any): number | null {
  const airportPercentile = qol?.airportBusyness?.value?.nationalPercentile ?? null;
  const airportDistanceS  = score(qol?.airportDistanceMiles?.value, 0, 100, 'lower');
  const transitS          = score(profile?.transitShare, 0.02, 0.40, 'higher');
  return avg(airportPercentile, airportDistanceS, transitS);
}

// ── Political match score ─────────────────────────────────────────────────────

function politicalMatchScore(politicalLean: any, preference: number): number | null {
  const cityMargin = politicalLean?.marginPct;
  if (cityMargin == null) return null;
  if (preference === 0) return Math.max(0, 100 - Math.abs(cityMargin) / 2);
  // signedMargin > 0 means the city leans toward what the user wants; < 0 means it leans away.
  const signedMargin = preference > 0 ? cityMargin : -cityMargin;
  if (signedMargin >= 0) return Math.min(100, 50 + signedMargin / 2);
  // Steeper falloff once opposed — a city crossing into "Strong [opposite party]" territory
  // (the same 20-point margin the app's own lean labels use for "Strong") should read as a
  // clear mismatch rather than blending gently toward 50.
  return Math.max(0, 50 + signedMargin / 1.3);
}

// Categorical tier for the political lean cube's color, driven by the same Swing/Lean/
// [Party]/Strong breakpoints political-lean.service.ts already uses to label a city — so a
// city already labeled "Strong Republican" always reads as a clear mismatch (red) against a
// "progressive" preference, not just a middling one, regardless of exactly how far past the
// Strong threshold its margin sits.
export function politicalDimTier(
  politicalLean: any,
  preference: 'progressive' | 'conservative' | 'open' | 'not_a_factor',
): 'good' | 'average' | 'below' | 'poor' | null {
  const cityMargin = politicalLean?.marginPct;
  if (cityMargin == null || preference === 'not_a_factor') return null;
  if (preference === 'open') {
    const distanceFromSwing = Math.abs(cityMargin);
    if (distanceFromSwing < 10) return 'good';
    if (distanceFromSwing < 25) return 'average';
    return 'below';
  }
  const signedMargin = preference === 'progressive' ? cityMargin : -cityMargin;
  if (signedMargin >= 10) return 'good';
  if (signedMargin >= -5) return 'average';
  if (signedMargin >= -20) return 'below';
  return 'poor';
}

// ── Personalized match score lookup table ─────────────────────────────────────
//
// For each dimension → preference → city characteristic: how well does this city match?
// Exact match = 100, similar = 75, partial = ~55, mismatch = ~25–35.

const MATCH_SCORES: Record<string, Record<string, Record<string, number>>> = {
  affordability: {
    budget: {
      'Affordable': 100,
      'Moderate':    70,
      'Pricey':      35,
      'Expensive':   15,
    },
    value: {
      'Affordable': 90,
      'Moderate':    100,
      'Pricey':      60,
      'Expensive':   30,
    },
    flexible: {
      'Affordable': 100,
      'Moderate':    100,
      'Pricey':      100,
      'Expensive':   100,
    },
  },

  // Job Market: how big a labor market is actually reachable from here (income.jobsWithin25Miles
  // — total employed residents within a 25mi radius, see cityJobMarketChar below), NOT resident
  // income or specific industries. A town's own median household income says nothing about its
  // job market if residents commute out for work — Oxford Charter Township, MI has a $114k
  // median income but no meaningful local employer base of its own.
  jobMarket: {
    high_earning: {
      'Major metro job market':    100,
      'Large regional job market':  85,
      'Solid regional job market':  65,
      'Small regional job market':  45,
      'Limited regional job market':25,
    },
    stable: {
      'Major metro job market':     90,
      'Large regional job market':  85,
      'Solid regional job market':  75,
      'Small regional job market':  55,
      'Limited regional job market':35,
    },
    growth: {
      'Major metro job market':    100,
      'Large regional job market':  90,
      'Solid regional job market':  65,
      'Small regional job market':  45,
      'Limited regional job market':25,
    },
    remote: {
      'Major metro job market':     70,
      'Large regional job market':  70,
      'Solid regional job market':  65,
      'Small regional job market':  60,
      'Limited regional job market':55,
    },
    any: {
      'Major metro job market':    100,
      'Large regional job market': 100,
      'Solid regional job market': 100,
      'Small regional job market': 100,
      'Limited regional job market':100,
    },
  },

  // Opportunity is scored separately by opportunityMatchScore() below, not via this generic
  // lookup table — it's a bonus-only match against the user's own field (opportunity_preference)
  // vs. the city's actual dominant industry (cityOpportunityChar / INDUSTRY_LABELS), where a
  // mismatch never scores below a neutral baseline. See OPPORTUNITY_FIELD_MATCHES.

  climate: {
    warm: {
      'Warm & sunny':    100,
      'Hot & dry':       70,
      'Mild year-round': 65,
      'Four seasons':    45,
      'Cool & crisp':    25,
    },
    hot_dry: {
      'Hot & dry':       100,
      'Warm & sunny':    65,
      'Mild year-round': 45,
      'Four seasons':    30,
      'Cool & crisp':    15,
    },
    cool: {
      'Cool & crisp':    100,
      'Four seasons':    70,
      'Mild year-round': 55,
      'Warm & sunny':    30,
      'Hot & dry':       15,
    },
    mild: {
      'Mild year-round': 100,
      'Warm & sunny':    50,
      'Cool & crisp':    65,
      'Four seasons':    60,
      'Hot & dry':       20,
    },
    four_seasons: {
      'Four seasons':    100,
      'Mild year-round': 65,
      'Cool & crisp':    65,
      'Warm & sunny':    55,
      'Hot & dry':       35,
    },
    any: {
      'Warm & sunny':    100,
      'Hot & dry':       100,
      'Cool & crisp':    100,
      'Mild year-round': 100,
      'Four seasons':    100,
    },
  },

  lifestyle: {
    urban: {
      'City energy':      100,
      'Urban edge':       65,
      'Quiet & suburban': 25,
    },
    urban_edge: {
      'Urban edge':       100,
      'City energy':      55,
      'Quiet & suburban': 45,
    },
    suburban: {
      'Quiet & suburban': 100,
      'Urban edge':       65,
      'City energy':      35,
    },
    nature: {
      'Quiet & suburban': 80,
      'Urban edge':       55,
      'City energy':      30,
    },
  },

  airQuality: {
    high: {
      'Very clean air':       100,
      'Generally clean':      70,
      'Moderate air quality': 35,
      'Often unhealthy':      10,
    },
    medium: {
      'Very clean air':       100,
      'Generally clean':      90,
      'Moderate air quality': 65,
      'Often unhealthy':      35,
    },
    low: {
      'Very clean air':       100,
      'Generally clean':      100,
      'Moderate air quality': 100,
      'Often unhealthy':      100,
    },
  },

  connectivity: {
    walkable: {
      'Dense & walkable':      100,
      'Balanced & accessible': 65,
      'Suburban & drivable':   25,
    },
    balanced: {
      'Balanced & accessible': 100,
      'Dense & walkable':      55,
      'Suburban & drivable':   50,
    },
    car: {
      'Suburban & drivable':   100,
      'Balanced & accessible': 75,
      'Dense & walkable':      50,
    },
    airport: {
      'Balanced & accessible': 90,
      'Dense & walkable':      75,
      'Suburban & drivable':   55,
    },
  },
};

function lookupMatchScore(
  dim: keyof typeof MATCH_SCORES,
  pref: string,
  cityChar: string | null,
): number | null {
  if (!cityChar) return null;
  return MATCH_SCORES[dim]?.[pref]?.[cityChar] ?? null;
}

// ── City characteristic classifiers ───────────────────────────────────────────

function cityAffordabilityChar(costOfLiving: any, affordability: any): string | null {
  const rpp = costOfLiving?.rppIndex;
  if (rpp != null) {
    if (rpp < 95)  return 'Affordable';
    if (rpp < 108) return 'Moderate';
    if (rpp < 125) return 'Pricey';
    return 'Expensive';
  }
  const rti = affordability?.rentToIncomeRatio;
  if (rti == null) return null;
  if (rti < 0.25) return 'Affordable';
  if (rti < 0.35) return 'Moderate';
  return 'Expensive';
}

function cityClimateChar(climate: any): string | null {
  if (!climate) return null;
  const avgT = climate.avgTempF;
  const hotD = climate.hotDaysPerYear;
  const frzD = climate.freezingDaysPerYear;
  if (avgT == null) return null;
  if (Math.abs(avgT - 65) < 10 && (hotD ?? 100) < 20 && (frzD ?? 100) < 20) return 'Mild year-round';
  if (avgT < 52) return 'Cool & crisp';
  if (avgT > 72 && (hotD ?? 0) > 60 && (frzD ?? 100) < 15) return 'Hot & dry';
  if (avgT > 65 && (frzD ?? 100) < 25) return 'Warm & sunny';
  if ((hotD ?? 0) > 20 && (frzD ?? 0) > 30) return 'Four seasons';
  return 'Mild year-round';
}

// Maps the Census C24030 industry-of-employment sectors (income.industryBreakdown, workers'
// actual jobs, not their degrees) to a friendlier public label. Deliberately does NOT use
// educational attainment — a well-educated bedroom suburb with no local employer base isn't a
// "knowledge economy," it just has residents who commute elsewhere or work remotely.
const INDUSTRY_LABELS: Record<string, string> = {
  'Agriculture, Forestry & Mining':      'Agriculture & Natural Resources',
  'Construction':                        'Construction & Trades',
  'Manufacturing':                       'Manufacturing',
  'Wholesale Trade':                     'Wholesale & Distribution',
  'Retail Trade':                        'Retail',
  'Transportation & Utilities':          'Transportation & Logistics',
  // "Information" (NAICS 51 — publishing, telecom, data processing) is narrower than
  // colloquial "tech": most software/R&D/engineering employment (Palo Alto, the Bay Area,
  // etc.) is coded under "Professional, Scientific & Technical Services" instead, which is
  // why that's the one labeled "Tech" below, not this one.
  'Information':                                  'Media & Telecom',
  'Finance, Insurance & Real Estate':             'Finance & Real Estate',
  'Professional, Scientific & Technical Services': 'Tech & Professional Services',
  'Corporate Management':                          'Corporate Headquarters',
  'Administrative & Waste Services':               'Administrative & Support Services',
  'Education, Health & Social Services': 'Education & Healthcare',
  'Arts, Entertainment & Food Services': 'Hospitality & Entertainment',
  'Other Services':                      'Local Services',
  'Public Administration':               'Government & Public Sector',
};

// Driven by regional job availability (income.jobsWithin25Miles — total employed residents
// within a 25mi radius, see regional-jobs.service.ts on the API), NOT median household income.
// A town's own resident income says nothing about its job market if none of those residents
// actually work there — Oxford Charter Township, MI has a $114k median household income and
// a "Manufacturing" local industry, but nobody commuting from Oxford into Detroit for a
// six-figure job makes Oxford itself a "High-earning market." What income data CAN tell you
// (how big a labor market is actually reachable from here) is what drives this label instead.
function cityJobMarketChar(income: any): string | null {
  const jobs = income?.jobsWithin25Miles;
  if (jobs == null) return null;
  if (jobs >= 3_000_000) return 'Major metro job market';
  if (jobs >= 800_000)   return 'Large regional job market';
  if (jobs >= 200_000)   return 'Solid regional job market';
  if (jobs >= 50_000)    return 'Small regional job market';
  return 'Limited regional job market';
}

function cityOpportunityChar(income: any): string | null {
  const sectors = income?.industryBreakdown as Array<{ name: string; share: number }> | undefined;
  if (!sectors?.length) return null; // no job-industry data available for this area
  const top = [...sectors].sort((a, b) => b.share - a.share)[0];
  if (!top || top.share < 0.20) return 'Diverse economy'; // no single sector dominates
  return INDUSTRY_LABELS[top.name] ?? top.name;
}

// Maps each "what industry are you in?" quiz answer to the INDUSTRY_LABELS value(s) that count
// as a match. Deliberately does NOT cover every possible city industry per preference — anything
// not listed here just doesn't get the match bonus, it isn't penalized (see opportunityMatchScore).
const OPPORTUNITY_FIELD_MATCHES: Record<string, string[]> = {
  tech_media_pro:           ['Tech & Professional Services', 'Media & Telecom'],
  corporate_finance:        ['Corporate Headquarters', 'Finance & Real Estate'],
  manufacturing:            ['Manufacturing'],
  construction_trades:      ['Construction & Trades'],
  transportation_logistics: ['Transportation & Logistics', 'Wholesale & Distribution'],
  education_healthcare:     ['Education & Healthcare'],
  // Merged from separate "Government" and "Administrative & Local Services" options — they
  // were confusingly hard to tell apart (both sound bureaucratic/office-y) even though they're
  // different NAICS sectors under the hood; combining them into one recognizable option freed
  // a slot for a dedicated Nonprofit option below.
  government_services:      ['Government & Public Sector', 'Administrative & Support Services', 'Local Services'],
  retail:                   ['Retail'],
  hospitality_arts:         ['Hospitality & Entertainment'],
  agriculture:              ['Agriculture & Natural Resources'],
  // Census's ACS industry table has no dedicated nonprofit code — religious orgs, foundations,
  // and advocacy/civic groups (NAICS 813) are bundled into the same flat "Other services" leaf
  // as repair shops and personal-care businesses, with no further breakdown available. This is
  // the closest real bucket to "nonprofit," so it's what's used, but it's shared with those other
  // businesses too — not a distinct signal the way most other options are.
  nonprofit:                ['Local Services'],
};

// Whether jobs are actually available somewhere is Job Market's job (regional job availability);
// this dimension is about whether the city's own local economy actually includes your field, and
// how prominently. Ranks 1–3 are a real, credible match (green). Ranks 4–6 still count for
// something but visibly less (amber). Rank 7 or lower means the field barely registers here at
// all, and that's shown as a genuine miss (red) — not just "no bonus" the way earlier versions of
// this dimension treated it. The rank and city's-#1-for-context are always surfaced regardless of
// color, so the number backing the tier is never hidden.
const OPPORTUNITY_NEUTRAL = 70; // only used when the field can't be located in the data at all (a data gap, not a real "barely exists" signal)

function opportunityScoreForRank(rank: number, share: number): number {
  if (rank === 1) return 100;
  if (rank === 2) return share >= 0.15 ? 90 : 82;
  if (rank === 3) return share >= 0.12 ? 78 : 72;
  if (rank <= 6) return Math.max(55, 65 - (rank - 4) * 5); // 4→65, 5→60, 6→55
  return Math.max(20, 50 - (rank - 7) * 6); // 7→50, 8→44, 9→38, ...
}

function opportunityTierForRank(rank: number): 'good' | 'average' | 'poor' {
  if (rank <= 3) return 'good';
  if (rank <= 6) return 'average';
  return 'poor';
}

export type OpportunityMatchDetail = {
  score: number;
  tier: 'good' | 'average' | 'poor';
  // The industry that actually earned the score, plus its rank among this city's sectors — null
  // for both when the field couldn't be located in the data at all. The tile's headline value
  // should show matchedLabel instead of the city's raw #1 industry whenever this is set, since a
  // match via a lower rank would otherwise look inexplicable next to an unrelated headline.
  matchedLabel: string | null;
  matchedRank: number | null;
  matchedSharePct: number | null;
  // The city's own #1 industry — populated whenever it differs from matchedLabel. Null exactly
  // when the match itself is the city's #1 (matchedRank === 1), since showing it there would
  // just repeat the headline verbatim.
  cityTopLabel: string | null;
  cityTopSharePct: number | null;
};

const NO_OPPORTUNITY_MATCH = {
  matchedLabel: null, matchedRank: null, matchedSharePct: null, cityTopLabel: null, cityTopSharePct: null,
} as const;

// Looks past just the single dominant sector — finds wherever the user's field actually ranks
// among this city's sectors, however far down that is, rather than giving up after the top 3.
export function evaluateOpportunityMatch(preference: string, income: any): OpportunityMatchDetail | null {
  const sectors = income?.industryBreakdown as Array<{ name: string; share: number }> | undefined;
  if (!sectors?.length) return null;
  if (preference === 'any') return { score: 100, tier: 'good', ...NO_OPPORTUNITY_MATCH };

  const matches = OPPORTUNITY_FIELD_MATCHES[preference];
  if (!matches) return { score: 100, tier: 'good', ...NO_OPPORTUNITY_MATCH }; // unrecognized value — don't penalize

  const label = (sectorName: string) => INDUSTRY_LABELS[sectorName] ?? sectorName;
  const isMatch = (sectorName: string) => matches.includes(label(sectorName));
  const ranked = [...sectors].sort((a, b) => b.share - a.share);
  const top = ranked[0];
  const cityTopLabel = top ? label(top.name) : null;
  const cityTopSharePct = top ? Math.round(top.share * 100) : null;

  const idx = ranked.findIndex((s) => isMatch(s.name));
  if (idx === -1) {
    return { score: OPPORTUNITY_NEUTRAL, tier: 'average', ...NO_OPPORTUNITY_MATCH, cityTopLabel, cityTopSharePct };
  }

  const rank = idx + 1;
  const matchedSector = ranked[idx]!;
  // rank 1 means the match IS the city's #1 sector — cityTopLabel would just repeat the headline
  // (which already carries a "#1" badge), so null it out there and let the template fall back to
  // "You: <preference>" instead of printing the same industry name twice.
  const isCityTop = rank === 1;
  return {
    score: opportunityScoreForRank(rank, matchedSector.share),
    tier: opportunityTierForRank(rank),
    matchedLabel: label(matchedSector.name),
    matchedRank: rank,
    matchedSharePct: Math.round(matchedSector.share * 100),
    cityTopLabel: isCityTop ? null : cityTopLabel,
    cityTopSharePct: isCityTop ? null : cityTopSharePct,
  };
}

function opportunityMatchScore(preference: string, income: any): number | null {
  return evaluateOpportunityMatch(preference, income)?.score ?? null;
}

function cityLifestyleChar(lifestyle: any, profile: any): string | null {
  const restaurants = lifestyle?.restaurants?.perTenThousandResidents;
  if (restaurants == null) return null;
  const transit = profile?.transitShare ?? 0;
  const commute = profile?.meanCommuteMinutes ?? 35;
  // restaurants/bars/arts density is CBP data reported at the county level, so a small city
  // sharing a county with a dense urban core (e.g. San Leandro in Alameda County, next to
  // Oakland/SF) inherits that county's high density without being a real urban center itself.
  // Require an actual city-level urban signal — not just density-per-sq-mile, which favors
  // compact suburbs over sprawling major metros — before crediting county-level density.
  // 150,000 was originally too low a bar for this: it's meant to catch genuinely major sprawling
  // metros like Tampa (384k), Phoenix (1.6M), Houston (2.3M), but an ordinary six-figure suburb
  // (Hayward, CA — 158,801 people, density only 3,466/sq mi, Census-classified as "City" not
  // "Urban Core") cleared it too and got mislabeled the same way San Leandro originally did.
  // Raised well below Tampa's population so it still catches genuine major metros without
  // sweeping in mid-size suburbs that just happen to cross six figures.
  const population = profile?.population ?? 0;
  const isMajorCity = population > 300_000 || profile?.urbanCharacter === 'Urban Core';
  // Dense walkable cores (NYC, SF, Chicago) — high transit + high restaurant density
  if (restaurants > 35 && transit > 0.12) return 'City energy';
  // Large car-dependent metros (Tampa, Phoenix, Houston) — high restaurant density, but only
  // when the city itself (not just its county) is genuinely a major city
  if (restaurants > 18 && isMajorCity) return 'City energy';
  if (restaurants > 12 || transit > 0.06 || commute < 32) return 'Urban edge';
  return 'Quiet & suburban';
}

function cityAirQualityChar(airQuality: any): string | null {
  const goodDays = airQuality?.goodDaysPercent;
  if (goodDays == null) return null;
  if (goodDays > 72) return 'Very clean air';
  if (goodDays > 50) return 'Generally clean';
  if (goodDays > 30) return 'Moderate air quality';
  return 'Often unhealthy';
}

function cityConnectivityChar(profile: any, qol: any): string | null {
  const transit    = profile?.transitShare ?? 0;
  const airportDist = qol?.airportDistanceMiles?.value;
  if (transit == null && airportDist == null) return null;
  if (transit > 0.12) return 'Dense & walkable';
  if (transit > 0.05 || (airportDist != null && airportDist < 25)) return 'Balanced & accessible';
  return 'Suburban & drivable';
}

function cityPoliticalChar(politicalLean: any): string | null {
  return (politicalLean?.lean as string | undefined) ?? null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function computeAtlasScore(inputs: ScoreInputs, prefs?: UserPreferences | null): AtlasScoreResult {
  const raw = prefs ?? DEFAULT_PREFERENCES;
  const p   = deriveWeightsFromQuiz(raw);
  const isPersonalized = !!prefs;

  // City characteristics are always computed — used for display and (when personalized) for scoring.
  const cityChars: CityCharacteristics = {
    affordability:     cityAffordabilityChar(inputs.costOfLiving, inputs.affordability),
    jobMarket:         cityJobMarketChar(inputs.income),
    climate:           cityClimateChar(inputs.climate),
    opportunity:       cityOpportunityChar(inputs.income),
    lifestyleVibrancy: cityLifestyleChar(inputs.lifestyle, inputs.profile),
    airQuality:        cityAirQualityChar(inputs.airQuality),
    connectivity:      cityConnectivityChar(inputs.profile, inputs.qol),
    politicalLean:     cityPoliticalChar(inputs.politicalLean),
  };

  let breakdown: DimensionScores;

  if (isPersonalized) {
    // Personalized: score = how well this city's characteristics match your preferences.
    // Exact match = 100, similar = ~75, partial = ~55, mismatch = ~25–35.
    breakdown = {
      affordability:     lookupMatchScore('affordability', p.affordability_preference, cityChars.affordability),
      jobMarket:         lookupMatchScore('jobMarket',     p.job_market_preference,    cityChars.jobMarket),
      climate:           lookupMatchScore('climate',       p.climate_preference,       cityChars.climate),
      opportunity:       opportunityMatchScore(p.opportunity_preference, inputs.income),
      lifestyleVibrancy: lookupMatchScore('lifestyle',     p.lifestyle_preference,     cityChars.lifestyleVibrancy),
      airQuality:        lookupMatchScore('airQuality',    p.air_quality_priority,     cityChars.airQuality),
      safety:            null,
      connectivity:      lookupMatchScore('connectivity',  p.connectivity_preference,  cityChars.connectivity),
    };
  } else {
    // Not personalized: score = raw city quality on a national scale.
    breakdown = {
      affordability:     rawAffordabilityScore(inputs.affordability, inputs.costOfLiving, inputs.housing),
      jobMarket:         rawJobMarketScore(inputs.income, inputs.qol),
      climate:           rawClimateScore(inputs.climate),
      opportunity:       rawOpportunityScore(inputs.income, inputs.qol),
      lifestyleVibrancy: rawLifestyleScore(inputs.lifestyle, inputs.profile),
      airQuality:        rawAirQualityScore(inputs.airQuality),
      safety:            null,
      connectivity:      rawConnectivityScore(inputs.profile, inputs.qol),
    };
  }

  const politicalScore = p.political_preference_enabled
    ? politicalMatchScore(inputs.politicalLean, p.political_preference)
    : null;

  const weighted: Array<{ score: number | null; weight: number }> = [
    { score: breakdown.affordability,     weight: p.weight_affordability },
    { score: breakdown.jobMarket,         weight: p.weight_job_market },
    { score: breakdown.climate,           weight: p.weight_climate },
    { score: breakdown.opportunity,       weight: p.weight_opportunity },
    { score: breakdown.lifestyleVibrancy, weight: p.weight_lifestyle_vibrancy },
    { score: breakdown.airQuality,        weight: p.weight_air_quality },
    { score: breakdown.safety,            weight: p.weight_safety },
    { score: breakdown.connectivity,      weight: p.weight_connectivity },
  ];

  if (politicalScore != null) {
    // County-level data (the common case) is weighted lower than every other dimension
    // (lowest otherwise is air quality at 10) since it's standing in for the city, not
    // measuring it. Where a real place-level override exists (see PLACE_OVERRIDE_SOURCES
    // in political-lean.service.ts) it's weighted the same as the top-tier dimensions.
    const isPlaceLevel = inputs.politicalLean?.source?.geographyLevel === 'place';
    weighted.push({ score: politicalScore, weight: isPlaceLevel ? 20 : 8 });
  }

  let total = 0;
  let totalWeight = 0;
  for (const { score: s, weight } of weighted) {
    if (s != null && weight > 0) {
      total += s * weight;
      totalWeight += weight;
    }
  }

  const finalScore = totalWeight > 0 ? Math.round(total / totalWeight) : 50;
  return { score: finalScore, breakdown, cityChars, politicalScore, isPersonalized };
}

export function scoreTier(score: number): { label: string; tier: 'excellent' | 'good' | 'average' | 'below' | 'poor' } {
  if (score >= 80) return { label: 'Excellent',     tier: 'excellent' };
  if (score >= 65) return { label: 'Good',          tier: 'good' };
  if (score >= 45) return { label: 'Average',       tier: 'average' };
  if (score >= 30) return { label: 'Below Average', tier: 'below' };
  return               { label: 'Poor',           tier: 'poor' };
}
