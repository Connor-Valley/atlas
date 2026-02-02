import { Router, Request, Response } from "express";
import { getStates, getCitiesForState } from "./states.service.js";

const router: Router = Router();

router.get("/", (_req: Request, res: Response) => {
    try {
        const states = getStates();
        res.json(states);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch states" });
    }
});

router.get("/:state/cities", async (req, res) => {
   try {
       const { state } = req.params;
       const cities = await getCitiesForState(state);
       res.json(cities);
   }  catch (error) {
       res.status(400).json({ error: (error as Error).message });
   }
});

export default router;
