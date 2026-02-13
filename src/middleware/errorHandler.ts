import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/appError';
import logger from '../config/logger';

const isProduction = process.env.NODE_ENV === 'production';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      data: null,
      error: null,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      data: null,
      error: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  logger.error({
    requestId: req.id,
    err,
    msg: 'Unhandled error',
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    data: null,
    error: isProduction ? null : { name: err.name, message: err.message, stack: err.stack },
  });
}
