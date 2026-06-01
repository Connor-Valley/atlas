import { Router } from "express";
import { getCity } from "../cities/cities.service.js";
import { getCityColIndex } from "./cost-of-living.service.js";
import { CURRENT_ACS_YEAR } from "../constants.js";

const router: Router = Router();

router.get("/:state/:city", async (req, res) => {
  try {
    const { state, city } = req.params;
    const resolvedCity = await getCity(state, city, CURRENT_ACS_YEAR);
    const col = getCityColIndex(resolvedCity);
    if (!col) {
      res.status(404).json({ error: "Cost of living data not available for this area" });
      return;
    }
    res.json(col);
  } catch (err) {
    console.error(err);
    res.status(400).json({
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
