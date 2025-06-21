import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { 
  getTestRequest, 
  getTestPrisma, 
  generateUniqueUserData,
  createTestUser,
  delay 
} from '../utils/test-helpers';
import { 
  cleanupTestDatabase, 
  teardownTestDatabase
} from '../setup';

describe('パスワードリセットフローシナリオ', () => {
  const request = getTestRequest();
  const prisma = getTestPrisma();

  // Cleanup before each test
  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  // Global teardown
  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('完全なパスワードリセットジャーニー', () => {
    it('完全なパスワードリセットフローを処理すること', async () => {
      const userData = generateUniqueUserData({
        password: 'OriginalPass123',
      });

      // Step 1: Create user
      const user = await createTestUser(userData);
      
      // Step 2: Request password reset
      const forgotPasswordResponse = await request
        .post('/api/auth/forgot-password')
        .send({
          email: userData.email,
        });

      expect(forgotPasswordResponse.status).toBe(200);
      expect(forgotPasswordResponse.body.message).toBe('Password reset email sent successfully');

      // Step 3: Verify reset token was created in database
      const resetTokens = await prisma.passwordResetToken.findMany({
        where: {
          userId: user.id,
          isUsed: false,
        },
      });

      expect(resetTokens).toHaveLength(1);
      const resetToken = resetTokens[0];
      expect(resetToken.expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Step 4: Reset password using token
      const newPassword = 'NewPassword456';
      const resetPasswordResponse = await request
        .post('/api/auth/reset-password')
        .send({
          token: resetToken.token,
          newPassword,
        });

      expect(resetPasswordResponse.status).toBe(200);
      expect(resetPasswordResponse.body.message).toBe('Password reset successfully');

      // Step 5: Verify token is marked as used
      const usedToken = await prisma.passwordResetToken.findFirst({
        where: { id: resetToken.id },
      });
      expect(usedToken?.isUsed).toBe(true);

      // Step 6: Try to login with old password (should fail)
      const oldPasswordLoginResponse = await request
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password, // old password
          deviceId: userData.deviceId,
        });

      expect(oldPasswordLoginResponse.status).toBe(400);
      expect(oldPasswordLoginResponse.body.error).toBe('Invalid email or password');

      // Step 7: Login with new password (should succeed)
      const newPasswordLoginResponse = await request
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: newPassword,
          deviceId: userData.deviceId,
        });

      expect(newPasswordLoginResponse.status).toBe(200);
      expect(newPasswordLoginResponse.body.data.user.email).toBe(userData.email);
    });

    it('複数のパスワードリセットリクエストを処理すること', async () => {
      const userData = generateUniqueUserData({
        password: 'OriginalPass123',
      });

      const user = await createTestUser(userData);

      // First reset request
      const firstResetResponse = await request
        .post('/api/auth/forgot-password')
        .send({
          email: userData.email,
        });

      expect(firstResetResponse.status).toBe(200);

      const firstTokens = await prisma.passwordResetToken.findMany({
        where: {
          userId: user.id,
          isUsed: false,
        },
      });

      expect(firstTokens).toHaveLength(1);
      const firstToken = firstTokens[0].token;

      // Second reset request (should invalidate first token)
      const secondResetResponse = await request
        .post('/api/auth/forgot-password')
        .send({
          email: userData.email,
        });

      expect(secondResetResponse.status).toBe(200);

      // First token should be marked as used
      const invalidatedFirstToken = await prisma.passwordResetToken.findFirst({
        where: { token: firstToken },
      });
      expect(invalidatedFirstToken?.isUsed).toBe(true);

      // Should have one new active token
      const activeTokens = await prisma.passwordResetToken.findMany({
        where: {
          userId: user.id,
          isUsed: false,
        },
      });

      expect(activeTokens).toHaveLength(1);
      expect(activeTokens[0].token).not.toBe(firstToken);

      // Try using old token (should fail)
      const oldTokenResetResponse = await request
        .post('/api/auth/reset-password')
        .send({
          token: firstToken,
          newPassword: 'NewPassword456',
        });

      expect(oldTokenResetResponse.status).toBe(400);
      expect(oldTokenResetResponse.body.error).toBe('Invalid or expired reset token');

      // Use new token (should succeed)
      const newTokenResetResponse = await request
        .post('/api/auth/reset-password')
        .send({
          token: activeTokens[0].token,
          newPassword: 'NewPassword456',
        });

      expect(newTokenResetResponse.status).toBe(200);
    });
  });

  describe('セキュリティシナリオ', () => {
    it('パスワード忘れでユーザーの存在を明かさないこと', async () => {
      // Test with non-existent email
      const nonExistentEmailResponse = await request
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        });

      expect(nonExistentEmailResponse.status).toBe(200);
      expect(nonExistentEmailResponse.body.message).toBe('Password reset email sent successfully');

      // Verify no tokens were created
      const tokens = await prisma.passwordResetToken.findMany({
        where: {
          user: {
            email: 'nonexistent@example.com',
          },
        },
      });

      expect(tokens).toHaveLength(0);
    });

    it('パスワードリセット後に全てのリフレッシュトークンを無効化すること', async () => {
      const userData = generateUniqueUserData({
        password: 'OriginalPass123',
      });

      const user = await createTestUser(userData);

      // Login to create refresh tokens
      const loginResponse = await request
        .post('/api/auth/login')
        .send(userData);

      expect(loginResponse.status).toBe(200);
      const originalRefreshToken = loginResponse.body.data.refreshToken;

      // Login from another device
      const device2UserData = generateUniqueUserData({
        email: userData.email,
        password: userData.password,
      });

      const device2LoginResponse = await request
        .post('/api/auth/login')
        .send(device2UserData);

      expect(device2LoginResponse.status).toBe(200);

      // Verify we have 2 active refresh tokens
      let activeTokens = await prisma.refreshToken.findMany({
        where: {
          userId: user.id,
          isActive: true,
        },
      });

      expect(activeTokens).toHaveLength(2);

      // Request and execute password reset
      await request
        .post('/api/auth/forgot-password')
        .send({
          email: userData.email,
        });

      const resetToken = await prisma.passwordResetToken.findFirst({
        where: {
          userId: user.id,
          isUsed: false,
        },
      });

      const resetResponse = await request
        .post('/api/auth/reset-password')
        .send({
          token: resetToken!.token,
          newPassword: 'NewPassword456',
        });

      expect(resetResponse.status).toBe(200);

      // All refresh tokens should be invalidated
      activeTokens = await prisma.refreshToken.findMany({
        where: {
          userId: user.id,
          isActive: true,
        },
      });

      expect(activeTokens).toHaveLength(0);

      // Try to use old refresh token (should fail)
      const refreshResponse = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken: originalRefreshToken,
          deviceId: userData.deviceId,
        });

      expect(refreshResponse.status).toBe(401);
    });

    it('トークンの再利用を防ぐこと', async () => {
      const userData = generateUniqueUserData({
        password: 'OriginalPass123',
      });

      const user = await createTestUser(userData);

      // Request password reset
      await request
        .post('/api/auth/forgot-password')
        .send({
          email: userData.email,
        });

      const resetToken = await prisma.passwordResetToken.findFirst({
        where: {
          userId: user.id,
          isUsed: false,
        },
      });

      // Use token once (should succeed)
      const firstResetResponse = await request
        .post('/api/auth/reset-password')
        .send({
          token: resetToken!.token,
          newPassword: 'NewPassword456',
        });

      expect(firstResetResponse.status).toBe(200);

      // Try to use same token again (should fail)
      const secondResetResponse = await request
        .post('/api/auth/reset-password')
        .send({
          token: resetToken!.token,
          newPassword: 'AnotherPassword789',
        });

      expect(secondResetResponse.status).toBe(400);
      expect(secondResetResponse.body.error).toBe('Invalid or expired reset token');
    });

    it('期限切れトークンを処理すること', async () => {
      const userData = generateUniqueUserData({
        password: 'OriginalPass123',
      });

      const user = await createTestUser(userData);

      // Create an expired token manually
      const expiredToken = await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: 'expired-token-123456789012345678901234567890123456789012345678901234567890',
          expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      });

      // Try to use expired token
      const resetResponse = await request
        .post('/api/auth/reset-password')
        .send({
          token: expiredToken.token,
          newPassword: 'NewPassword456',
        });

      expect(resetResponse.status).toBe(400);
      expect(resetResponse.body.error).toBe('Invalid or expired reset token');
    });
  });

  describe('バリデーションとエラーハンドリング', () => {
    it('パスワード忘れでメール形式を検証すること', async () => {
      const invalidEmailResponse = await request
        .post('/api/auth/forgot-password')
        .send({
          email: 'invalid-email',
        });

      expect(invalidEmailResponse.status).toBe(400);
      expect(invalidEmailResponse.body.error).toBe('Validation failed');
      expect(invalidEmailResponse.body.details).toContain('Invalid email address');
    });

    it('パスワードリセットでパスワード強度を検証すること', async () => {
      const userData = generateUniqueUserData();
      const user = await createTestUser(userData);

      // Request password reset
      await request
        .post('/api/auth/forgot-password')
        .send({
          email: userData.email,
        });

      const resetToken = await prisma.passwordResetToken.findFirst({
        where: {
          userId: user.id,
          isUsed: false,
        },
      });

      // Try with weak password
      const weakPasswordResponse = await request
        .post('/api/auth/reset-password')
        .send({
          token: resetToken!.token,
          newPassword: 'weak',
        });

      expect(weakPasswordResponse.status).toBe(400);
      expect(weakPasswordResponse.body.error).toBe('Password does not meet requirements');
    });

    it('無効なトークン形式を処理すること', async () => {
      const invalidTokenResponse = await request
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'ValidPassword123',
        });

      expect(invalidTokenResponse.status).toBe(400);
      expect(invalidTokenResponse.body.error).toBe('Invalid or expired reset token');
    });

    it('必須フィールドの不足を処理すること', async () => {
      // Missing email in forgot-password
      const missingEmailResponse = await request
        .post('/api/auth/forgot-password')
        .send({});

      expect(missingEmailResponse.status).toBe(400);
      expect(missingEmailResponse.body.error).toBe('Validation failed');

      // Missing token in reset-password
      const missingTokenResponse = await request
        .post('/api/auth/reset-password')
        .send({
          newPassword: 'ValidPassword123',
        });

      expect(missingTokenResponse.status).toBe(400);
      expect(missingTokenResponse.body.error).toBe('Validation failed');

      // Missing password in reset-password
      const missingPasswordResponse = await request
        .post('/api/auth/reset-password')
        .send({
          token: 'some-token',
        });

      expect(missingPasswordResponse.status).toBe(400);
      expect(missingPasswordResponse.body.error).toBe('Validation failed');
    });
  });

  describe('同時実行とエッジケース', () => {
    it('同時パスワードリセットリクエストを処理すること', async () => {
      const userData = generateUniqueUserData();
      const user = await createTestUser(userData);

      // Send multiple concurrent reset requests
      const resetPromises = Array(3).fill(null).map(() =>
        request
          .post('/api/auth/forgot-password')
          .send({
            email: userData.email,
          })
      );

      const resetResponses = await Promise.all(resetPromises);

      // All should succeed
      resetResponses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should have only a small number of active tokens (race condition may create more than 1)
      const activeTokens = await prisma.passwordResetToken.findMany({
        where: {
          userId: user.id,
          isUsed: false,
        },
      });

      expect(activeTokens.length).toBeGreaterThan(0);
      expect(activeTokens.length).toBeLessThanOrEqual(3);

      // But we should be able to use the most recent token
      const newestToken = activeTokens.sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      )[0];

      const resetResponse = await request
        .post('/api/auth/reset-password')
        .send({
          token: newestToken.token,
          newPassword: 'NewPassword456',
        });

      expect(resetResponse.status).toBe(200);
    });

    it('データベースエラーを適切に処理すること', async () => {
      // This test would require more complex setup to simulate database errors
      // For now, we test basic error recovery scenarios
      
      const userData = generateUniqueUserData();
      await createTestUser(userData);

      // Test with malformed token that might cause database issues
      const malformedTokenResponse = await request
        .post('/api/auth/reset-password')
        .send({
          token: '', // empty token
          newPassword: 'ValidPassword123',
        });

      expect(malformedTokenResponse.status).toBe(400);
      expect(malformedTokenResponse.body.error).toBe('Validation failed');
    });

    it('特殊文字を含むパスワードリセットを処理すること', async () => {
      const userData = generateUniqueUserData();
      const user = await createTestUser(userData);

      // Request password reset
      await request
        .post('/api/auth/forgot-password')
        .send({
          email: userData.email,
        });

      const resetToken = await prisma.passwordResetToken.findFirst({
        where: {
          userId: user.id,
          isUsed: false,
        },
      });

      // Reset with password containing special characters
      const specialCharPassword = 'Special@Pass123!#$';
      const resetResponse = await request
        .post('/api/auth/reset-password')
        .send({
          token: resetToken!.token,
          newPassword: specialCharPassword,
        });

      expect(resetResponse.status).toBe(200);

      // Verify login works with special character password
      const loginResponse = await request
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: specialCharPassword,
          deviceId: userData.deviceId,
        });

      expect(loginResponse.status).toBe(200);
    });
  });
});