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

  if (error.message === 'INVALID_RESET_TOKEN') {
    sendError(res, 'INVALID_RESET_TOKEN', 'Invalid or expired reset token', 401);
    return;
  }

  if (error.message === 'DEVICE_ID_REQUIRED') {
    sendError(res, 'DEVICE_ID_REQUIRED', 'Device ID header is required', 400);
    return;
  }

  if (error.message === 'SESSION_NOT_FOUND') {
    sendError(res, 'SESSION_NOT_FOUND', 'Session not found or expired', 404);
    return;
  }

  if (error.message === 'DOCUMENT_NOT_FOUND') {
    sendError(res, 'DOCUMENT_NOT_FOUND', 'Document not found', 404);
    return;
  }

  if (error.message === 'TASK_LIST_NOT_FOUND') {
    sendError(res, 'TASK_LIST_NOT_FOUND', 'Task list not found', 404);
    return;
  }

  if (error.message === 'INVALID_DOCUMENT_STATE') {
    sendError(res, 'INVALID_DOCUMENT_STATE', 'Invalid document state', 400);
    return;
  }

  if (error.message === 'TASK_NOT_FOUND') {
    sendError(res, 'TASK_NOT_FOUND', 'Task not found', 404);
    return;
  }

  if (error.message === 'INVALID_TASK_ORDER') {
    sendError(res, 'INVALID_TASK_ORDER', 'Invalid task order format', 400);
    return;
  }

  if (error.message === 'INVALID_TASK_LIST_ORDER') {
    sendError(res, 'INVALID_TASK_LIST_ORDER', 'Invalid task list order format', 400);
    return;
  }

  if (error.message === 'SHARE_NOT_FOUND') {
    sendError(res, 'SHARE_NOT_FOUND', 'Share link not found or expired', 404);
    return;
  }

  sendError(res, 'INTERNAL_SERVER_ERROR', 'Internal server error', 500);
};