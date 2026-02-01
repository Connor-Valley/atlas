import { Router } from "express";
import { getCity } from "../cities/cities.service.js";
import { getCityHousing } from "./housing.service.js";

const router: Router = Router();

router.get("/:state/:city", async (req, res) => {
  try {
    const { state, city } = req.params;

    const year = 2024;

    const cityData = await getCity(state, city, 2023);
    const housing = await getCityHousing(cityData, year);

    res.json({
      city: {
        name: cityData.name,
        state: cityData.state,
      },
      housing,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
