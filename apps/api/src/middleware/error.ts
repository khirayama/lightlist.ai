import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '@/utils/response';

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', error);

  if (error instanceof ZodError) {
    const messages = error.errors.map((err) => err.message);
    sendError(res, 'VALIDATION_ERROR', messages.join(', '), 400);
    return;
  }

  if (error.name === 'JsonWebTokenError') {
    sendError(res, 'INVALID_TOKEN', 'Invalid token', 401);
    return;
  }

  if (error.name === 'TokenExpiredError') {
    sendError(res, 'TOKEN_EXPIRED', 'Token expired', 401);
    return;
  }

  if (error.message === 'USER_NOT_FOUND') {
    sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
    return;
  }

  if (error.message === 'INVALID_CREDENTIALS') {
    sendError(res, 'INVALID_CREDENTIALS', 'Invalid credentials', 401);
    return;
  }

  if (error.message === 'EMAIL_ALREADY_EXISTS') {
    sendError(res, 'EMAIL_ALREADY_EXISTS', 'Email already exists', 409);
    return;
  }

  if (error.message === 'INVALID_REFRESH_TOKEN') {
    sendError(res, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token', 401);
    return;
  }

  sendError(res, 'INTERNAL_SERVER_ERROR', 'Internal server error', 500);
};