import request from "supertest";
import app from "../../src/app";
import { OrderModel } from "../../src/models/order.model";
import { OrderStatus } from "../../src/types/order.types";
import { cacheService } from "../../src/services/cache.service";

describe("High-Performance API Tests", () => {
  beforeAll(async () => {
    await seedLargeDataset();
  });

  afterEach(async () => {
    await cacheService.invalidatePattern("*");
  });

  describe("Test Case 1: Pagination Performance", () => {
    it("should return 50 records in less than 500ms with 10,000+ records", async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get("/api/v1/orders?page=1&limit=50")
        .expect(200);

      const responseTime = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(50);
      expect(response.body.data.pagination.total).toBeGreaterThan(10000);
      expect(responseTime).toBeLessThan(500);

      console.log(`Test Case 1: Pagination completed in ${responseTime}ms`);
    });
  });

  describe("Test Case 2: Cached Statistics Performance", () => {
    it("should return stats in less than 100ms when cached", async () => {
      await request(app).get("/api/v1/orders/stats").expect(200);

      const startTime = Date.now();

      const response = await request(app)
        .get("/api/v1/orders/stats")
        .expect(200);

      const responseTime = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("total_orders");
      expect(response.body.data).toHaveProperty("total_revenue");
      expect(responseTime).toBeLessThan(100);

      console.log(`Test Case 2: Cached stats returned in ${responseTime}ms`);
    });
  });

  describe("Test Case 3: Search Performance with Database Index", () => {
    it("should perform fast search using database index", async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get("/api/v1/orders/search?q=laptop&page=1&limit=20")
        .expect(200);

      const responseTime = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toBeInstanceOf(Array);
      expect(responseTime).toBeLessThan(300);

      console.log(`Test Case 3: Search completed in ${responseTime}ms`);
    });
  });

  describe("Test Case 4: Batch Insert Performance", () => {
    it("should efficiently create 100 orders using batch insert", async () => {
      const batchOrders = generateBatchOrders(100);
      const startTime = Date.now();

      const response = await request(app)
        .post("/api/v1/orders")
        .send(batchOrders)
        .expect(201);

      const responseTime = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(100);
      expect(responseTime).toBeLessThan(1000);

      console.log(
        `Test Case 4: Batch insert (100 orders) completed in ${responseTime}ms`
      );
    });
  });

  describe("Test Case 5: Concurrent Request Handling", () => {
    it("should handle multiple concurrent requests efficiently with connection pooling", async () => {
      const concurrentRequests = 50;
      const promises: Promise<any>[] = [];

      const startTime = Date.now();

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app).get("/api/v1/orders?page=1&limit=20").expect(200)
        );
      }

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      responses.forEach((response) => {
        expect(response.body.success).toBe(true);
        expect(response.body.data.data).toHaveLength(20);
      });

      const avgTimePerRequest = totalTime / concurrentRequests;
      expect(avgTimePerRequest).toBeLessThan(1000);

      console.log(
        `Test Case 5: ${concurrentRequests} concurrent requests completed in ${totalTime}ms`
      );
      console.log(`  Average time per request: ${avgTimePerRequest}ms`);
    });
  });
});

async function seedLargeDataset() {
  const existingCount = await OrderModel.countDocuments();
  if (existingCount >= 10000) {
    console.log(`Database already has ${existingCount} records`);
    return;
  }

  console.log(
    "Seeding database with 12,000 records for performance testing..."
  );
  const batchSize = 1000;
  const totalRecords = 12000;

  for (let i = 0; i < totalRecords; i += batchSize) {
    const batch = generateBatchOrders(Math.min(batchSize, totalRecords - i));
    await OrderModel.insertMany(batch);
  }

  console.log("Database seeded successfully");
}

function generateBatchOrders(count: number) {
  const products = ["Laptop", "Mouse", "Keyboard", "Monitor", "Headphones"];
  const statuses = Object.values(OrderStatus);

  return Array.from({ length: count }, (_, i) => ({
    customer_name: `Customer ${i + 1}`,
    customer_email: `customer${i + 1}@example.com`,
    product_name: `${products[i % products.length]} ${i + 1}`,
    quantity: Math.floor(Math.random() * 5) + 1,
    price: Math.round((Math.random() * 100 + 10) * 100) / 100,
    status: statuses[i % statuses.length],
  }));
}
