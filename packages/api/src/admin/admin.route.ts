import { Router } from "express";
import { clearCache } from "../common/cache.js";

const router: Router = Router();

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
