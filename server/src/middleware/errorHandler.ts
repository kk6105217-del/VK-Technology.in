import { Request, Response, NextFunction } from 'express';
import { env } from '../config/environment.js';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  // Log error internally for audit purposes
  console.error(`[Error Handler] ${req.method} ${req.originalUrl} - Status: ${statusCode}`, {
    message: err.message,
    name: err.name,
    code: err.code,
    timestamp: new Date().toISOString(),
  });

  // Handle Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map((e: any) => e.message);
    res.status(400).json({
      error: 'Data validation failed.',
      details: errors,
    });
    return;
  }

  // Handle Mongoose Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'record';
    res.status(409).json({
      error: `A record with this ${field} already exists.`,
      field,
    });
    return;
  }

  // Handle Invalid ObjectId
  if (err.name === 'CastError') {
    res.status(400).json({
      error: 'Invalid resource identifier format.',
    });
    return;
  }

  // Generic Secure Response - Never leak internal stack traces to the public client
  const isProduction = env.nodeEnv === 'production';
  res.status(statusCode).json({
    error: err.message || 'An unexpected internal server error occurred.',
    ...(isProduction ? {} : { stack: err.stack }),
  });
}
