import type { Request } from "express";
import { CURRENT_ACS_YEAR } from "../constants.js";
import { getCity } from "../cities/cities.service.js";
import { getCityIncome } from "../income/income.service.js";
import { getCityHousing } from "../housing/housing.service.js";
import { getCityAffordability } from "../affordability/affordability.service.js";

type Winner = "a" | "b" | "tie";

type ShareCity = {
  name: string;
  state: string;
  population: number;
  medianIncome: number;
  medianRent: number;
  rentToIncomeRatio: number;
};

export type ShareComparison = {
  cityA: ShareCity;
  cityB: ShareCity;
  title: string;
  description: string;
  comparePath: string;
  sharePath: string;
  imagePath: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatPopulation(value: number) {
  return value.toLocaleString();
}

function cityLabel(city: ShareCity) {
  return `${city.name}, ${city.state}`;
}

function compare(a: number, b: number, direction: "higher" | "lower", tolerance = 0): Winner {
  if (Math.abs(a - b) <= tolerance) return "tie";
  if (direction === "higher") return a > b ? "a" : "b";
  return a < b ? "a" : "b";
}

function winnerLabel(winner: Winner, cityA: ShareCity, cityB: ShareCity) {
  if (winner === "a") return cityA.name;
  if (winner === "b") return cityB.name;
  return "Both cities";
}

function buildDescription(cityA: ShareCity, cityB: ShareCity) {
  const incomeWinner = compare(cityA.medianIncome, cityB.medianIncome, "higher", 1500);
  const rentWinner = compare(cityA.medianRent, cityB.medianRent, "lower", 50);
  const burdenWinner = compare(cityA.rentToIncomeRatio, cityB.rentToIncomeRatio, "lower", 0.01);

  const incomeLeader = winnerLabel(incomeWinner, cityA, cityB);
  const rentLeader = winnerLabel(rentWinner, cityA, cityB);
  const burdenLeader = winnerLabel(burdenWinner, cityA, cityB);

  const incomePart =
    incomeWinner === "tie"
      ? `median household income is nearly tied at ${formatCurrency((cityA.medianIncome + cityB.medianIncome) / 2)}`
      : `${incomeLeader} leads on income`;

  const rentPart =
    rentWinner === "tie"
      ? `median rent is almost identical`
      : `${rentLeader} has lower rent`;

  const burdenPart =
    burdenWinner === "tie"
      ? `rent burden is nearly even`
      : `${burdenLeader} is more renter-friendly`;

  return `${incomePart}, ${rentPart}, and ${burdenPart}. Compare rent, income, affordability, and population on Atlas.`;
}

export async function getShareComparison(
  stateA: string,
  cityA: string,
  stateB: string,
  cityB: string,
): Promise<ShareComparison> {
  const [resolvedA, resolvedB] = await Promise.all([
    getCity(stateA, cityA, CURRENT_ACS_YEAR),
    getCity(stateB, cityB, CURRENT_ACS_YEAR),
  ]);

  const [incomeA, incomeB, housingA, housingB, affordabilityA, affordabilityB] = await Promise.all([
    getCityIncome(resolvedA, CURRENT_ACS_YEAR),
    getCityIncome(resolvedB, CURRENT_ACS_YEAR),
    getCityHousing(resolvedA, CURRENT_ACS_YEAR),
    getCityHousing(resolvedB, CURRENT_ACS_YEAR),
    getCityAffordability(resolvedA, CURRENT_ACS_YEAR),
    getCityAffordability(resolvedB, CURRENT_ACS_YEAR),
  ]);

  const shareCityA: ShareCity = {
    name: resolvedA.name,
    state: resolvedA.state,
    population: resolvedA.population,
    medianIncome: incomeA.medianHouseholdIncome,
    medianRent: housingA.medianRent,
    rentToIncomeRatio: affordabilityA.rentToIncomeRatio * 100,
  };

  const shareCityB: ShareCity = {
    name: resolvedB.name,
    state: resolvedB.state,
    population: resolvedB.population,
    medianIncome: incomeB.medianHouseholdIncome,
    medianRent: housingB.medianRent,
    rentToIncomeRatio: affordabilityB.rentToIncomeRatio * 100,
  };

  const comparePath = `/compare/${stateA}/${cityA}/${stateB}/${cityB}`;
  const sharePath = `/share/compare/${stateA}/${cityA}/${stateB}/${cityB}`;
  const imagePath = `${sharePath}/image.svg`;

  return {
    cityA: shareCityA,
    cityB: shareCityB,
    title: `${cityLabel(shareCityA)} vs ${cityLabel(shareCityB)} | Atlas`,
    description: buildDescription(shareCityA, shareCityB),
    comparePath,
    sharePath,
    imagePath,
  };
}

function absoluteUrl(req: Request, path: string) {
  return new URL(path, `${req.protocol}://${req.get("host")}`).toString();
}

export function renderShareHtml(req: Request, comparison: ShareComparison) {
  const title = escapeHtml(comparison.title);
  const description = escapeHtml(comparison.description);
  const shareUrl = escapeHtml(absoluteUrl(req, comparison.sharePath));
  const compareUrl = escapeHtml(absoluteUrl(req, comparison.comparePath));
  const imageUrl = escapeHtml(absoluteUrl(req, comparison.imagePath));
  const cityALabel = escapeHtml(cityLabel(comparison.cityA));
  const cityBLabel = escapeHtml(cityLabel(comparison.cityB));

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${shareUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Atlas" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${shareUrl}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:secure_url" content="${imageUrl}" />
    <meta property="og:image:type" content="image/svg+xml" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <style>
      :root { color-scheme: light dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: radial-gradient(circle at top, #dff7f4, #f8fafc 48%, #eef2ff);
        font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #0f172a;
      }
      main {
        width: min(680px, calc(100vw - 32px));
        border-radius: 24px;
        background: rgba(255,255,255,0.9);
        border: 1px solid rgba(15, 23, 42, 0.08);
        box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
        padding: 28px;
      }
      .eyebrow {
        display: inline-flex;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(20, 184, 166, 0.12);
        color: #0f766e;
        font-weight: 700;
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1 {
        margin: 16px 0 10px;
        font-size: clamp(28px, 5vw, 44px);
        line-height: 1.02;
        letter-spacing: -0.04em;
      }
      p {
        margin: 0;
        color: #475569;
        line-height: 1.55;
        font-size: 16px;
      }
      .cities {
        margin-top: 20px;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 12px;
        align-items: center;
      }
      .city {
        border-radius: 18px;
        padding: 16px;
        background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(241,245,249,0.9));
        border: 1px solid rgba(15,23,42,0.07);
      }
      .city b {
        display: block;
        font-size: 18px;
        line-height: 1.2;
      }
      .city span {
        display: block;
        margin-top: 6px;
        color: #64748b;
        font-size: 14px;
      }
      .vs {
        width: 48px;
        height: 48px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #14b8a6, #3b82f6);
        color: white;
        font-weight: 800;
      }
      a {
        display: inline-flex;
        margin-top: 22px;
        padding: 12px 16px;
        border-radius: 12px;
        background: linear-gradient(135deg, #14b8a6, #2563eb);
        color: white;
        text-decoration: none;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="eyebrow">Atlas Comparison</div>
      <h1>${cityALabel} vs ${cityBLabel}</h1>
      <p>${description}</p>
      <div class="cities">
        <div class="city">
          <b>${cityALabel}</b>
          <span>Population ${escapeHtml(formatPopulation(comparison.cityA.population))}</span>
        </div>
        <div class="vs">VS</div>
        <div class="city">
          <b>${cityBLabel}</b>
          <span>Population ${escapeHtml(formatPopulation(comparison.cityB.population))}</span>
        </div>
      </div>
      <a href="${compareUrl}">Open comparison</a>
    </main>
    <script>
      window.location.replace(${JSON.stringify(absoluteUrl(req, comparison.comparePath))});
    </script>
  </body>
</html>`;
}

export function renderShareImage(comparison: ShareComparison) {
  const incomeWinner = compare(comparison.cityA.medianIncome, comparison.cityB.medianIncome, "higher", 1500);
  const rentWinner = compare(comparison.cityA.medianRent, comparison.cityB.medianRent, "lower", 50);
  const burdenWinner = compare(comparison.cityA.rentToIncomeRatio, comparison.cityB.rentToIncomeRatio, "lower", 0.01);

  const accentFor = (winner: Winner, key: "a" | "b") => {
    if (winner === "tie") return "#64748b";
    return winner === key ? "#14b8a6" : "#3b82f6";
  };

  const title = escapeHtml(`${cityLabel(comparison.cityA)} vs ${cityLabel(comparison.cityB)}`);
  const subtitle = escapeHtml("Compare income, rent, affordability, and population on Atlas");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="120" y1="40" x2="1090" y2="620" gradientUnits="userSpaceOnUse">
      <stop stop-color="#E6FFFB"/>
      <stop offset="0.5" stop-color="#F8FAFC"/>
      <stop offset="1" stop-color="#DBEAFE"/>
    </linearGradient>
    <linearGradient id="pill" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#14B8A6"/>
      <stop offset="1" stop-color="#2563EB"/>
    </linearGradient>
    <filter id="shadow" x="120" y="70" width="960" height="520" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="22" stdDeviation="30" flood-color="#0F172A" flood-opacity="0.14"/>
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1020" cy="110" r="140" fill="#A7F3D0" fill-opacity="0.35"/>
  <circle cx="200" cy="560" r="170" fill="#BFDBFE" fill-opacity="0.55"/>

  <g filter="url(#shadow)">
    <rect x="120" y="72" width="960" height="486" rx="34" fill="#FFFFFF" fill-opacity="0.9"/>
    <rect x="120.5" y="72.5" width="959" height="485" rx="33.5" stroke="#E2E8F0"/>
  </g>

  <rect x="170" y="122" width="170" height="38" rx="19" fill="url(#pill)"/>
  <text x="255" y="146" text-anchor="middle" fill="#FFFFFF" font-size="16" font-family="Arial, Helvetica, sans-serif" font-weight="700" letter-spacing="1.6">ATLAS SHARE</text>

  <text x="170" y="220" fill="#0F172A" font-size="52" font-family="Arial, Helvetica, sans-serif" font-weight="800" letter-spacing="-1.8">${title}</text>
  <text x="170" y="260" fill="#475569" font-size="24" font-family="Arial, Helvetica, sans-serif">${subtitle}</text>

  <rect x="170" y="310" width="360" height="170" rx="24" fill="#F8FAFC"/>
  <rect x="560" y="310" width="360" height="170" rx="24" fill="#F8FAFC"/>
  <circle cx="600" cy="395" r="42" fill="url(#pill)"/>
  <text x="600" y="404" text-anchor="middle" fill="#FFFFFF" font-size="28" font-family="Arial, Helvetica, sans-serif" font-weight="800">VS</text>

  <text x="200" y="356" fill="#0F172A" font-size="30" font-family="Arial, Helvetica, sans-serif" font-weight="800">${escapeHtml(comparison.cityA.name)}</text>
  <text x="200" y="388" fill="#64748B" font-size="22" font-family="Arial, Helvetica, sans-serif">${escapeHtml(comparison.cityA.state)}</text>
  <text x="590" y="356" fill="#0F172A" font-size="30" font-family="Arial, Helvetica, sans-serif" font-weight="800">${escapeHtml(comparison.cityB.name)}</text>
  <text x="590" y="388" fill="#64748B" font-size="22" font-family="Arial, Helvetica, sans-serif">${escapeHtml(comparison.cityB.state)}</text>

  <text x="200" y="430" fill="#64748B" font-size="18" font-family="Arial, Helvetica, sans-serif">Median income</text>
  <text x="200" y="456" fill="${accentFor(incomeWinner, "a")}" font-size="28" font-family="Arial, Helvetica, sans-serif" font-weight="800">${escapeHtml(formatCurrency(comparison.cityA.medianIncome))}</text>
  <text x="590" y="430" fill="#64748B" font-size="18" font-family="Arial, Helvetica, sans-serif">Median income</text>
  <text x="590" y="456" fill="${accentFor(incomeWinner, "b")}" font-size="28" font-family="Arial, Helvetica, sans-serif" font-weight="800">${escapeHtml(formatCurrency(comparison.cityB.medianIncome))}</text>

  <text x="200" y="500" fill="#64748B" font-size="18" font-family="Arial, Helvetica, sans-serif">Median rent</text>
  <text x="200" y="526" fill="${accentFor(rentWinner, "a")}" font-size="28" font-family="Arial, Helvetica, sans-serif" font-weight="800">${escapeHtml(formatCurrency(comparison.cityA.medianRent))}</text>
  <text x="590" y="500" fill="#64748B" font-size="18" font-family="Arial, Helvetica, sans-serif">Median rent</text>
  <text x="590" y="526" fill="${accentFor(rentWinner, "b")}" font-size="28" font-family="Arial, Helvetica, sans-serif" font-weight="800">${escapeHtml(formatCurrency(comparison.cityB.medianRent))}</text>

  <text x="950" y="356" fill="#64748B" font-size="18" font-family="Arial, Helvetica, sans-serif">Rent / income</text>
  <text x="950" y="390" fill="${accentFor(burdenWinner, "a")}" font-size="44" font-family="Arial, Helvetica, sans-serif" font-weight="800" text-anchor="end">${escapeHtml(formatPercent(comparison.cityA.rentToIncomeRatio))}</text>
  <text x="950" y="430" fill="${accentFor(burdenWinner, "b")}" font-size="44" font-family="Arial, Helvetica, sans-serif" font-weight="800" text-anchor="end">${escapeHtml(formatPercent(comparison.cityB.rentToIncomeRatio))}</text>
  <text x="950" y="468" fill="#64748B" font-size="18" font-family="Arial, Helvetica, sans-serif" text-anchor="end">Population</text>
  <text x="950" y="502" fill="#0F172A" font-size="26" font-family="Arial, Helvetica, sans-serif" font-weight="700" text-anchor="end">${escapeHtml(formatPopulation(comparison.cityA.population))} / ${escapeHtml(formatPopulation(comparison.cityB.population))}</text>

  <text x="170" y="598" fill="#475569" font-size="20" font-family="Arial, Helvetica, sans-serif">Shared from Atlas</text>
</svg>`;
}
