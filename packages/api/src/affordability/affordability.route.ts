import { Router } from "express";
import { getCity } from "../cities/cities.service.js";
import { getCityAffordability, getDetailedCityAffordability } from "./affordability.service.js";
import { CURRENT_ACS_YEAR } from "../constants.js";

const router: Router = Router();

router.get("/:state/:city", async (req, res, next) => {
  try {
    const { state, city } = req.params;
    const year = Number(req.query.year) || CURRENT_ACS_YEAR;

    const cityData = await getCity(state, city, year);
    const affordability = await getCityAffordability(cityData, year);

    res.json(affordability);
  } catch (err) {
    next(err);
  }
});

router.get("/:state/:city/details", async (req, res, next) => {
  try {
    const { state, city } = req.params;
    const year = Number(req.query.year) || CURRENT_ACS_YEAR;

    const cityData = await getCity(state, city, year);
    const affordability = await getDetailedCityAffordability(cityData, year);

    res.json(affordability);
  } catch (err) {
    next(err);
  }
});

export default router;
