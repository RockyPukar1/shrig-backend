import { dataRepository } from "@/repositories/data.repository";
import { DataPoint, DataStats } from "@/types/data.types";
import { cacheService } from "./cache.service";
import { logger } from "@/utils/logger";
import { addDataProcessingJob } from "@/jobs/data-processor.job";
import { PaginationQuery, PaginationResult } from "@/types";
import { DataPointModel } from "@/models/data-point.model";

export class DataService {
  private readonly CACHE_KEY = {
    DATA_STATS: "data:stats",
    REALTIME_STATS: "data:realtime_stats",
    DATA_HISTORY: (query: string) => `data:history:${query}`,
  };

  async ingestData(
    dataPoints: DataPoint[]
  ): Promise<{ batch_id: string; queued: boolean }> {
    if (dataPoints.length === 0) {
      throw new Error("No data points provided");
    }

    this.validateDataPoints(dataPoints);

    if (dataPoints.length <= 10) {
      await dataRepository.create(dataPoints);

      await this.invalidateDataCaches();

      return {
        batch_id: `immediate_${Date.now()}`,
        queued: false,
      };
    }

    const batch_id = `batch_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    await addDataProcessingJob(dataPoints, 1);

    return {
      batch_id,
      queued: true,
    };
  }

  async getDataHistory(
    query: PaginationQuery & {
      type?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<PaginationResult<DataPoint>> {
    const cacheKey = this.CACHE_KEY.DATA_HISTORY(JSON.stringify(query));

    const cachedResult = await cacheService.get<PaginationResult<DataPoint>>(
      cacheKey
    );
    if (cachedResult) {
      return cachedResult;
    }

    const result = await dataRepository.findAll(query);

    await cacheService.set(cacheKey, result, 120);

    return result;
  }

  async getDataStats(): Promise<DataStats> {
    const cacheKey = this.CACHE_KEY.DATA_STATS;

    const cachedStats = await cacheService.getMultiLevel<DataStats>(cacheKey);
    if (cachedStats) {
      return cachedStats;
    }

    const stats = await dataRepository.getStats();

    await cacheService.setMultiLevel(cacheKey, stats, 300);

    return stats;
  }

  async getRealtimeStats(): Promise<DataStats> {
    const cacheKey = this.CACHE_KEY.REALTIME_STATS;

    const cachedStats = await cacheService.get<DataStats>(cacheKey);
    if (cachedStats) {
      return cachedStats;
    }

    const stats = await dataRepository.getRealtimeStats(5);

    await cacheService.set(cacheKey, stats, 30);

    return stats;
  }

  async ingestHighThroughputData(dataStream: DataPoint[]): Promise<void> {
    const BATCH_SIZE = 1000;
    const batches: DataPoint[][] = [];

    for (let i = 0; i < dataStream.length; i += BATCH_SIZE) {
      batches.push(dataStream.slice(i, i + BATCH_SIZE));
    }

    const promises = batches.map(async (batch, index) => {
      const priority = index < 3 ? 2 : 1;
      return addDataProcessingJob(batch, priority);
    });

    await Promise.all(promises);
    logger.info(
      `Queued ${batches.length} batches for high-throughput processing`
    );
  }

  private validateDataPoints(dataPoints: DataPoint[]): void {
    for (const point of dataPoints) {
      if (
        !point.type ||
        typeof point.value !== "string" ||
        typeof point.value !== "string"
      ) {
        throw new Error(
          "Invalid data point: type is required and must be a string"
        );
      }

      if (typeof point.value !== "number") {
        throw new Error("Invalid data point: value must be a number");
      }

      if (point.metadata && typeof point.metadata !== "object") {
        throw new Error("Invalid data point: metadata must be an object");
      }
    }
  }

  private async invalidateDataCaches(): Promise<void> {
    try {
      await Promise.all([
        cacheService.del(this.CACHE_KEY.DATA_STATS),
        cacheService.del(this.CACHE_KEY.REALTIME_STATS),
        cacheService.invalidatePattern("data:history:*"),
      ]);
    } catch (error) {
      logger.error("Cache invalidation failed:", error);
      throw error;
    }
  }

  async aggregateData(
    type: string,
    startDate: Date,
    endDate: Date,
    interval: "hour" | "day" | "week" = "hour"
  ): Promise<
    Array<{
      timestamp: Date;
      count: number;
      avg_value: number;
      sum_value: number;
    }>
  > {
    const intervalMap = {
      hour: {
        $dateToString: { format: "%Y-%m-%d %H:00:00", date: "$timestamp" },
      },
      day: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
      week: { $dateToString: { format: "%Y-W%V", date: "$timestamp" } },
    };

    try {
      const result = await DataPointModel.aggregate([
        {
          $match: {
            type: type,
            timestamp: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: intervalMap[interval],
            count: { $sum: 1 },
            avg_value: { $avg: "$value" },
            sum_value: { $sum: "$value" },
          },
        },
        {
          $sort: { _id: 1 as 1 },
        },
      ]);

      return result.map((row: any) => ({
        timestamp: new Date(row._id),
        count: row.count,
        avg_value: row.avg_value,
        sum_value: row.sum_value,
      }));
    } catch (error) {
      logger.error("Error aggregating data:", error);
      throw error;
    }
  }
}

export const dataService = new DataService();
