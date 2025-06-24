import type { NextFunction, Response } from 'express';
import { getDatabase } from '../services/database';
import type { AuthenticatedRequest } from '../types/auth';
import { verifyAccessToken } from '../utils/jwt';

/**
 * JWTトークンからユーザー情報を抽出してリクエストオブジェクトに追加
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({
      error: 'Access token is required',
    });
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({
      error: 'Invalid or expired access token',
    });
    return;
  }

  try {
    const prisma = getDatabase();
    // データベースからユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(401).json({
        error: 'User not found',
      });
      return;
    }

    // デバイスのアクティブなリフレッシュトークンが存在するかチェック
    const activeRefreshToken = await prisma.refreshToken.findFirst({
      where: {
        userId: payload.userId,
        deviceId: payload.deviceId,
        isActive: true,
      },
    });

    if (!activeRefreshToken) {
      res.status(401).json({
        error: 'Device session is no longer active',
      });
      return;
    }

    // リクエストオブジェクトにユーザー情報を追加
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Internal server error during authentication',
    });
  }
}

/**
 * オプショナルな認証（トークンがあれば認証、なければスキップ）
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    next();
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    next();
    return;
  }

  try {
    const prisma = getDatabase();
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (user) {
      req.user = user;
      req.userId = user.id;
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next();
  }
}

/**
 * ユーザーIDのマッチングを検証（自分のリソースにのみアクセス可能）
 */
export function requireOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const requestedUserId = req.params.userId;
  const authenticatedUserId = req.userId;

  if (!authenticatedUserId) {
    res.status(401).json({
      error: 'Authentication required',
    });
    return;
  }

  if (requestedUserId !== authenticatedUserId) {
    res.status(403).json({
      error: 'Access denied: You can only access your own resources',
    });
    return;
  }

  next();
}

/**
 * 認証済みユーザーのみアクセス可能（単純な認証チェック）
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.userId || !req.user) {
    res.status(401).json({
      error: 'Authentication required',
    });
    return;
  }

  next();
}
