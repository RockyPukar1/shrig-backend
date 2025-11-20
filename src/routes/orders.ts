import { orderController } from "@/controllers/order.controller";
import { cacheMiddleware } from "@/middleware/cache.middleware";
import {
  validateOrderCreation,
  validatePagination,
} from "@/middleware/validation.middleware";
import { Router } from "express";

const router = Router();

router.get(
  "/",
  validatePagination,
  cacheMiddleware(300), // 5 minutes
  orderController.getOrders
);

router.get(
  "/stats",
  cacheMiddleware(900), // 15 minutes
  orderController.getOrderStats
);

router.get(
  "/search",
  validatePagination,
  cacheMiddleware(120), // 2 minutes
  orderController.searchOrders
);

router.get(
  "/:id",
  cacheMiddleware(600), // 10 minutes
  orderController.getOrderById
);

router.post("/", validateOrderCreation, orderController.createOrder);

export default router;
