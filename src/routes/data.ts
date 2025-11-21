import { dataController } from "@/controllers/data.controller";
import { cacheMiddleware } from "@/middleware/cache.middleware";
import { validateDataIngestion } from "@/middleware/validation.middleware";
import { Router } from "express";

const router = Router();

router.post("/ingest", validateDataIngestion, dataController.ingestData);

router.get("/stats", dataController.getDataStats);

router.get("/history", dataController.getDataHistory);

router.get("/aggregate", dataController.aggregateData);

export default router;
