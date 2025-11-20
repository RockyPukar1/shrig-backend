import "dotenv/config";
import { createServer } from "http";
import app from "./app";
import { redisConfig } from "@/config/redis";
import { initializeWebSocket } from "./services/websocket.service";
import { orderService } from "./services/order.service";
import { logger } from "@/utils/logger";
import "./jobs/data-processor.job";
import databaseConfig from "./config/database";

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await databaseConfig.connect();
    logger.info("Connected to MongoDB");

    await redisConfig.connect();
    logger.info("Connected to Redis");

    const httpServer = createServer(app);

    initializeWebSocket(httpServer);
    logger.info("WebSocket server initialized");

    await orderService.warmCache();

    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(
        `MongoDB: ${databaseConfig.isReady() ? "Connected" : "Disconnected"}`
      );
      logger.info(
        `Redis: ${redisConfig.isReady() ? "Connected" : "Disconnected"}`
      );
    });

    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received, shutting down gracefully...");
      httpServer.close(async () => {
        await databaseConfig.disconnect();
        await redisConfig.disconnect();
        logger.info("MongoDB disconnected");
        logger.info("Redis disconnected");
        logger.info("HTTP server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(0);
  }
}

startServer();
