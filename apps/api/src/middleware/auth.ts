import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { JwtPayload } from '@/types';
import { sendError } from '@/utils/response';

interface AuthenticatedRequest extends Request {
  userId?: string;
  email?: string;
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    sendError(res, 'MISSING_TOKEN', 'Access token is required', 401);
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.userId = decoded.userId;
    req.email = decoded.email;
    next();
  } catch (error) {
    next(error);
  }
};