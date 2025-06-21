import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  createPasswordResetToken,
  validatePasswordResetToken,
  markPasswordResetTokenAsUsed,
  cleanupExpiredPasswordResetTokens,
  getUserActiveResetTokenCount,
} from '../../utils/password-reset';
import { PASSWORD_RESET_TOKEN_EXPIRY_MS } from '../../utils/jwt';
import { 
  getTestPrisma, 
  createTestUser,
  generateUniqueUserData 
} from '../utils/test-helpers';
import { 
  cleanupTestDatabase, 
  teardownTestDatabase
} from '../setup';

describe('Password Reset Utils', () => {
  const prisma = getTestPrisma();

  // Cleanup before each test
  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  // Global teardown
  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('createPasswordResetToken', () => {
    it('should create a valid password reset token', async () => {
      const userData = generateUniqueUserData();
      const user = await createTestUser(userData);

      const token = await createPasswordResetToken(prisma, user.id);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes * 2 (hex encoding)

      // Verify token was saved in database
      const dbToken = await prisma.passwordResetToken.findFirst({
        where: { token },
      });

      expect(dbToken).toBeDefined();
      expect(dbToken?.userId).toBe(user.id);
      expect(dbToken?.isUsed).toBe(false);
      expect(dbToken?.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(dbToken?.expiresAt.getTime()).toBeLessThanOrEqual(
        Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MS
      );
    });

    it('should invalidate existing tokens when creating new one', async () => {
      const userData = generateUniqueUserData();
      const user = await createTestUser(userData);

      // Create first token
      const firstToken = await createPasswordResetToken(prisma, user.id);
      
      // Verify first token exists and is active
      let firstDbToken = await prisma.passwordResetToken.findFirst({
        where: { token: firstToken },
      });
      expect(firstDbToken?.isUsed).toBe(false);

      // Create second token
      const secondToken = await createPasswordResetToken(prisma, user.id);

      // First token should be marked as used
      firstDbToken = await prisma.passwordResetToken.findFirst({
        where: { token: firstToken },
      });
      expect(firstDbToken?.isUsed).toBe(true);

      // Second token should be active
      const secondDbToken = await prisma.passwordResetToken.findFirst({
        where: { token: secondToken },
      });
      expect(secondDbToken?.isUsed).toBe(false);

      // Tokens should be different
      expect(firstToken).not.toBe(secondToken);
    });

    it('should only invalidate unused tokens', async () => {
      const userData = generateUniqueUserData();
      const user = await createTestUser(userData);

      // Create and manually mark first token as used
      const firstToken = await createPasswordResetToken(prisma, user.id);
      await markPasswordResetTokenAsUsed(prisma, firstToken);

      // Create expired token manually
      const expiredToken = await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: 'expired-token-' + '0'.repeat(50),
          expiresAt: new Date(Date.now() - 60000), // 1 minute ago
          isUsed: false,
        },
      });

      // Create new token
      const newToken = await createPasswordResetToken(prisma, user.id);

      // Verify states
      const firstDbToken = await prisma.passwordResetToken.findFirst({
        where: { token: firstToken },
      });
      expect(firstDbToken?.isUsed).toBe(true); // Should remain used

      const expiredDbToken = await prisma.passwordResetToken.findFirst({
        where: { token: expiredToken.token },
      });
      expect(expiredDbToken?.isUsed).toBe(true); // Should be marked as used (expired but unused)

      const newDbToken = await prisma.passwordResetToken.findFirst({
        where: { token: newToken },
      });
      expect(newDbToken?.isUsed).toBe(false); // Should be active
    });

    it('should generate unique tokens', async () => {
      const userData1 = generateUniqueUserData();
      const userData2 = generateUniqueUserData();
      const user1 = await createTestUser(userData1);
      const user2 = await createTestUser(userData2);

      const token1 = await createPasswordResetToken(prisma, user1.id);
      const token2 = await createPasswordResetToken(prisma, user2.id);
      const token3 = await createPasswordResetToken(prisma, user1.id);

      expect(token1).not.toBe(token2);
      expect(token1).not.toBe(token3);
      expect(token2).not.toBe(token3);
    });
  });

  describe('validatePasswordResetToken', () => {
    it('should validate valid token', async () => {
      const userData = generateUniqueUserData();
      const user = await createTestUser(userData);

      const token = await createPasswordResetToken(prisma, user.id);
      const validation = await validatePasswordResetToken(prisma, token);

      expect(validation.isValid).toBe(true);
      expect(validation.userId).toBe(user.id);
      expect(validation.error).toBeUndefined();
    });

    it('should reject invalid token', async () => {
      const validation = await validatePasswordResetToken(prisma, 'invalid-token');

      expect(validation.isValid).toBe(false);
      expect(validation.userId).toBeUndefined();
      expect(validation.error).toBe('Invalid or expired reset token');
    });

    it('should reject used token', async () => {
      const userData = generateUniqueUserData();
      const user = await createTestUser(userData);

      const token = await createPasswordResetToken(prisma, user.id);
      await markPasswordResetTokenAsUsed(prisma, token);

      const validation = await validatePasswordResetToken(prisma, token);

      expect(validation.isValid).toBe(false);
      expect(validation.userId).toBeUndefined();
      expect(validation.error).toBe('Invalid or expired reset token');
    });

    it('should reject expired token', async () => {
      const userData = generateUniqueUserData();
      const user = await createTestUser(userData);

      // Create expired token manually
      const expiredToken = await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: 'expired-token-' + '0'.repeat(50),
          expiresAt: new Date(Date.now() - 60000), // 1 minute ago
          isUsed: false,
        },
      });

      const validation = await validatePasswordResetToken(prisma, expiredToken.token);

      expect(validation.isValid).toBe(false);
      expect(validation.userId).toBeUndefined();
      expect(validation.error).toBe('Invalid or expired reset token');
    });

    it('should handle database errors gracefully', async () => {
      // Test with empty token
      const validation = await validatePasswordResetToken(prisma, '');

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('Invalid or expired reset token');
    });
  });

  describe('markPasswordResetTokenAsUsed', () => {
    it('should mark token as used', async () => {
      const userData = generateUniqueUserData();
      const user = await createTestUser(userData);

      const token = await createPasswordResetToken(prisma, user.id);
      
      // Verify token is not used initially
      let dbToken = await prisma.passwordResetToken.findFirst({
        where: { token },
      });
      expect(dbToken?.isUsed).toBe(false);

      // Mark as used
      const result = await markPasswordResetTokenAsUsed(prisma, token);
      expect(result).toBe(true);

      // Verify token is now used
      dbToken = await prisma.passwordResetToken.findFirst({
        where: { token },
      });
      expect(dbToken?.isUsed).toBe(true);
    });

    it('should return false for invalid token', async () => {
      const result = await markPasswordResetTokenAsUsed(prisma, 'invalid-token');
      expect(result).toBe(false);
    });

    it('should return false for already used token', async () => {
      const userData = generateUniqueUserData();
      const user = await createTestUser(userData);

      const token = await createPasswordResetToken(prisma, user.id);
      
      // Mark as used first time
      const firstResult = await markPasswordResetTokenAsUsed(prisma, token);
      expect(firstResult).toBe(true);

      // Try to mark as used again
      const secondResult = await markPasswordResetTokenAsUsed(prisma, token);
      expect(secondResult).toBe(false);
    });
  });

  describe('cleanupExpiredPasswordResetTokens', () => {
    it('should remove expired tokens', async () => {
      const userData = generateUniqueUserData();
      const user = await createTestUser(userData);

      // Create valid token
      const validToken = await createPasswordResetToken(prisma, user.id);

      // Create expired tokens manually
      await prisma.passwordResetToken.createMany({
        data: [
          {
            userId: user.id,
            token: 'expired-token-1-' + '0'.repeat(46),
            expiresAt: new Date(Date.now() - 60000), // 1 minute ago
            isUsed: false,
          },
          {
            userId: user.id,
            token: 'expired-token-2-' + '0'.repeat(46),
            expiresAt: new Date(Date.now() - 120000), // 2 minutes ago
            isUsed: true, // this one is also expired but already used
          },
        ],
      });

      // Verify we have 3 tokens
      let allTokens = await prisma.passwordResetToken.findMany({
        where: { userId: user.id },
      });
      expect(allTokens).toHaveLength(3);

      // Cleanup expired tokens
      const cleanedCount = await cleanupExpiredPasswordResetTokens(prisma);
      expect(cleanedCount).toBe(2); // Both expired tokens should be removed

      // Verify only valid token remains
      allTokens = await prisma.passwordResetToken.findMany({
        where: { userId: user.id },
      });
      expect(allTokens).toHaveLength(1);
      expect(allTokens[0].token).toBe(validToken);
    });

    it('should return 0 when no expired tokens exist', async () => {
      const userData = generateUniqueUserData();
      const user = await createTestUser(userData);

      // Create only valid token
      await createPasswordResetToken(prisma, user.id);

      const cleanedCount = await cleanupExpiredPasswordResetTokens(prisma);
      expect(cleanedCount).toBe(0);
    });

    it('should handle empty database gracefully', async () => {
      const cleanedCount = await cleanupExpiredPasswordResetTokens(prisma);
      expect(cleanedCount).toBe(0);
    });
  });

  describe('getUserActiveResetTokenCount', () => {
    it('should return correct count of active tokens', async () => {
      const userData = generateUniqueUserData();
      const user = await createTestUser(userData);

      // Initially no tokens
      let count = await getUserActiveResetTokenCount(prisma, user.id);
      expect(count).toBe(0);

      // Create first token
      await createPasswordResetToken(prisma, user.id);
      count = await getUserActiveResetTokenCount(prisma, user.id);
      expect(count).toBe(1);

      // Create second token (should invalidate first)
      await createPasswordResetToken(prisma, user.id);
      count = await getUserActiveResetTokenCount(prisma, user.id);
      expect(count).toBe(1); // Still 1 because old one was invalidated
    });

    it('should not count used tokens', async () => {
      const userData = generateUniqueUserData();
      const user = await createTestUser(userData);

      const token = await createPasswordResetToken(prisma, user.id);
      
      let count = await getUserActiveResetTokenCount(prisma, user.id);
      expect(count).toBe(1);

      await markPasswordResetTokenAsUsed(prisma, token);
      
      count = await getUserActiveResetTokenCount(prisma, user.id);
      expect(count).toBe(0);
    });

    it('should not count expired tokens', async () => {
      const userData = generateUniqueUserData();
      const user = await createTestUser(userData);

      // Create expired token manually
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: 'expired-token-' + '0'.repeat(50),
          expiresAt: new Date(Date.now() - 60000), // 1 minute ago
          isUsed: false,
        },
      });

      const count = await getUserActiveResetTokenCount(prisma, user.id);
      expect(count).toBe(0);
    });

    it('should return 0 for non-existent user', async () => {
      const count = await getUserActiveResetTokenCount(prisma, 'non-existent-user-id');
      expect(count).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete token lifecycle', async () => {
      const userData = generateUniqueUserData();
      const user = await createTestUser(userData);

      // Step 1: Create token
      const token = await createPasswordResetToken(prisma, user.id);
      expect(token).toBeDefined();

      // Step 2: Validate token
      let validation = await validatePasswordResetToken(prisma, token);
      expect(validation.isValid).toBe(true);
      expect(validation.userId).toBe(user.id);

      // Step 3: Check active count
      let count = await getUserActiveResetTokenCount(prisma, user.id);
      expect(count).toBe(1);

      // Step 4: Use token
      const markResult = await markPasswordResetTokenAsUsed(prisma, token);
      expect(markResult).toBe(true);

      // Step 5: Validate used token (should fail)
      validation = await validatePasswordResetToken(prisma, token);
      expect(validation.isValid).toBe(false);

      // Step 6: Check active count (should be 0)
      count = await getUserActiveResetTokenCount(prisma, user.id);
      expect(count).toBe(0);
    });

    it('should handle token replacement scenario', async () => {
      const userData = generateUniqueUserData();
      const user = await createTestUser(userData);

      // Create first token
      const firstToken = await createPasswordResetToken(prisma, user.id);
      let count = await getUserActiveResetTokenCount(prisma, user.id);
      expect(count).toBe(1);

      // Create second token (should replace first)
      const secondToken = await createPasswordResetToken(prisma, user.id);
      count = await getUserActiveResetTokenCount(prisma, user.id);
      expect(count).toBe(1);

      // First token should be invalid
      const firstValidation = await validatePasswordResetToken(prisma, firstToken);
      expect(firstValidation.isValid).toBe(false);

      // Second token should be valid
      const secondValidation = await validatePasswordResetToken(prisma, secondToken);
      expect(secondValidation.isValid).toBe(true);
      expect(secondValidation.userId).toBe(user.id);
    });
  });
});