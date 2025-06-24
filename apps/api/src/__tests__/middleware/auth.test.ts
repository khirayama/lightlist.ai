import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticateToken, optionalAuth, requireAuth, requireOwnership } from '../../middleware/auth';
import { generateAccessToken } from '../../utils/jwt';
import { createTestUser, getTestPrisma } from '../utils/test-helpers';
import { 
  cleanupTestDatabase, 
  teardownTestDatabase
} from '../setup';
import type { AuthenticatedRequest } from '../../types/auth';

describe('認証ミドルウェア', () => {
  const prisma = getTestPrisma();
  let testUser: any;
  let validToken: string;
  let testDeviceId: string;

  // Database setup is handled by setup.ts
  
  beforeEach(async () => {
    await cleanupTestDatabase();
    testUser = await createTestUser();
    testDeviceId = '550e8400-e29b-41d4-a716-446655440000'; // テスト用デバイスID
    validToken = generateAccessToken({
      userId: testUser.id,
      email: testUser.email,
      deviceId: testDeviceId,
    });

    // アクティブなリフレッシュトークンを作成
    await prisma.refreshToken.create({
      data: {
        userId: testUser.id,
        token: `refresh_token_${testUser.id}`,
        deviceId: testDeviceId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間後
        isActive: true,
      },
    });
  });

  // Global teardown
  afterAll(async () => {
    await teardownTestDatabase();
  });

  const createMockResponse = () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    return res;
  };

  const createMockNext = () => vi.fn() as NextFunction;

  describe('authenticateToken', () => {
    it('有効なBearerトークンでユーザーを認証すること', async () => {
      const req = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      } as AuthenticatedRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await authenticateToken(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.userId).toBe(testUser.id);
      expect(req.user?.email).toBe(testUser.email);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('認証ヘッダーなしのリクエストを拒否すること', async () => {
      const req = {
        headers: {},
      } as AuthenticatedRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await authenticateToken(req, res, next);

      expect(req.user).toBeUndefined();
      expect(req.userId).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access token is required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('不正な形式の認証ヘッダーのリクエストを拒否すること', async () => {
      const req = {
        headers: {
          authorization: 'InvalidFormat token',
        },
      } as AuthenticatedRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access token is required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('無効なトークンのリクエストを拒否すること', async () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid.token.here',
        },
      } as AuthenticatedRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired access token',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('ユーザーが存在しない場合にリクエストを拒否すること', async () => {
      // Create token for non-existent user
      const nonExistentUserToken = generateAccessToken({
        userId: 'non-existent-user-id',
        email: 'nonexistent@example.com',
      });

      const req = {
        headers: {
          authorization: `Bearer ${nonExistentUserToken}`,
        },
      } as AuthenticatedRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'User not found',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('データベースエラーを適切に処理すること', async () => {
      // Mock prisma to throw an error
      const originalFindUnique = prisma.user.findUnique;
      prisma.user.findUnique = vi.fn().mockRejectedValue(new Error('Database error'));

      const req = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      } as AuthenticatedRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error during authentication',
      });
      expect(next).not.toHaveBeenCalled();

      // Restore original function
      prisma.user.findUnique = originalFindUnique;
    });

    it('空のBearerトークンを処理すること', async () => {
      const req = {
        headers: {
          authorization: 'Bearer ',
        },
      } as AuthenticatedRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access token is required',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('有効なトークンでユーザーを認証すること', async () => {
      const req = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      } as AuthenticatedRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuth(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.userId).toBe(testUser.id);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('トークンが提供されない場合に認証なしで続行すること', async () => {
      const req = {
        headers: {},
      } as AuthenticatedRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(req.userId).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('トークンが無効な場合に認証なしで続行すること', async () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid.token',
        },
      } as AuthenticatedRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(req.userId).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('ユーザーが存在しない場合に認証なしで続行すること', async () => {
      const nonExistentUserToken = generateAccessToken({
        userId: 'non-existent-user-id',
        email: 'nonexistent@example.com',
      });

      const req = {
        headers: {
          authorization: `Bearer ${nonExistentUserToken}`,
        },
      } as AuthenticatedRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(req.userId).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('データベースエラー時に認証なしで続行すること', async () => {
      // Mock prisma to throw an error
      const originalFindUnique = prisma.user.findUnique;
      prisma.user.findUnique = vi.fn().mockRejectedValue(new Error('Database error'));

      const req = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      } as AuthenticatedRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(req.userId).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();

      // Restore original function
      prisma.user.findUnique = originalFindUnique;
    });
  });

  describe('requireOwnership', () => {
    it('ユーザーIDが一致する場合にアクセスを許可すること', () => {
      const req = {
        params: { userId: testUser.id },
        userId: testUser.id,
        user: testUser,
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();
      const next = createMockNext();

      requireOwnership(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('ユーザーIDが一致しない場合にアクセスを拒否すること', () => {
      const req = {
        params: { userId: 'different-user-id' },
        userId: testUser.id,
        user: testUser,
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();
      const next = createMockNext();

      requireOwnership(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied: You can only access your own resources',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('ユーザーが認証されていない場合にアクセスを拒否すること', () => {
      const req = {
        params: { userId: testUser.id },
        // No userId or user properties
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();
      const next = createMockNext();

      requireOwnership(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('パラメータにuserIDが不足している場合を処理すること', () => {
      const req = {
        params: {}, // No userId in params
        userId: testUser.id,
        user: testUser,
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();
      const next = createMockNext();

      requireOwnership(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied: You can only access your own resources',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAuth', () => {
    it('ユーザーが認証されている場合にアクセスを許可すること', () => {
      const req = {
        userId: testUser.id,
        user: testUser,
      } as AuthenticatedRequest;
      const res = createMockResponse();
      const next = createMockNext();

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('userIDが不足している場合にアクセスを拒否すること', () => {
      const req = {
        user: testUser,
        // No userId
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();
      const next = createMockNext();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('ユーザーが不足している場合にアクセスを拒否すること', () => {
      const req = {
        userId: testUser.id,
        // No user
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();
      const next = createMockNext();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('userIDとユーザーの両方が不足している場合にアクセスを拒否すること', () => {
      const req = {} as AuthenticatedRequest;
      const res = createMockResponse();
      const next = createMockNext();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('統合テスト', () => {
    it('ミドルウェアチェーンで動作すること', async () => {
      const req = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        params: { userId: testUser.id },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();
      const next1 = createMockNext();
      const next2 = createMockNext();
      const next3 = createMockNext();

      // Simulate middleware chain: authenticateToken -> requireAuth -> requireOwnership
      await authenticateToken(req, res, next1);
      expect(next1).toHaveBeenCalled();
      expect(req.user).toBeDefined();

      requireAuth(req, res, next2);
      expect(next2).toHaveBeenCalled();

      requireOwnership(req, res, next3);
      expect(next3).toHaveBeenCalled();

      expect(res.status).not.toHaveBeenCalled();
    });

    it('認証ステップでミドルウェアチェーンが失敗すること', async () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid.token',
        },
        params: { userId: testUser.id },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();
      const next1 = createMockNext();
      const next2 = createMockNext();

      // Chain should stop at first middleware
      await authenticateToken(req, res, next1);
      expect(next1).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);

      // Subsequent middleware should not be called in real scenario
      // but we test them to ensure they would fail appropriately
      requireAuth(req, res, next2);
      expect(next2).not.toHaveBeenCalled();
    });

    it('所有権ステップでミドルウェアチェーンが失敗すること', async () => {
      const req = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        params: { userId: 'different-user-id' },
      } as unknown as AuthenticatedRequest;
      const res = createMockResponse();
      const next1 = createMockNext();
      const next2 = createMockNext();
      const next3 = createMockNext();

      // Authentication should succeed
      await authenticateToken(req, res, next1);
      expect(next1).toHaveBeenCalled();
      expect(req.user).toBeDefined();

      // RequireAuth should succeed
      requireAuth(req, res, next2);
      expect(next2).toHaveBeenCalled();

      // RequireOwnership should fail
      requireOwnership(req, res, next3);
      expect(next3).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});