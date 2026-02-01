import { Router } from "express";
import { getCity } from "../cities/cities.service.js";
import { getCityIncome } from "./income.service.js";

const router: Router = Router();

// GET /income/:state/:city
router.get("/:state/:city", async (req, res) => {
  try {
    const { state, city } = req.params;

    const year = 2024;

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

export default router;
