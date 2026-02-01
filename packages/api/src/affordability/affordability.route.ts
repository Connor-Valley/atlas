import { Router } from "express";
import { getCity } from "../cities/cities.service.js";
import { getCityAffordability } from "./affordability.service.js";

const router: Router = Router();

router.get("/:state/:city", async (req, res, next) => {
  try {
    const { state, city } = req.params;
    const year = Number(req.query.year) || 2022;

    const cityData = await getCity(state, city, year);
    const affordability = await getCityAffordability(cityData, year);

    res.json(affordability);
  } catch (err) {
    next(err);
  }
});

export default router;
