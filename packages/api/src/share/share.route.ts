import { Router } from "express";
import { getShareComparison, renderShareHtml, renderShareImage } from "./share.service.js";

const router: Router = Router();

router.get("/compare/:stateA/:cityA/:stateB/:cityB", async (req, res) => {
  try {
    const { stateA, cityA, stateB, cityB } = req.params;
    const comparison = await getShareComparison(stateA, cityA, stateB, cityB);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(renderShareHtml(req, comparison));
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to generate share page";
    res.status(500).type("text/plain").send(message);
  }
});

router.get("/compare/:stateA/:cityA/:stateB/:cityB/image.svg", async (req, res) => {
  try {
    const { stateA, cityA, stateB, cityB } = req.params;
    const comparison = await getShareComparison(stateA, cityA, stateB, cityB);

    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(renderShareImage(comparison));
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to generate share image";
    res.status(500).type("text/plain").send(message);
  }
});

export default router;
