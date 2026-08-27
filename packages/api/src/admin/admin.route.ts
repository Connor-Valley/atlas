import { Router } from "express";
import { clearCache } from "../common/cache.js";
import { getCallCount } from "../common/metrics.js";

const router: Router = Router();

// GET /admin/metrics/calls/:prefix — daily call count for an external API (e.g. "open-meteo", "fema-nri")
// optional ?date=YYYY-MM-DD, defaults to today (UTC)
router.get("/metrics/calls/:prefix", async (req, res) => {
  const { prefix } = req.params;
  const date = typeof req.query.date === "string" ? req.query.date : undefined;
  const count = await getCallCount(prefix, date);
  res.json({ prefix, date: date ?? new Date().toISOString().slice(0, 10), count });
});

// DELETE /admin/cache          — clear everything
// DELETE /admin/cache/:prefix  — clear by prefix (e.g. "climate", "city", "profile", "income")
router.delete("/cache/:prefix?", async (req, res) => {
  const prefix = req.params.prefix;
  const result = await clearCache(prefix);
  res.json({
    cleared: true,
    prefix: prefix ?? "(all)",
    ...result,
  });
});

// GET /admin/cache/prefixes — list available prefixes as a reminder
router.get("/cache/prefixes", (_req, res) => {
  res.json({
    prefixes: [
      "climate",
      "city",
      "profile",
      "profile-details",
      "income",
      "income-details",
      "housing",
      "housing-details",
      "affordability",
      "affordability-details",
      "financial",
      "quality-of-life",
    ],
    usage: "DELETE /admin/cache/:prefix  or  DELETE /admin/cache  (clears all)",
  });
});

export default router;
