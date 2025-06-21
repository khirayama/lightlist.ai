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

describe('Auth Middleware', () => {
  const prisma = getTestPrisma();
  let testUser: any;
  let validToken: string;

  // Database setup is handled by setup.ts
  
  beforeEach(async () => {
    await cleanupTestDatabase();
    testUser = await createTestUser();
    validToken = generateAccessToken({
      userId: testUser.id,
      email: testUser.email,
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
    it('should authenticate user with valid Bearer token', async () => {
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

    it('should reject request without authorization header', async () => {
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

    it('should reject request with malformed authorization header', async () => {
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

    it('should reject request with invalid token', async () => {
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

    it('should reject request when user does not exist', async () => {
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

    it('should handle database errors gracefully', async () => {
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

    it('should handle empty Bearer token', async () => {
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
    it('should authenticate user with valid token', async () => {
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

    it('should continue without authentication when no token provided', async () => {
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

    it('should continue without authentication when token is invalid', async () => {
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

    it('should continue without authentication when user does not exist', async () => {
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

    it('should continue without authentication on database error', async () => {
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
    it('should allow access when user ID matches', () => {
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

    it('should deny access when user ID does not match', () => {
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

    it('should deny access when user is not authenticated', () => {
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

    it('should handle missing userId in params', () => {
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
    it('should allow access when user is authenticated', () => {
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

    it('should deny access when userId is missing', () => {
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

    it('should deny access when user is missing', () => {
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

    it('should deny access when both userId and user are missing', () => {
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

  describe('Integration Tests', () => {
    it('should work with middleware chain', async () => {
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

    it('should fail middleware chain at authentication step', async () => {
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

    it('should fail middleware chain at ownership step', async () => {
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