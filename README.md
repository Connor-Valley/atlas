<div align="center">

# Atlas

**Compare cities. Make informed decisions.**

Atlas aggregates public data to help you understand housing costs, income levels, and affordability across every U.S. city — all in one place.

</div>

---

## What is Atlas?

Moving to a new city is one of the biggest financial decisions you can make. Atlas cuts through the noise by pulling together housing prices, income data, rent burden statistics, and affordability metrics so you can compare cities with confidence.

Search any U.S. city and get an instant dashboard of what actually matters:

- Is rent eating more than 30% of what people earn there?
- Are home prices appreciating or declining?
- How does income inequality compare to the national average?
- What do people in different industries and education levels actually earn?

---

## Features

**City Dashboard**
- At-a-glance scoring across Income, Housing, Affordability, and People categories
- Hero card with a real city photo pulled from Wikipedia
- Smooth animated transitions between overview and detail views

**Housing Details**
- Median rent and estimated monthly mortgage side by side
- Housing structure breakdown (single family, apartments, mobile homes)
- FHFA House Price Index trends — year-over-year, quarter-over-quarter, and 5-year change
- Rent burden percentage with affordability classification

**Income Details**
- Median household, per capita, renter, and owner incomes
- Earnings by educational attainment
- Income distribution donut chart across six brackets
- Industry breakdown by share of employed residents
- Gini coefficient and poverty depth analysis
- Affordability gap — how far local income falls above or below the rent threshold

**Affordability**
- Rent-to-income ratio with three-tier classification (Affordable / Rent Burdened / Severely Rent Burdened)
- Price-to-income ratio and years to save a down payment

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
- [US Census Bureau ACS](https://www.census.gov/data/developers/data-sets/acs-5year.html) — income, housing, population, poverty (2024)
- [FHFA House Price Index](https://www.fhfa.gov/data/hpi) — quarterly home price trends by MSA
- [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) + [Wikimedia Commons](https://commons.wikimedia.org) — city photography

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
│           ├── cities/     # City demographics
│           ├── housing/    # Rent, HPI, mortgage calculations
│           ├── income/     # Income, education, industry data
│           ├── affordability/
│           └── states/
│
└── supabase/
    └── migrations/         # Database schema
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/cities/:state/:city` | City demographics snapshot |
| GET | `/housing/:state/:city` | Basic housing data |
| GET | `/housing/:state/:city/details` | Full housing details + HPI |
| GET | `/income/:state/:city` | Basic income data |
| GET | `/income/:state/:city/details` | Full income breakdown |
| GET | `/affordability/:state/:city` | Affordability classification |
| GET | `/states` | All supported states |
| GET | `/health` | Server health check |

State is the two-letter code (e.g. `mi`), city is the slug (e.g. `grand-rapids`).

---

## License

MIT
