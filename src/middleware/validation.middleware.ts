import { ApiResponse } from "@/types";
import { Request, Response, NextFunction } from "express";
import Joi from "joi";

const orderSchema = Joi.object({
  customer_name: Joi.string().min(2).max(255).required(),
  customer_email: Joi.string().email().required(),
  product_name: Joi.string().min(1).max(255).required(),
  quantity: Joi.number().integer().min(1).required(),
  price: Joi.number().positive().required(),
});

const batchOrderSchema = Joi.array().items(orderSchema).min(1).max(1000);

const dataPointSchema = Joi.object({
  type: Joi.string().min(1).max(100).required(),
  value: Joi.number().required(),
  metadata: Joi.object().optional(),
  timestamp: Joi.date().optional(),
});

const dataIngestionSchema = Joi.alternatives().try(
  dataPointSchema,
  Joi.array().items(dataPointSchema).min(1).max(1000)
);

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(1000).optional(),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid("ASC", "DESC").optional(),
  status: Joi.string().optional(),
});

export const validateOrderCreation = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const schema = Array.isArray(req.body) ? batchOrderSchema : orderSchema;
  const { error } = schema.validate(req.body);

  if (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.details[0].message,
      timestamp: new Date().toISOString(),
    };
    return res.status(400).json(response);
  }

  next();
};

export const validateDataIngestion = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { error } = dataIngestionSchema.validate(req.body);

  if (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.details[0].message,
      timestamp: new Date().toISOString(),
    };
    return res.status(400).json(response);
  }

  next();
};

export const validatePagination = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { error } = paginationSchema.validate(req.query);

  if (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.details[0].message,
      timestamp: new Date().toISOString(),
    };
    return res.status(400).json(response);
  }

  next();
};
