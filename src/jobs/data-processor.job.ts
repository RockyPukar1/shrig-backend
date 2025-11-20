import { dataRepository } from "@/repositories/data.repository";
import { cacheService } from "@/services/cache.service";
import { webSocketService } from "@/services/websocket.service";
import { ProcessDataJob } from "@/types/data.types";
import { logger } from "@/utils/logger";
import { Job } from "bull";
import dataProcessingQueue from "./queue";

export const processDataJob = async (job: Job<ProcessDataJob>) => {
  const { data, batch_id, priority } = job.data;

  try {
    logger.info(`Processing data batch ${batch_id} with ${data.length} points`);

    await job.progress(10);

    const savedData = await dataRepository.create(data);
    await job.progress(50);

    const stats = await dataRepository.getRealtimeStats();
    await job.progress(70);

    await cacheService.set("realtime_stats", stats, 60);
    await job.progress(80);

    if (webSocketService) {
      webSocketService.broadcastData({
        type: "data_processed",
        batch_id,
        count: savedData.length,
        stats,
      });

      const dataByType = data.reduce((acc, point) => {
        if (!acc[point.type]) acc[point.type] = [];
        acc[point.type].push(point);
        return acc;
      }, {} as Record<string, any[]>);

      Object.keys(dataByType).forEach((type) => {
        webSocketService.broadcastToRoom(`data_${type}`, "type_data_update", {
          type,
          data: dataByType[type],
          stats,
        });
      });
    }

    await job.progress(100);

    logger.info(`Successfully processed data batch ${batch_id}`);

    return {
      batch_id,
      processed_count: savedData.length,
      stats,
    };
  } catch (error) {
    logger.error(`Error processing data batch ${batch_id}:`, error);
    throw error;
  }
};

dataProcessingQueue.process(
  "process_data",
  parseInt(process.env.QUEUE_CONCURRENCY || "5"),
  processDataJob
);

export const addDataProcessingJob = async (
  data: any[],
  priority: number = 0
): Promise<void> => {
  const batch_id = `batch_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 9)}`;

  await dataProcessingQueue.add(
    "process_data",
    {
      data,
      batch_id,
      priority,
    },
    {
      priority,
      delay: 0,
    }
  );

  logger.info(`Added data processing job for batch ${batch_id}`);
};
