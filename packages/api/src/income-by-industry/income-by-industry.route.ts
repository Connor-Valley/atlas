import { Router } from "express";
import { getCity } from "../cities/cities.service.js";
import { getIndustrySalaryData, INDUSTRY_LABELS } from "./income-by-industry.service.js";
import { CURRENT_ACS_YEAR } from "../constants.js";

const router: Router = Router();

// GET /income-by-industry/:state/:city/:industry
router.get("/:state/:city/:industry", async (req, res) => {
  try {
    const { state, city, industry } = req.params;

    if (!INDUSTRY_LABELS[industry]) {
      res.status(400).json({ error: `Unknown industry "${industry}"` });
      return;
    }

    const resolvedCity = await getCity(state, city, CURRENT_ACS_YEAR);
    const data = await getIndustrySalaryData(resolvedCity, industry);

    if (!data) {
      res.status(404).json({ error: "Salary data not available for this area/industry" });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(400).json({
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
