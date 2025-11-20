import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import { logger } from "@/utils/logger";
import routes from "@/routes"
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

// Performance middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  next();
});

app.use("/api/v1/", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
