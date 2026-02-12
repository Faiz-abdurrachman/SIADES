import { Response } from 'express';

interface ApiResponseParams {
  res: Response;
  success: boolean;
  message: string;
  data?: unknown;
  error?: unknown;
  statusCode?: number;
}

export function apiResponse({
  res,
  success,
  message,
  data = null,
  error = null,
  statusCode = 200,
}: ApiResponseParams): void {
  res.status(statusCode).json({
    success,
    message,
    data,
    error,
  });
}
