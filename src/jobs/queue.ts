import { logger } from "@/utils/logger";
import Queue from "bull";

export const dataProcessingQueue = new Queue("data processing", {
  redis: {
    host: process.env.QUEUE_REDIS_HOST || "localhost",
    port: parseInt(process.env.QUEUE_REDIS_PORT || "6379"),
  },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

dataProcessingQueue.on("completed", (job, result) => {
  logger.info(`Job ${job.id} completed with result:`, result);
});

dataProcessingQueue.on("failed", (job, error) => {
  logger.error(`Job ${job.id} failed:`, error);
});

dataProcessingQueue.on("stalled", (job) => {
  logger.warn(`Job ${job.id} stalled`);
});

process.on("SIGTERM", async () => {
  logger.info("Closing job queues...");
  await dataProcessingQueue.close();
});

export default dataProcessingQueue;
