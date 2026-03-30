import { Router } from "express";
import { getCity } from "./cities.service.js";

const router: Router = Router();

router.get('/:state/:city', async (req, res) => {
    const { state, city } = req.params;
    const year = 2024;

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
