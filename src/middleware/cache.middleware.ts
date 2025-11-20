import { cacheService } from "@/services/cache.service";
import { logger } from "@/utils/logger";
import { Request, Response, NextFunction } from "express";

export const cacheMiddleware = (ttl: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") {
      return next();
    }

    const cacheKey = `${req.originalUrl}:${JSON.stringify(req.query)}`;

    try {
      const cachedResponse = await cacheService.get(cacheKey);

      if (cachedResponse) {
        logger.info(`Cache hit for ${cacheKey}`);
        return res.json(cachedResponse);
      }

      const originalJson = res.json;

      res.json = function (body: any) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, body, ttl).catch((error: any) => {
            logger.error("Failed to cache response:", error);
          });
        }

        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      logger.error("Cache middleware error:", error);
      next();
    }
  };
};
