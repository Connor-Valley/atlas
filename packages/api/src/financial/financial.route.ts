import { Router } from "express";
import { getCity } from "../cities/cities.service.js";
import { CURRENT_ACS_YEAR } from "../constants.js";
import { getFinancialDetails, getFinancialSummary } from "./financial.service.js";

const router: Router = Router();

router.get("/:state/:city", async (req, res) => {
  try {
    const { state, city } = req.params;
    const resolvedCity = await getCity(state, city, CURRENT_ACS_YEAR);
    const financial = await getFinancialSummary(resolvedCity, CURRENT_ACS_YEAR);
    res.json(financial);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

router.get("/:state/:city/details", async (req, res) => {
  try {
    const { state, city } = req.params;
    const resolvedCity = await getCity(state, city, CURRENT_ACS_YEAR);
    const financial = await getFinancialDetails(resolvedCity, CURRENT_ACS_YEAR);
    res.json(financial);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

export default router;
