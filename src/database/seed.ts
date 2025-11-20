import "dotenv/config";
import { databaseConfig } from "@/config/database";
import { OrderModel } from "@/models/order.model";
import { DataPointModel } from "@/models/data-point.model";
import { OrderStatus } from "@/types/order.types";
import { logger } from "@/utils/logger";

async function seedDatabase() {
  try {
    await databaseConfig.connect();
    logger.info("Connected to MongoDB for seeding");

    await OrderModel.deleteMany({});
    await DataPointModel.deleteMany({});
    logger.info("Cleared existing data");

    logger.info("Seeding orders...");
    const batchSize = 1000;
    const totalOrders = 12000;

    for (let i = 0; i < totalOrders; i += batchSize) {
      const orders = Array.from(
        { length: Math.min(batchSize, totalOrders - i) },
        (_, j) => {
          const index = i + j;
          const products = [
            "Laptop",
            "Mouse",
            "Keyboard",
            "Monitor",
            "Headphones",
            "Webcam",
            "Speaker",
            "Tablet",
            "Phone",
            "Charger",
          ];
          const statuses = Object.values(OrderStatus);
          const quantity = Math.floor(Math.random() * 5) + 1;
          const price = Math.random() * 500 + 50;

          return {
            customer_name: `Customer ${index + 1}`,
            customer_email: `customer${index + 1}@example.com`,
            product_name: `${products[index % products.length]} ${index + 1}`,
            quantity,
            price: Math.round(price * 100) / 100,
            total_amount: Math.round(quantity * price * 100) / 100,
            status: statuses[index % statuses.length],
            created_at: new Date(
              Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
            ),
          };
        }
      );

      await OrderModel.insertMany(orders);
      logger.info(
        `Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          totalOrders / batchSize
        )}`
      );
    }

    logger.info("Seeding data points...");
    const dataPoints = Array.from({ length: 5000 }, (_, i) => {
      const types = [
        "temperature",
        "humidity",
        "pressure",
        "speed",
        "voltage",
        "current",
      ];
      return {
        type: types[i % types.length],
        value: Math.round(Math.random() * 100 * 100) / 100,
        metadata: {
          sensor_id: (i % 100) + 1,
          location: `room_${(i % 10) + 1}`,
          batch: Math.floor(i / 100),
          quality: Math.random() > 0.1 ? "good" : "poor",
        },
        timestamp: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        ),
      };
    });

    await DataPointModel.insertMany(dataPoints);
    logger.info(`Inserted ${dataPoints.length} data points`);

    const orderCount = await OrderModel.countDocuments();
    const dataPointCount = await DataPointModel.countDocuments();
    const totalRevenue = await OrderModel.aggregate([
      { $group: { _id: null, total: { $sum: "$total_amount" } } },
    ]);

    logger.info("🎉 Database seeded successfully!");
    logger.info(`📊 Seed Statistics:`);
    logger.info(`   Orders: ${orderCount.toLocaleString()}`);
    logger.info(`   Data Points: ${dataPointCount.toLocaleString()}`);
    logger.info(
      `   Total Revenue: $${totalRevenue[0]?.total?.toLocaleString() || 0}`
    );
  } catch (error) {
    logger.error("❌ Seeding failed:", error);
  } finally {
    await databaseConfig.disconnect();
  }
}

seedDatabase();
