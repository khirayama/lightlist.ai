import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { JwtPayload } from '@/shared/types';
import { sendError } from '@/shared/utils/response';

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
    console.error('JWT verification failed:', {
      error: error instanceof Error ? error.message : String(error),
      tokenLength: token.length,
      tokenStart: token.substring(0, 50) + '...',
      timestamp: new Date().toISOString()
    });
    next(error);
  }
};