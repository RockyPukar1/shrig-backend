import { dataController } from "@/controllers/data.controller";
import { cacheMiddleware } from "@/middleware/cache.middleware";
import { validateDataIngestion } from "@/middleware/validation.middleware";
import { Router } from "express";

const router = Router();

router.post("/ingest", validateDataIngestion, dataController.ingestData);

router.get("/stats", cacheMiddleware(30), dataController.getDataStats);

router.get("/history", cacheMiddleware(120), dataController.getDataHistory);

router.get("/aggregate", cacheMiddleware(300), dataController.aggregateData);

export default router;
