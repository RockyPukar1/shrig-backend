import { orderController } from "@/controllers/order.controller";
import { cacheMiddleware } from "@/middleware/cache.middleware";
import {
  validateOrderCreation,
  validatePagination,
} from "@/middleware/validation.middleware";
import { Router } from "express";

const router = Router();

router.get("/", validatePagination, orderController.getOrders);

router.get("/stats", orderController.getOrderStats);

router.get("/search", validatePagination, orderController.searchOrders);

router.get("/:id", orderController.getOrderById);

router.post("/", validateOrderCreation, orderController.createOrder);

export default router;
