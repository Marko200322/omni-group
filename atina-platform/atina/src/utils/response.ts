import { Response } from 'express';
import { config } from '../config';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta?: ApiResponse['meta']
): Response {
  const response: ApiResponse<T> = { success: true, data, message };
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T, message = 'Created'): Response {
  return sendSuccess(res, data, message, 201);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  code = 'ERROR',
  details?: unknown
): Response {
  // Keep 5xx details hidden in production while preserving non-prod/test diagnostics.
  const safeDetails = config.app.isProd && statusCode >= 500 ? undefined : details;
  const response: ApiResponse = {
    success: false,
    error: { code, message, details: safeDetails },
  };
  return res.status(statusCode).json(response);
}

export function paginate<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number
): Response {
  return sendSuccess(res, data, 'Success', 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}
