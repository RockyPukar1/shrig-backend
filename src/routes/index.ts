import { Router } from "express";
import orderRoutes from "./orders";
import dataRoutes from "./data";

const router = Router();

router.use("/orders", orderRoutes);
router.use("/data", dataRoutes);

router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
