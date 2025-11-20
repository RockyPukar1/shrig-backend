import { dataService } from "@/services/data.service";
import { ApiResponse, PaginationResult } from "@/types";
import { DataPoint, DataStats } from "@/types/data.types";
import { logger } from "@/utils/logger";
import { Request, Response, NextFunction } from "express";

export class DataController {
  async ingestData(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const startTime = Date.now();
      const dataPoints = Array.isArray(req.body) ? req.body : [req.body];

      if (dataPoints.length === 0) {
        const response: ApiResponse<null> = {
          success: false,
          message: "No data points provided",
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      if (dataPoints.length > 5000) {
        await dataService.ingestHighThroughputData(dataPoints);

        const response: ApiResponse<null> = {
          success: true,
          message: `${dataPoints.length} data points queued for high-throughput processing`,
          timestamp: new Date().toISOString(),
        };

        res.status(202).json(response);
        return;
      }

      const result = await dataService.ingestData(dataPoints);

      const responseTime = Date.now() - startTime;
      logger.info(`Data ingestion completed in ${responseTime}ms`);

      const response: ApiResponse<{ batch_id: string; queued: boolean }> = {
        success: true,
        data: result,
        message: `${dataPoints.length} data points ${
          result.queued ? "queued" : "processed"
        }`,
        timestamp: new Date().toISOString(),
      };

      res.status(result.queued ? 202 : 201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getDataStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const startTime = Date.now();
      const realTime = req.query.realTime === "true";

      const stats = realTime
        ? await dataService.getRealtimeStats()
        : await dataService.getDataStats();

      const responseTime = Date.now() - startTime;
      logger.info(`Data stats fetched in ${responseTime}ms`);

      const response: ApiResponse<DataStats> = {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getDataHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 50, 1000),
        type: req.query.type as string,
        startDate: req.query.startDate
          ? new Date(req.query.startDate as string)
          : undefined,
        endDate: req.query.endDate
          ? new Date(req.query.endDate as string)
          : undefined,
      };

      const result = await dataService.getDataHistory(query);

      const response: ApiResponse<PaginationResult<DataPoint>> = {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async aggregateData(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, startDate, endDate, interval = "hour" } = req.query;

      if (!type || !startDate || !endDate) {
        const response: ApiResponse<null> = {
          success: false,
          message: "type, startDate and endDate are required",
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const result = await dataService.aggregateData(
        type as string,
        new Date(startDate as string),
        new Date(endDate as string),
        interval as "hour" | "day" | "week"
      );

      const response: ApiResponse<
        {
          timestamp: Date;
          count: number;
          avg_value: number;
          sum_value: number;
        }[]
      > = {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const dataController = new DataController();
