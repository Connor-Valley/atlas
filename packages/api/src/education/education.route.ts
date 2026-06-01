import { Router } from "express";
import { getCity } from "../cities/cities.service.js";
import { getCityEducation } from "./education.service.js";
import { CURRENT_ACS_YEAR } from "../constants.js";

const router: Router = Router();

router.get("/:state/:city", async (req, res) => {
  try {
    const { state, city } = req.params;
    const resolvedCity = await getCity(state, city, CURRENT_ACS_YEAR);
    const education = await getCityEducation(resolvedCity, CURRENT_ACS_YEAR);
    res.json(education);
  } catch (err) {
    console.error(err);
    res.status(400).json({
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
