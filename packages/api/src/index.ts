import path from "path";
import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";
import express from "express";
import cors from "cors";
import citiesRouter from "./cities/cities.route.js";
import housingRouter from "./housing/housing.route.js";
import incomeRouter from "./income/income.route.js"
import affordabilityRouter from "./affordability/affordability.route.js"
import statesRouter from "./states/states.route.js"

// Load .env from repo root (monorepo) or cwd
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
loadEnv({ path: path.join(root, ".env.development") });
loadEnv({ path: path.join(root, ".env") });
loadEnv(); // cwd .env overrides

const app = express();
const port = process.env.PORT ?? 3000;

app.use(express.json());
app.use(cors({ origin: "*"}));

app.get('/health', (_req, res) => {
  res.json({ status: "ok" });
});

app.use('/cities', citiesRouter);
app.use('/housing', housingRouter);
app.use('/income', incomeRouter);
app.use('/affordability', affordabilityRouter);
app.use('/states', statesRouter);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
