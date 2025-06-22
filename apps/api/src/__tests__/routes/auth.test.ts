import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { 
  cleanupTestDatabase, 
  teardownTestDatabase,
  getTestPrismaClient
} from '../setup';
import { 
  getTestRequest, 
  getTestPrisma, 
  createTestUser, 
  createAuthenticatedUser,
  generateAuthHeader,
  createMultipleDevicesForUser,
  generateUniqueUserData,
  delay 
} from '../utils/test-helpers';
import { verifyPassword } from '../../utils/password';
import { optimizedTestVerifyPassword } from '../../utils/password-test';
import { verifyAccessToken, verifyRefreshToken } from '../../utils/jwt';

describe('認証ルート', () => {
  const request = getTestRequest();
  const prisma = getTestPrisma();

  // Database setup is handled by setup.ts

  // Cleanup before each test
  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  // Global teardown
  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('新しいユーザーを正常に登録すること', async () => {
      const userData = generateUniqueUserData();
      
      const response = await request
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.expiresIn).toBe(3600000); // 1 hour
      expect(response.body.data.refreshExpiresIn).toBe(31536000000); // 1 year

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: userData.email },
      });
      expect(user).toBeDefined();
      expect(user?.email).toBe(userData.email);

      // Verify password was hashed
      const isPasswordHashed = await optimizedTestVerifyPassword(userData.password, user!.password);
      expect(isPasswordHashed).toBe(true);

      // Verify default App and Settings were created
      const app = await prisma.app.findUnique({
        where: { userId: user!.id },
      });
      expect(app).toBeDefined();
      expect(app?.taskInsertPosition).toBe('top');
      expect(app?.autoSort).toBe(false);

      const settings = await prisma.settings.findUnique({
        where: { userId: user!.id },
      });
      expect(settings).toBeDefined();
      expect(settings?.theme).toBe('system');
      expect(settings?.language).toBe('ja');

      // Verify refresh token was saved
      const refreshToken = await prisma.refreshToken.findFirst({
        where: { 
          userId: user!.id,
          deviceId: userData.deviceId,
        },
      });
      expect(refreshToken).toBeDefined();
      expect(refreshToken?.isActive).toBe(true);
    });

    it('重複したメールでの登録を拒否すること', async () => {
      const userData = generateUniqueUserData();
      
      // Create user first
      await createTestUser(userData);

      // Try to register again with same email
      const response = await request
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User already exists with this email');
    });

    it('無効なメールでの登録を拒否すること', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'ValidPass123',
        deviceId: '550e8400-e29b-41d4-a716-446655440001'
      };
      
      const response = await request
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContain('Invalid email address');
    });

    it('弱いパスワードでの登録を拒否すること', async () => {
      const userData = generateUniqueUserData({
        password: 'weak'
      });
      
      const response = await request
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password does not meet requirements');
      expect(response.body.details).toBeDefined();
      expect(response.body.details.length).toBeGreaterThan(0);
    });

    it('無効なデバイスIDでの登録を拒否すること', async () => {
      const userData = {
        email: 'valid@example.com',
        password: 'ValidPass123',
        deviceId: 'invalid'
      };
      
      const response = await request
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContain('Invalid device ID format');
    });

    it('フィールド不足での登録を拒否すること', async () => {
      const response = await request
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          // Missing password and deviceId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('ランダム文字列のデバイスID形式を受け入れること', async () => {
      const userData = generateUniqueUserData({
        deviceId: 'abc123def456ghi789jkl012mno345pqr',
      });
      
      const response = await request
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.data.user.email).toBe(userData.email);
    });
  });

  describe('POST /api/auth/login', () => {
    it('正しい認証情報で正常にログインすること', async () => {
      const userData = generateUniqueUserData();
      await createTestUser(userData);

      const response = await request
        .post('/api/auth/login')
        .send(userData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      // Verify tokens are valid
      const accessTokenPayload = verifyAccessToken(response.body.data.token);
      expect(accessTokenPayload).toBeDefined();
      expect(accessTokenPayload?.email).toBe(userData.email);

      const refreshTokenPayload = verifyRefreshToken(response.body.data.refreshToken);
      expect(refreshTokenPayload).toBeDefined();
      expect(refreshTokenPayload?.deviceId).toBe(userData.deviceId);
    });

    it('間違ったメールでのログインを拒否すること', async () => {
      const userData = generateUniqueUserData();
      await createTestUser(userData);

      const response = await request
        .post('/api/auth/login')
        .send({
          ...userData,
          email: 'wrong@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('間違ったパスワードでのログインを拒否すること', async () => {
      const userData = generateUniqueUserData();
      await createTestUser(userData);

      const response = await request
        .post('/api/auth/login')
        .send({
          ...userData,
          password: 'WrongPassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('複数デバイスのログインを処理すること', async () => {
      const userData = generateUniqueUserData();
      const user = await createTestUser(userData);

      // Login from first device
      const device1Response = await request
        .post('/api/auth/login')
        .send(userData);

      expect(device1Response.status).toBe(200);

      // Login from second device with different device ID
      const device2UserData = generateUniqueUserData({
        email: userData.email,
        password: userData.password,
      });
      const device2Response = await request
        .post('/api/auth/login')
        .send(device2UserData);

      expect(device2Response.status).toBe(200);

      // Both refresh tokens should be active
      const activeTokens = await prisma.refreshToken.findMany({
        where: {
          userId: user.id,
          isActive: true,
        },
      });

      expect(activeTokens).toHaveLength(2);
    });

    it('再ログイン時に既存のデバイストークンを置き換えること', async () => {
      const userData = generateUniqueUserData();
      const user = await createTestUser(userData);

      // First login
      const firstLoginResponse = await request
        .post('/api/auth/login')
        .send(userData);

      expect(firstLoginResponse.status).toBe(200);
      const firstRefreshToken = firstLoginResponse.body.data.refreshToken;

      // Second login with same device
      const secondLoginResponse = await request
        .post('/api/auth/login')
        .send(userData);

      expect(secondLoginResponse.status).toBe(200);
      const secondRefreshToken = secondLoginResponse.body.data.refreshToken;

      expect(firstRefreshToken).not.toBe(secondRefreshToken);

      // Only one active token should exist for this device
      const activeTokens = await prisma.refreshToken.findMany({
        where: {
          userId: user.id,
          deviceId: userData.deviceId,
          isActive: true,
        },
      });

      expect(activeTokens).toHaveLength(1);
      expect(activeTokens[0]?.token).toBe(secondRefreshToken);
    });

    it('最大デバイス数制限を強制すること', async () => {
      const userData = generateUniqueUserData();
      const user = await createTestUser(userData);

      // Create 5 devices (maximum allowed)
      await createMultipleDevicesForUser(user, 5);

      // Try to login from 6th device with unique device ID
      const device6UserData = generateUniqueUserData({
        email: userData.email,
        password: userData.password,
      });
      const response = await request
        .post('/api/auth/login')
        .send(device6UserData);

      expect(response.status).toBe(200);

      // Should still have 5 active tokens (oldest one removed)
      const activeTokens = await prisma.refreshToken.findMany({
        where: {
          userId: user.id,
          isActive: true,
        },
      });

      expect(activeTokens).toHaveLength(5);
    });

    it('無効な入力形式でのログインを拒否すること', async () => {
      const response = await request
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: '',
          deviceId: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('リフレッシュトークンで正常にログアウトすること', async () => {
      const { user, tokens } = await createAuthenticatedUser();

      const response = await request
        .post('/api/auth/logout')
        .set(generateAuthHeader(tokens.token))
        .send({
          refreshToken: tokens.refreshToken,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout successful');

      // Verify refresh token was deactivated
      const refreshToken = await prisma.refreshToken.findFirst({
        where: {
          token: tokens.refreshToken,
        },
      });

      expect(refreshToken?.isActive).toBe(false);
    });

    it('デバイスIDで正常にログアウトすること', async () => {
      const { user, tokens, deviceId } = await createAuthenticatedUser();

      const response = await request
        .post('/api/auth/logout')
        .set(generateAuthHeader(tokens.token))
        .send({
          deviceId: deviceId,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout successful');

      // Verify all tokens for this device were deactivated
      const refreshTokens = await prisma.refreshToken.findMany({
        where: {
          userId: user.id,
          deviceId: deviceId,
        },
      });

      expect(refreshTokens.every(token => !token.isActive)).toBe(true);
    });

    it('認証を必要とすること', async () => {
      const response = await request
        .post('/api/auth/logout')
        .send({
          refreshToken: 'some-token',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token is required');
    });

    it('トークンやデバイスIDなしのログアウトを処理すること', async () => {
      const { tokens } = await createAuthenticatedUser();

      const response = await request
        .post('/api/auth/logout')
        .set(generateAuthHeader(tokens.token))
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout successful');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('トークンを正常にリフレッシュすること', async () => {
      const { user, tokens, deviceId } = await createAuthenticatedUser();

      // Add delay to ensure different timestamp in JWT
      await delay(1500);

      const response = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken: tokens.refreshToken,
          deviceId: deviceId,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.token).not.toBe(tokens.token);
      expect(response.body.data.refreshToken).not.toBe(tokens.refreshToken);

      // Verify new tokens are valid
      const newAccessTokenPayload = verifyAccessToken(response.body.data.token);
      expect(newAccessTokenPayload?.userId).toBe(user.id);

      const newRefreshTokenPayload = verifyRefreshToken(response.body.data.refreshToken);
      expect(newRefreshTokenPayload?.userId).toBe(user.id);
      expect(newRefreshTokenPayload?.deviceId).toBe(deviceId);

      // Verify old refresh token was deactivated
      const oldRefreshToken = await prisma.refreshToken.findFirst({
        where: { token: tokens.refreshToken },
      });
      expect(oldRefreshToken?.isActive).toBe(false);

      // Verify new refresh token was created
      const newRefreshToken = await prisma.refreshToken.findFirst({
        where: { token: response.body.data.refreshToken },
      });
      expect(newRefreshToken?.isActive).toBe(true);
    });

    it('無効なリフレッシュトークンを拒否すること', async () => {
      const response = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid.refresh.token',
          deviceId: '550e8400-e29b-41d4-a716-446655440001',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired refresh token');
    });

    it('データベースにないリフレッシュトークンを拒否すること', async () => {
      const { tokens, deviceId } = await createAuthenticatedUser();

      // Manually deactivate the refresh token
      await prisma.refreshToken.updateMany({
        where: { token: tokens.refreshToken },
        data: { isActive: false },
      });

      const response = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken: tokens.refreshToken,
          deviceId: deviceId,
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid refresh token');
    });

    it('デバイスIDの不一致を拒否すること', async () => {
      const { tokens } = await createAuthenticatedUser();

      // Create different device ID (generate a new UUID)
      const differentUserData = generateUniqueUserData();
      
      const response = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken: tokens.refreshToken,
          deviceId: differentUserData.deviceId, // Different device ID
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Device ID mismatch');
    });

    it('不正な形式のリクエストを拒否すること', async () => {
      const response = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken: '',
          deviceId: 'invalid-device-id',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('既存ユーザーのパスワード忘れを処理すること', async () => {
      const userData = generateUniqueUserData();
      await createTestUser(userData);

      const response = await request
        .post('/api/auth/forgot-password')
        .send({
          email: userData.email,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset email sent successfully');
    });

    it('存在しないユーザーのパスワード忘れを処理すること（セキュリティ）', async () => {
      const response = await request
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        });

      // Should return same response for security reasons
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset email sent successfully');
    });

    it('無効なメール形式を拒否すること', async () => {
      const response = await request
        .post('/api/auth/forgot-password')
        .send({
          email: 'invalid-email',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContain('Invalid email address');
    });

    it('メールの不足を拒否すること', async () => {
      const response = await request
        .post('/api/auth/forgot-password')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('パスワードリセットを拒否すること（未実装）', async () => {
      const response = await request
        .post('/api/auth/reset-password')
        .send({
          token: 'reset-token-123',
          newPassword: 'NewPassword123',
        });

      // Currently returns 400 as it's not fully implemented
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid or expired reset token');
    });

    it('弱いパスワードを拒否すること', async () => {
      const response = await request
        .post('/api/auth/reset-password')
        .send({
          token: 'reset-token-123',
          newPassword: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password does not meet requirements');
    });

    it('不正な形式のリクエストを拒否すること', async () => {
      const response = await request
        .post('/api/auth/reset-password')
        .send({
          token: '',
          newPassword: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('エラーハンドリングとエッジケース', () => {
    it('不正な形式のJSONを処理すること', async () => {
      const response = await request
        .post('/api/auth/register')
        .send('invalid-json')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(500);
    });

    it('非常に長い入力を処理すること', async () => {
      const veryLongString = 'a'.repeat(1000);
      
      const response = await request
        .post('/api/auth/register')
        .send({
          email: veryLongString + '@example.com',
          password: veryLongString,
          deviceId: veryLongString,
        });

      expect(response.status).toBe(400);
    });

    it('入力内の特殊文字を処理すること', async () => {
      const response = await request
        .post('/api/auth/register')
        .send({
          email: 'test+special@example.com',
          password: 'TestPass123!@#',
          deviceId: '550e8400-e29b-41d4-a716-446655440000',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.user.email).toBe('test+special@example.com');
    });

    it('同時リクエストを処理すること', async () => {
      const timestamp = Date.now();
      
      // Send multiple concurrent registration requests with unique emails and device IDs
      const promises = Array(3).fill(null).map((_, index) => {
        const userData = generateUniqueUserData({
          email: `concurrent${index}_${timestamp}@example.com`,
        });
        return request
          .post('/api/auth/register')
          .send(userData);
      });

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify all users were created
      const users = await prisma.user.findMany({
        where: {
          email: {
            startsWith: `concurrent`,
          },
        },
      });

      expect(users.length).toBeGreaterThanOrEqual(3);
    });
  });
});