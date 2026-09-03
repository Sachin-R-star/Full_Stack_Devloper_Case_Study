import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'fail',
      message: 'Validation Error',
      errors: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'fail',
      message: err.message,
    });
  }

  // Log error internally for ops monitoring
  console.error('Unhandled Server Error:', err);

  // In production, mask internal stack traces and raw DB errors
  const clientMessage = isProduction
    ? 'An unexpected error occurred. Please try again later.'
    : err.message || 'Internal Server Error';

  return res.status(500).json({
    status: 'error',
    message: clientMessage,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};
