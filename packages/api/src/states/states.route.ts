import { Router, Request, Response } from "express";
import { getStates } from "./states.service.js";

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

export default router;
