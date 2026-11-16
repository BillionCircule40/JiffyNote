import { Request, Response, NextFunction } from 'express';

export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: any;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export type APIResponse<T> = ErrorResponse | SuccessResponse<T>;

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('Error:', err.message);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      message: err.message
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
};
