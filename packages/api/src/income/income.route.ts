import { Router } from "express";
import { getCity } from "../cities/cities.service.js";
import { getCityIncome, getDetailedCityIncome } from "./income.service.js";
import { CURRENT_ACS_YEAR } from "../constants.js";

const router: Router = Router();

// GET /income/:state/:city
router.get("/:state/:city", async (req, res) => {
  try {
    const { state, city } = req.params;

    const year = CURRENT_ACS_YEAR;

    // 1. Resolve city + geography
    const resolvedCity = await getCity(state, city, year);

    // 2. Fetch income data
    const income = await getCityIncome(resolvedCity, year);

    res.json(income);
  } catch (err) {
    console.error(err);
    res.status(400).json({
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

// GET /income/:state/:city/details
router.get("/:state/:city/details", async (req, res) => {
  try {
    const { state, city } = req.params;
    const year = CURRENT_ACS_YEAR;
    const resolvedCity = await getCity(state, city, year);
    const details = await getDetailedCityIncome(resolvedCity, year);
    res.json(details);
  } catch (err) {
    console.error(err);
    res.status(400).json({
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
