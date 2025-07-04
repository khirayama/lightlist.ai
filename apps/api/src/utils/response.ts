import { Response } from 'express';
import { ApiResponse, ApiError } from '@/types';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string,
  statusCode: number = 200
): void => {
  const response: ApiResponse<T> = {
    data,
    message,
  };
  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  error: string,
  message: string,
  statusCode: number = 500
): void => {
  const response: ApiError = {
    error,
    message,
  };
  res.status(statusCode).json(response);
};