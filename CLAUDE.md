# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Pending Frontend Work

The following backend endpoints were built during the `api-expansion` branch but have **no frontend implementation yet**. Each needs a panel/section wired into the city expanded view or dashboard.

| Endpoint | Data to show | Notes |
|---|---|---|
| `GET /climate/:state/:city` | Seasonal temps, sunny days, precipitation, snowfall, hot/freezing days, hazard risk scores | `hazardRisks` is nested; show top risks with rating labels |
| `GET /air-quality/:state/:city` | Median AQI, good/unhealthy day %, AQI category | Null for counties without EPA monitoring stations |
| `GET /lifestyle/:state/:city` | Restaurants/bars/arts per 10k residents | County-level CBP data |
| `GET /education/:state/:city` | HS+, bachelor's+, graduate+ attainment % | ACS B15003, population 25+ |
| `GET /political-lean/:state/:city` | Lean label, D%/R%, margin | 2020 county presidential results |
| `GET /cost-of-living/:state/:city` | RPP index, vs-national %, category label | BEA data; MSA-level or state fallback |

**Also wired into existing endpoints (need UI updates):**
- `/housing/:state/:city/details` → now includes `rentGrowthPct5yr` (5yr rent growth %)
- `/income/:state/:city/details` → now includes `employmentGrowthPct5yr` (5yr employment growth %) and `industryDiversityIndex`
- `/city-profile/:state/:city` → now includes `densityPerSquareMile` and `urbanCharacter` classification

**Atlas Algorithm scoring logic** is also still unbuilt — it depends on all of the above data being wired into the frontend first.

---

## Commands

```bash
# Full dev environment (Caddy + API + web)
pnpm dev

# Web only (Vite at localhost:5173)
pnpm dev:web

# API only (tsx watch at localhost:3000)
pnpm --filter @atlas/api dev

# Type-check + build web
pnpm --filter @atlas/web build
```

No test suite exists yet. Type-check with `vue-tsc` (run via build).

Local dev URLs:
- Frontend: http://localhost:5173 (direct Vite) or https://atlas.local (via Caddy)
- API: http://localhost:3000
- Caddy proxies: `atlas.local/api/*` → API, everything else → frontend

## Architecture

### Monorepo layout

```
packages/web/   Vue 3 + TypeScript frontend (Vite)
packages/api/   Express + TypeScript backend (tsx)
supabase/       Postgres migrations only — Supabase hosts the DB
```

### Frontend (`packages/web/src/`)

**Single-page app.** All city data views live inside `Home.vue` — it handles both the landing hero state and the post-search dashboard. Deep-link routes (`/city/:state/:city/*`) mount `Home.vue` with props to pre-trigger a section expansion.

Route → View mapping:
| Path | View |
|---|---|
| `/` | `Home.vue` (landing + dashboard) |
| `/city/:state/:city` | `Home.vue` with city pre-loaded |
| `/housing/:state/:city` | `Housing.vue` (detail page) |
| `/compare/:stateA/:cityA/:stateB?/:cityB?` | `Compare.vue` |
| `/favorites`, `/saved-comparisons` | `Favorites.vue`, `SavedComparisons.vue` |
| `/profile`, `/friends` | `Profile.vue`, `Friends.vue` |
| `/user/:username` | `UserProfile.vue` |

**API client** (`src/api/*.ts`): thin typed wrappers around `fetch`. Each function reads `import.meta.env.VITE_API_BASE` for the base URL. No global HTTP client — every function does its own fetch.

**Composables** (`src/composables/`):
- `useAuth` — module-level singleton (state lives outside the function). Initializes Supabase session on import, exposes `user`, `profile`, `displayName()`, auth actions.
- `useTheme` — persists dark/light to `localStorage` under `atlas-theme`. Toggles `html.dark` class.
- `useFavorites`, `useComparisons`, `useFriends` — Supabase table wrappers, require auth.

**Lib** (`src/lib/`):
- `supabase.ts` — single Supabase client instance
- `cityPhotos.ts` — thin wrapper that calls `GET /city-photo/:state/:city` on the API; all Wikipedia/Wikimedia logic lives server-side
- `compare.ts` — comparison scoring utilities
- `profilePrivacy.ts` — visibility level types/helpers

### CSS architecture

Global stylesheet entry: `src/styles.css` — imports all CSS in order:

```
variables.css       → all CSS custom properties (dark/light tokens)
reset.css           → base + body background
layout.css          → .container, headings
forms.css           → inputs, selects, submit button
landing.css         → hero landing, dashboard shell/panels, breadcrumb back button
header.css          → site header, auth modal, user menu
search.css          → .search-bar, city/state autocomplete
score-pills.css     → .score-pill, .score-pills__compare-btn
city-hero.css       → city photo hero card
cards.css           → .data-card, .metric (home dashboard cards)
section-cards.css   → .section, .stat (detail page expanded sections)
utilities.css       → helpers
compare.css         → compare page
theme.css           → theme toggle, dark-mode one-offs
responsive.css      → media queries
```

**Token system** (`variables.css`): All colors go through CSS custom properties. Dark mode is `html.dark` class on the `<html>` element (no `prefers-color-scheme` — user-controlled).

Light mode color hierarchy:
- `--bg-main` (`#ebdfcf`) — page background
- `--bg-card` (`#e1d4be`) — section/data cards
- `--bg-card-subtle` (`#e6d9cb`) — subtle variant
- `--bg-card-inner` (`#D2C4AE`) — metric/stat boxes inside cards
- `--accent` (`#C47A5A`) — terracotta, the primary brand color

Dark mode equivalents are all defined under `html.dark` in the same file.

When adding light-mode-specific overrides, use `html:not(.dark) .selector`. When adding dark-mode-specific overrides, use `html.dark .selector`.

### Backend (`packages/api/src/`)

Each domain follows the same three-file pattern:
```
<domain>.route.ts    → Express router, param validation
<domain>.service.ts  → business logic, Census/FHFA fetches
<domain>.types.ts    → TypeScript types for that domain
```

All data comes from the **US Census ACS 5-year API**. The `places/place-resolver.ts` module maps city slugs to Census FIPS codes and geography type (`place` vs `county-subdivision`). Every service calls `resolvePlace()` first, then `buildCensusGeoQuery()` from `common/census.ts` to construct the geo filter.

**FHFA House Price Index** data is loaded from a flat file into memory at startup via `initializeHpiCache()` in `housing.service.ts` — it does not hit an external API at request time.

### Auth & database

Supabase handles auth (email/password). Row-level security enforces data ownership. The anon key is safe in frontend code — RLS is the security layer. The service role key must never appear in frontend code.

## Environment variables

**Web** (`packages/web/.env`):
```
VITE_API_BASE=          # e.g. http://localhost:3000 or https://atlas.local/api
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SHARE_BASE=        # base URL for share links
VITE_TURNSTILE_SITE_KEY=
```

**API** (`.env` or `.env.development` at repo root):
```
CENSUS_API_KEY=               # optional — requests still work without it, but rate-limited
PORT=                         # defaults to 3000
SUPABASE_URL=                 # same value as VITE_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=    # service role key (never expose client-side)
UPSTASH_REDIS_REST_URL=       # Upstash Redis REST URL
UPSTASH_REDIS_REST_TOKEN=     # Upstash Redis REST token
```

If `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are absent the API still works — auth and user data features degrade but core data endpoints are unaffected.

API response caching uses **Upstash Redis** (15-day TTL). If `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are absent, caching degrades to in-process memory only (lost on restart).
