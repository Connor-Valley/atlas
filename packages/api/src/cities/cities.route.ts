import { Router } from "express";
import { getCity } from "./cities.service.js";
import { CURRENT_ACS_YEAR } from "../constants.js";

const router: Router = Router();

router.get('/:state/:city', async (req, res) => {
    const { state, city } = req.params;
    const year = CURRENT_ACS_YEAR;

    try {
        const snapshot = await getCity(state, city, year);
        res.json(snapshot);
    } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : "Failed to fetch city";
        const status = message === "City not found" ? 404 : 500;
        res.status(status).json({ error: message });
    }
});

export default router;
