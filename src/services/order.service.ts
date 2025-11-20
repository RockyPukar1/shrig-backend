import { PaginationResult, PaginationQuery } from "@/types";
import {
  CreateOrderDto,
  Order,
  OrderStats,
  OrderStatus,
} from "@/types/order.types";
import { cacheService } from "./cache.service";
import { logger } from "@/utils/logger";
import { orderRepository } from "@/repositories/order.repository";

export class OrderService {
  private readonly CACHE_KEY = {
    ORDERS_LIST: (query: string) => `orders:list:${query}`,
    ORDER_BY_ID: (id: string) => `order:${id}`,
    ORDER_STATS: "orders:stats",
    ORDER_SEARCH: (term: string, page: number) =>
      `orders:search:${term}:${page}`,
  };

  async getOrders(
    query: PaginationQuery & {
      status?: OrderStatus;
      sortBy?: string;
      sortOrder?: "ASC" | "DESC";
    }
  ): Promise<PaginationResult<Order>> {
    const cacheKey = this.CACHE_KEY.ORDERS_LIST(JSON.stringify(query));

    const cachedResult = await cacheService.getMultiLevel<
      PaginationResult<Order>
    >(cacheKey);
    if (cachedResult) {
      logger.info("Order retrieved from cache");
      return cachedResult;
    }

    const result = await orderRepository.findAll(query);

    await cacheService.setMultiLevel(cacheKey, result, 300);

    return result;
  }

  async getOrderById(id: string): Promise<Order | null> {
    const cacheKey = this.CACHE_KEY.ORDER_BY_ID(id);

    const cachedOrder = await cacheService.getMultiLevel<Order>(cacheKey);
    if (cachedOrder) {
      return cachedOrder;
    }

    const order = await orderRepository.findById(id);
    if (order) {
      await cacheService.setMultiLevel(cacheKey, order, 600);
    }

    return order;
  }

  async searchOrders(
    searchTerm: string,
    pagination: PaginationQuery
  ): Promise<PaginationResult<Order>> {
    const cacheKey = this.CACHE_KEY.ORDER_SEARCH(
      searchTerm,
      pagination.page || 1
    );

    const cachedResult = await cacheService.get<PaginationResult<Order>>(
      cacheKey
    );
    if (cachedResult) {
      return cachedResult;
    }

    const result = await orderRepository.search(searchTerm, pagination);

    await cacheService.set(cacheKey, result, 120);

    return result;
  }

  async createOrder(orderData: CreateOrderDto): Promise<Order> {
    const order = await orderRepository.create(orderData);

    await this.invalidateOrderCaches();

    return order;
  }

  async createBatchOrders(orders: CreateOrderDto[]): Promise<Order[]> {
    if (orders.length === 0) {
      throw new Error("No orders provided for batch creation");
    }

    if (orders.length > 1000) {
      throw new Error("Batch size too large. Maximum 1000 orders per batch");
    }

    const createdOrders = await orderRepository.createBatch(orders);

    await this.invalidateOrderCaches();

    return createdOrders;
  }

  async getOrderStats(): Promise<OrderStats> {
    const cacheKey = this.CACHE_KEY.ORDER_STATS;

    const cachedStats = await cacheService.getMultiLevel<OrderStats>(cacheKey);
    if (cachedStats) {
      return cachedStats;
    }

    const stats = await orderRepository.getStats();

    await cacheService.setMultiLevel(cacheKey, stats, 900);

    return stats;
  }

  async warmCache(): Promise<void> {
    try {
      logger.info("Starting cache warming...");

      await this.getOrderStats();

      await this.getOrders({ page: 1, limit: 50 });

      logger.info("Cache warming completed");
    } catch (error) {
      logger.error("Cache warming failed:", error);
    }
  }

  private async invalidateOrderCaches(): Promise<void> {
    try {
      await Promise.all([
        cacheService.invalidatePattern("orders:list:*"),
        cacheService.invalidatePattern("order:search:*"),
        cacheService.del(this.CACHE_KEY.ORDER_STATS),
      ]);
    } catch (error) {
      logger.error("Cache invalidation failed:", error);
    }
  }
}

export const orderService = new OrderService();
