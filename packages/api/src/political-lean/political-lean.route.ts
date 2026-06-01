import { Router } from "express";
import { getCity } from "../cities/cities.service.js";
import { getCityPoliticalLean } from "./political-lean.service.js";
import { CURRENT_ACS_YEAR } from "../constants.js";

const router: Router = Router();

router.get("/:state/:city", async (req, res) => {
  try {
    const { state, city } = req.params;
    const resolvedCity = await getCity(state, city, CURRENT_ACS_YEAR);
    const lean = getCityPoliticalLean(resolvedCity);
    if (!lean) {
      res.status(404).json({ error: "Political lean data not available for this county" });
      return;
    }
    res.json(lean);
  } catch (err) {
    console.error(err);
    res.status(400).json({
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
