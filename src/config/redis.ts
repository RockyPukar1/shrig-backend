import { createClient, RedisClientType } from "redis";
import { logger } from "@/utils/logger";

class RedisConfig {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      url: `redis://${process.env.REDIS_HOST || "localhost"}:${
        process.env.REDIS_PORT || "6379"
      }`,
      password: process.env.REDIS_PASSWORD || undefined,
      database: parseInt(process.env.REDIS_DB || "0"),
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error("Redis retry attempts exhausted");
            return new Error("Redis retry attempts exhausted");
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on("connect", () => {
      logger.info("Redis client connected");
      this.isConnected = true;
    });

    this.client.on("error", (err) => {
      logger.error("Redis client error:", err);
      this.isConnected = false;
    });

    this.client.on("end", () => {
      logger.info("Redis client disconnected");
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.destroy();
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }
}

export const redisConfig = new RedisConfig();
