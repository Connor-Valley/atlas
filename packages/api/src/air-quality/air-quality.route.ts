import { Router } from "express";
import { getCity } from "../cities/cities.service.js";
import { getCityAirQuality } from "./air-quality.service.js";
import { CURRENT_ACS_YEAR } from "../constants.js";

const router: Router = Router();

// GET /air-quality/:state/:city
router.get("/:state/:city", async (req, res) => {
  try {
    const { state, city } = req.params;
    const resolvedCity = await getCity(state, city, CURRENT_ACS_YEAR);
    const airQuality = getCityAirQuality(resolvedCity);
    res.json(airQuality);
  } catch (err) {
    console.error(err);
    res.status(400).json({
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
