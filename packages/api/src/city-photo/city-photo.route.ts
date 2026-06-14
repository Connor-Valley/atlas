import { Router } from "express";
import { getCityPhoto } from "./city-photo.service.js";

const router: Router = Router();

router.get("/:state/:city", async (req, res) => {
  const { state, city } = req.params;
  const url = await getCityPhoto(state, city);
  res.json({ url });
});

export default router;
