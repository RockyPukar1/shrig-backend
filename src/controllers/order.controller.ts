import { orderService } from "@/services/order.service";
import { ApiResponse, PaginationResult } from "@/types";
import {
  CreateOrderDto,
  Order,
  OrderStats,
  OrderStatus,
} from "@/types/order.types";
import { logger } from "@/utils/logger";
import { Request, Response, NextFunction } from "express";

export class OrderController {
  async getOrders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const startTime = Date.now();

      const query = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100), // max 100 per page
        status: req.query.status as OrderStatus,
        sortBy: (req.query.sortBy as string) || "created_at",
        sortOrder: (req.params.sortOrder as "ASC" | "DESC") || "DESC",
      };

      const result = await orderService.getOrders(query);

      const responseTime = Date.now() - startTime;
      logger.info(`Orders fetched in ${responseTime}ms`);

      const response: ApiResponse<PaginationResult<Order>> = {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getOrderById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const order = await orderService.getOrderById(id);

      if (!order) {
        const response: ApiResponse<null> = {
          success: false,
          message: "Order not found",
          timestamp: new Date().toISOString(),
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<Order> = {
        success: true,
        data: order,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async searchOrders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const startTime = Date.now();

      const searchTerm = req.query.q as string;
      if (!searchTerm) {
        const response: ApiResponse<null> = {
          success: false,
          message: "Search term is required",
          timestamp: new Date().toISOString(),
        };
        console.log(response);
        res.status(400).json(response);
        return;
      }

      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
      };

      const result = await orderService.searchOrders(searchTerm, pagination);

      const responseTime = Date.now() - startTime;
      logger.info(`Orders search completed in ${responseTime}ms`);

      const response: ApiResponse<PaginationResult<Order>> = {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async createOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const orderData: CreateOrderDto = req.body;

      if (Array.isArray(orderData)) {
        const orders = await orderService.createBatchOrders(orderData);
        const response: ApiResponse<Order[]> = {
          success: true,
          data: orders,
          message: `${orders.length} orders created successfully`,
          timestamp: new Date().toISOString(),
        };

        res.status(201).json(response);
        return;
      }

      const order = await orderService.createOrder(orderData);

      const response: ApiResponse<Order> = {
        success: true,
        data: order,
        message: "Order created successfully",
        timestamp: new Date().toISOString(),
      };

      res.status(201).json(response);
      return;
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  async getOrderStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const startTime = Date.now();

      const stats = await orderService.getOrderStats();

      const responseTime = Date.now() - startTime;
      logger.info(`Order stats fetched in ${responseTime}ms`);

      const response: ApiResponse<OrderStats> = {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();
