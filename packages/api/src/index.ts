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
import shareRouter from "./share/share.route.js";
import cityProfileRouter from "./city-profile/city-profile.route.js";
import financialRouter from "./financial/financial.route.js";
import qualityOfLifeRouter from "./quality-of-life/quality-of-life.route.js";
import climateRouter from "./climate/climate.route.js";
import lifestyleRouter from "./lifestyle/lifestyle.route.js";
import adminRouter from "./admin/admin.route.js";
import airQualityRouter from "./air-quality/air-quality.route.js";
import politicalLeanRouter from "./political-lean/political-lean.route.js";
import educationRouter from "./education/education.route.js";
import costOfLivingRouter from "./cost-of-living/cost-of-living.route.js";
import cityPhotoRouter from "./city-photo/city-photo.route.js";
import cityLocationRouter from "./city-location/city-location.route.js";
import contactRouter from "./contact/contact.route.js";
import { initializeColCache } from "./cost-of-living/cost-of-living.service.js";
import { initializeHpiCache } from "./housing/housing.service.js";
import { initializeAqiCache } from "./air-quality/air-quality.service.js";
import { initializePoliticalLeanCache } from "./political-lean/political-lean.service.js";
import { initializeRegionalJobsCache } from "./income/regional-jobs.service.js";

// Load .env from repo root (monorepo) or cwd
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
loadEnv({ path: path.join(root, ".env.development") });
loadEnv({ path: path.join(root, ".env") });
loadEnv(); // cwd .env overrides

const app = express();
const port = process.env.PORT ?? 3000;

app.set("trust proxy", true);
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
app.use('/share', shareRouter);
app.use('/city-profile', cityProfileRouter);
app.use('/financial', financialRouter);
app.use('/quality-of-life', qualityOfLifeRouter);
app.use('/climate', climateRouter);
app.use('/lifestyle', lifestyleRouter);
app.use('/admin', adminRouter);
app.use('/air-quality', airQualityRouter);
app.use('/political-lean', politicalLeanRouter);
app.use('/education', educationRouter);
app.use('/cost-of-living', costOfLivingRouter);
app.use('/city-photo', cityPhotoRouter);
app.use('/city-location', cityLocationRouter);
app.use('/contact', contactRouter);

// Initialize FHFA data cache at startup
initializeHpiCache();
initializeAqiCache();
initializePoliticalLeanCache();
initializeColCache();
initializeRegionalJobsCache();

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
