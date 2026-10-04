// Maps the 11 opportunity_preference industry categories (see OPPORTUNITY_FIELD_MATCHES in
// packages/web/src/lib/atlasScore.ts, the source of truth for what each bucket means) to
// representative BLS SOC major occupation groups. Every code below was verified live against
// the BLS OEWS API (correct area/occupation name echoed back in the response) before being
// added — SOC major group codes are stable, unchanging federal codes, but typo'd digits still
// silently query a real, wrong occupation instead of erroring, so each one was checked.
//
// A bucket with multiple groups (e.g. education_healthcare) is queried as all of them and
// combined as an employment-weighted average — see combineGroups() in income-by-industry.service.ts.
export const INDUSTRY_SOC_GROUPS: Record<string, { code: string; label: string }[]> = {
  tech_media_pro: [
    { code: "150000", label: "Computer and Mathematical" },
    { code: "270000", label: "Arts, Design, Entertainment, Sports, and Media" },
  ],
  corporate_finance: [
    { code: "130000", label: "Business and Financial Operations" },
    { code: "110000", label: "Management" },
  ],
  manufacturing: [
    { code: "510000", label: "Production" },
  ],
  construction_trades: [
    { code: "470000", label: "Construction and Extraction" },
    { code: "490000", label: "Installation, Maintenance, and Repair" },
  ],
  transportation_logistics: [
    { code: "530000", label: "Transportation and Material Moving" },
  ],
  education_healthcare: [
    { code: "250000", label: "Educational Instruction and Library" },
    { code: "290000", label: "Healthcare Practitioners and Technical" },
  ],
  government_services: [
    { code: "430000", label: "Office and Administrative Support" },
    { code: "330000", label: "Protective Service" },
  ],
  retail: [
    { code: "410000", label: "Sales and Related" },
  ],
  hospitality_arts: [
    { code: "350000", label: "Food Preparation and Serving Related" },
    { code: "390000", label: "Personal Care and Service" },
  ],
  agriculture: [
    { code: "450000", label: "Farming, Fishing, and Forestry" },
  ],
  // Census's ACS has no dedicated nonprofit code (see the comment on OPPORTUNITY_FIELD_MATCHES
  // in atlasScore.ts); Community and Social Service is the closest SOC proxy for nonprofit/civic work.
  nonprofit: [
    { code: "210000", label: "Community and Social Service" },
  ],
};

export const INDUSTRY_LABELS: Record<string, string> = {
  tech_media_pro: "Tech & Professional Services",
  corporate_finance: "Corporate & Finance",
  manufacturing: "Manufacturing",
  construction_trades: "Construction & Trades",
  transportation_logistics: "Transportation & Logistics",
  education_healthcare: "Education & Healthcare",
  government_services: "Government & Public Services",
  retail: "Retail",
  hospitality_arts: "Hospitality & Entertainment",
  agriculture: "Agriculture & Natural Resources",
  nonprofit: "Nonprofit & Community Organizations",
};
