import { Router } from "express";
import { getCityLocation, getMajorCitiesInState } from "./city-location.service.js";

const router: Router = Router();

// Must come before the generic "/:state/:city" route below, or "major-cities" would be
// swallowed as a (nonexistent) city slug.
router.get("/:state/major-cities/:excludeSlug", async (req, res) => {
  const { state, excludeSlug } = req.params;
  const limit = Math.min(parseInt(String(req.query.limit ?? "8"), 10) || 8, 30);
  const cities = await getMajorCitiesInState(state, excludeSlug, limit);
  res.json(cities);
});

router.get("/:state/:city", async (req, res) => {
  const { state, city } = req.params;
  const location = await getCityLocation(state, city);
  res.json(location);
});

export default router;
