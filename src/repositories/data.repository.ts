import pool from "@/config/database";
import { DataPointModel } from "@/models/data-point.model";
import { PaginationQuery, PaginationResult } from "@/types";
import { DataPoint, DataStats } from "@/types/data.types";
import { logger } from "@/utils/logger";

export class DataRepository {
  async create(dataPoints: DataPoint[]): Promise<DataPoint[]> {
    if (dataPoints.length === 0) return [];

    try {
      const savedDataPoints = await DataPointModel.insertMany(dataPoints);
      return savedDataPoints.map(this.transformDataPoint);
    } catch (error) {
      logger.error("Error creating data points:", error);
      throw error;
    }
  }

  async findAll(
    query: PaginationQuery & {
      type?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<PaginationResult<DataPoint>> {
    const { page = 1, limit = 50, type, startDate, endDate } = query;

    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};

    if (type) {
      filter.type = type;
    }

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = startDate;
      if (endDate) filter.timestamp.$lte = endDate;
    }

    try {
      const [data, total] = await Promise.all([
        DataPointModel.find(filter)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        DataPointModel.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: data.map(this.transformDataPoint),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error("Error fetching data points:", error);
      throw error;
    }
  }

  async getStats(): Promise<DataStats> {
    try {
      const pipeline = [
        {
          $group: {
            _id: null,
            total_points: { $sum: 1 },
            avg_value: { $avg: "$value" },
            min_value: { $min: "$value" },
            max_value: { $max: "$value" },
          },
        },
      ];

      const typeStatsPipeline = [
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
          },
        },
      ];

      const [statsResult, typeStatsResult] = await Promise.all([
        DataPointModel.aggregate(pipeline),
        DataPointModel.aggregate(typeStatsPipeline),
      ]);

      const stats = statsResult[0] || {
        total_points: 0,
        avg_value: 0,
        min_value: 0,
        max_value: 0,
      };

      const dataByType: Record<string, number> = {};
      typeStatsResult.forEach((row) => {
        dataByType[row._id] = row.count;
      });

      return {
        total_points: stats.total_points,
        avg_value: stats.avg_value || 0,
        min_value: stats.min_value || 0,
        max_value: stats.max_value || 0,
        data_by_type: dataByType,
      };
    } catch (error) {
      logger.error("Error fetching data stats:", error);
      throw error;
    }
  }

  async getRealtimeStats(minutes: number = 5): Promise<DataStats> {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

    try {
      const pipeline = [
        {
          $match: {
            timestamp: { $gte: cutoffTime },
          },
        },
        {
          $group: {
            _id: null,
            total_points: { $sum: 1 },
            avg_value: { $avg: "$value" },
            min_value: { $min: "$value" },
            max_value: { $max: "$value" },
          },
        },
      ];

      const typeStatsPipeline = [
        {
          $match: {
            timestamp: { $gte: cutoffTime },
          },
        },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
          },
        },
      ];

      const [statsResult, typeStatsResult] = await Promise.all([
        DataPointModel.aggregate(pipeline),
        DataPointModel.aggregate(typeStatsPipeline),
      ]);

      const stats = statsResult[0] || {
        total_points: 0,
        avg_value: 0,
        min_value: 0,
        max_value: 0,
      };

      const dataByType: Record<string, number> = {};
      typeStatsResult.forEach((row) => {
        dataByType[row._id] = row.count;
      });

      return {
        total_points: stats.total_points,
        avg_value: stats.avg_value || 0,
        min_value: stats.min_value || 0,
        max_value: stats.max_value || 0,
        data_by_type: dataByType,
      };
    } catch (error) {
      logger.error("Error fetching realtime data stats:", error);
      throw error;
    }
  }

  private transformDataPoint(dataPoint: any): DataPoint {
    return {
      id: dataPoint._id?.toString() || dataPoint.id,
      type: dataPoint.type,
      value: dataPoint.value,
      metadata: dataPoint.metadata,
      timestamp: dataPoint.timestamp,
    };
  }
}

export const dataRepository = new DataRepository();
