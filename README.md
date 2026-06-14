<div align="center">

# Atlas

**Compare cities. Make informed decisions.**

Atlas aggregates public data to help you understand housing costs, income levels, climate, cost of living, and more across every U.S. city — all in one place.

</div>

---

## What is Atlas?

Moving to a new city is one of the biggest financial decisions you can make. Atlas cuts through the noise by pulling together housing prices, income data, rent burden statistics, and affordability metrics so you can compare cities with confidence.

Search any U.S. city and get an instant dashboard of what actually matters:

- Is rent eating more than 30% of what people earn there?
- Are home prices appreciating or declining?
- How does the cost of living compare to the national average?
- What's the political lean of the county?
- How hot, rainy, or disaster-prone is the area?
- How does income inequality compare to the national average?
- What do people in different industries and education levels actually earn?

---

## Features

**City Dashboard**
- At-a-glance scoring across Income, Housing, Affordability, and People categories
- Hero card with a city photo sourced from Wikipedia/Wikimedia Commons (skyline, downtown, or regional vibe fallback)
- Smooth animated transitions between overview and detail views

**Housing Details**
- Median rent and estimated monthly mortgage side by side
- 5-year rent growth percentage (2019→2023)
- Housing structure breakdown (single family, apartments, mobile homes)
- FHFA House Price Index trends — year-over-year, quarter-over-quarter, and 5-year change
- Rent burden percentage with affordability classification

**Income Details**
- Median household, per capita, renter, and owner incomes
- 5-year employment growth percentage (2019→2023)
- Earnings by educational attainment
- Income distribution donut chart across six brackets
- Industry breakdown by share of employed residents + diversity index
- Gini coefficient and poverty depth analysis
- Affordability gap — how far local income falls above or below the rent threshold

**Affordability**
- Rent-to-income ratio with three-tier classification (Affordable / Rent Burdened / Severely Rent Burdened)
- Price-to-income ratio and years to save a down payment

**Climate**
- 10-year average temperatures, precipitation, snow, sunny days
- Hot days (≥95°F) and freezing days per year
- FEMA National Risk Index hazard scores for tornado, flood, wildfire, earthquake, and more

**Air Quality**
- EPA annual AQI summary — median, 90th percentile, and max AQI
- Good/moderate/unhealthy day percentages by county

**Lifestyle**
- Restaurant, bar, and arts & culture establishment density per 10k residents
- Sourced from Census County Business Patterns

**Education**
- HS or higher, some college or higher, bachelor's+, and graduate+ attainment rates
- Population 25+ base from ACS B15003

**Political Lean**
- 2020 presidential results by county — Democrat%, Republican%, margin
- Lean label: Strong Democrat → Swing → Strong Republican

**Cost of Living**
- BEA Regional Price Parities index (100 = national average)
- MSA-level when available, state-level fallback
- Category label from Much Below Average to Much Above Average

**Favorites**
- Star any city to save it to your personal list
- Favorites page with trading card-style city cards with holographic hover effects
- Requires a free account

**Auth**
- Email/password sign up and sign in via Supabase
- Persistent sessions, row-level security on all user data

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3, TypeScript, Vite |
| Routing | Vue Router 4 |
| Backend | Node.js, Express, TypeScript |
| Database / Auth | Supabase (PostgreSQL + RLS) |
| Icons | Material Design Icons |
| Package Manager | pnpm (monorepo) |
| Local Proxy | Caddy (`atlas.local`) |

**Data Sources**
- [US Census Bureau ACS](https://www.census.gov/data/developers/data-sets/acs-5year.html) — income, housing, population, poverty, education (2023)
- [US Census County Business Patterns](https://www.census.gov/programs-surveys/cbp.html) — restaurant, bar, arts establishment counts (2022)
- [FHFA House Price Index](https://www.fhfa.gov/data/hpi) — quarterly home price trends by MSA
- [BEA Regional Price Parities](https://apps.bea.gov/iTable/?reqid=70&step=1&acrdn=8) — composite cost of living index by MSA (2023)
- [Open-Meteo ERA5](https://open-meteo.com/en/docs/historical-weather-api) — 10-year historical weather averages
- [FEMA National Risk Index](https://hazards.fema.gov/nri/) — county-level natural hazard risk scores
- [EPA Air Quality System](https://aqs.epa.gov/aqsweb/airdata/download_files.html) — annual AQI summary by county (2023)
- [MIT Election Lab](https://doi.org/10.7910/DVN/VOQCHQ) — county-level 2020 presidential results
- [U.S. Department of Labor](https://www.dol.gov/agencies/whd/minimum-wage/state) — state minimum wage reference
- [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) + [Wikimedia Commons](https://commons.wikimedia.org) — city hero photography (server-side lookup, Redis-cached, with regional vibe fallbacks for small towns)

---

## Project Structure

```
atlas/
├── packages/
│   ├── web/                # Vue 3 frontend
│   │   └── src/
│   │       ├── components/ # Reusable UI components
│   │       ├── views/      # Page components (Home, Favorites)
│   │       ├── composables/# useAuth, useFavorites, useTheme
│   │       ├── api/        # Typed API client functions
│   │       └── lib/        # Supabase client
│   │
│   └── api/                # Express backend
│       └── src/
│           ├── cities/         # City demographics
│           ├── housing/        # Rent, HPI, mortgage calculations
│           ├── income/         # Income, industry data
│           ├── affordability/
│           ├── climate/        # Weather + FEMA hazard risks
│           ├── air-quality/    # EPA AQI data
│           ├── lifestyle/      # Restaurant/bar/arts density
│           ├── education/      # Attainment rates
│           ├── political-lean/ # 2020 county presidential results
│           ├── cost-of-living/ # BEA Regional Price Parities
│           ├── city-photo/     # City hero image lookup (Wikipedia + Wikimedia Commons, Redis-cached)
│           ├── admin/          # Cache management
│           └── states/
│
└── supabase/
    └── migrations/         # Database schema
```

---

## API Reference

All city endpoints use the same format: state is the two-letter code (e.g. `ca`), city is the slug (e.g. `san-francisco`).

**City & Demographics**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/cities/:state/:city` | City demographics snapshot |
| GET | `/city-profile/:state/:city` | City summary incl. density + urban character classification |
| GET | `/city-profile/:state/:city/details` | Detailed demographics and commute data |
| GET | `/states` | All supported states |

**Housing & Affordability**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/housing/:state/:city` | Median rent, home value, renter share |
| GET | `/housing/:state/:city/details` | Full housing details + HPI trends + 5yr rent growth |
| GET | `/affordability/:state/:city` | Rent-to-income and price-to-income ratios |

**Income & Employment**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/income/:state/:city` | Median household income + distribution |
| GET | `/income/:state/:city/details` | Full breakdown: industry, education earnings, poverty depth, 5yr employment growth, industry diversity index |
| GET | `/financial/:state/:city` | Tax, wage, and budget summary |
| GET | `/financial/:state/:city/details` | Detailed financial breakdown |

**New Data Endpoints (API expansion)**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/climate/:state/:city` | 10yr weather averages + FEMA natural hazard risk scores |
| GET | `/air-quality/:state/:city` | EPA annual AQI summary (median, p90, good/unhealthy day %) |
| GET | `/lifestyle/:state/:city` | Restaurant, bar, and arts density per 10k residents |
| GET | `/education/:state/:city` | Educational attainment rates (HS+, bachelor's+, graduate+) |
| GET | `/political-lean/:state/:city` | 2020 county presidential results + lean label |
| GET | `/cost-of-living/:state/:city` | BEA Regional Price Parities index vs. national average |

**City Photos**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/city-photo/:state/:city` | City hero image URL (Wikipedia/Commons lookup, Redis-cached, regional vibe fallback) |

**Quality of Life & Admin**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/quality-of-life/:state/:city` | Labor market and airport summary |
| GET | `/quality-of-life/:state/:city/details` | Detailed quality-of-life payload |
| DELETE | `/admin/cache/:prefix?` | Clear in-memory + Redis cache (all or by prefix) |
| GET | `/admin/cache/prefixes` | List available cache key prefixes |
| GET | `/health` | Server health check |

---

## License

MIT
