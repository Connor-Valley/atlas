import { Router } from "express";
import { sendContactMessage } from "./contact.service.js";
import { ContactRateLimitError, ContactValidationError } from "./contact.types.js";

const router: Router = Router();

router.post("/", async (req, res) => {
  try {
    const ip = req.ip ?? "unknown";
    await sendContactMessage(req.body ?? {}, ip);
    res.json({ sent: true });
  } catch (error) {
    if (error instanceof ContactValidationError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof ContactRateLimitError) {
      res.status(429).json({ error: error.message });
    } else {
      console.error("[contact] failed to send message:", error);
      res.status(500).json({ error: "Something went wrong sending your message. Please try again later." });
    }
  }
});

export default router;
