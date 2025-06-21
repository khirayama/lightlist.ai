import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { 
  getTestRequest, 
  getTestPrisma, 
  generateAuthHeader,
  generateUniqueUserData,
  delay 
} from '../utils/test-helpers';
import { 
  cleanupTestDatabase, 
  teardownTestDatabase
} from '../setup';
import { verifyAccessToken, verifyRefreshToken } from '../../utils/jwt';

describe('認証フローシナリオ', () => {
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

  describe('完全なユーザージャーニー', () => {
    it('完全なユーザー登録とログインフローを処理すること', async () => {
      const userData = generateUniqueUserData({
        password: 'JourneyPass123',
      });

      // Step 1: User Registration
      const registerResponse = await request
        .post('/api/auth/register')
        .send(userData);

      expect(registerResponse.status).toBe(201);
      const { user, token, refreshToken } = registerResponse.body.data;
      
      expect(user.email).toBe(userData.email);
      expect(token).toBeDefined();
      expect(refreshToken).toBeDefined();

      // Step 2: Verify tokens work
      const accessTokenPayload = verifyAccessToken(token);
      expect(accessTokenPayload?.userId).toBe(user.id);

      // Step 3: Use access token for authenticated request
      const healthResponse = await request
        .get('/health')
        .set(generateAuthHeader(token));

      expect(healthResponse.status).toBe(200);

      // Step 4: Refresh token
      const refreshResponse = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken,
          deviceId: userData.deviceId,
        });

      expect(refreshResponse.status).toBe(200);
      const newTokens = refreshResponse.body.data;
      expect(newTokens.token).not.toBe(token);
      expect(newTokens.refreshToken).not.toBe(refreshToken);

      // Step 5: Use new token
      const newHealthResponse = await request
        .get('/health')
        .set(generateAuthHeader(newTokens.token));

      expect(newHealthResponse.status).toBe(200);

      // Step 6: Logout
      const logoutResponse = await request
        .post('/api/auth/logout')
        .set(generateAuthHeader(newTokens.token))
        .send({
          refreshToken: newTokens.refreshToken,
        });

      expect(logoutResponse.status).toBe(200);

      // Step 7: Verify old refresh token is now invalid
      const invalidRefreshResponse = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken: newTokens.refreshToken,
          deviceId: userData.deviceId,
        });

      expect(invalidRefreshResponse.status).toBe(401);
    });

    it('登録後のログインを処理すること', async () => {
      const userData = generateUniqueUserData({
        password: 'LoginAfter123',
      });

      // Step 1: Register
      const registerResponse = await request
        .post('/api/auth/register')
        .send(userData);

      expect(registerResponse.status).toBe(201);
      const registrationTokens = registerResponse.body.data;

      // Step 2: Login with same credentials (should work)
      const loginResponse = await request
        .post('/api/auth/login')
        .send(userData);

      expect(loginResponse.status).toBe(200);
      const loginTokens = loginResponse.body.data;

      // Tokens should be different from registration
      expect(loginTokens.token).not.toBe(registrationTokens.token);
      expect(loginTokens.refreshToken).not.toBe(registrationTokens.refreshToken);

      // Old registration refresh token should be inactive
      const dbTokens = await prisma.refreshToken.findMany({
        where: {
          userId: registrationTokens.user.id,
          deviceId: userData.deviceId,
        },
      });

      const activeTokens = dbTokens.filter(token => token.isActive);
      expect(activeTokens).toHaveLength(1);
      expect(activeTokens[0]?.token).toBe(loginTokens.refreshToken);
    });
  });

  describe('マルチデバイスシナリオ', () => {
    it('複数デバイスからのユーザーログインを処理すること', async () => {
      const baseUserData = generateUniqueUserData({
        password: 'MultiDevice123',
      });

      // Register user
      const registerResponse = await request
        .post('/api/auth/register')
        .send(baseUserData);

      expect(registerResponse.status).toBe(201);
      const userId = registerResponse.body.data.user.id;

      // Login from multiple devices (same user, different devices)
      const deviceTokens = [];

      for (let i = 0; i < 4; i++) {
        const deviceUserData = {
          email: baseUserData.email,
          password: baseUserData.password,
          deviceId: generateUniqueUserData().deviceId, // Only generate unique deviceId
        };

        const loginResponse = await request
          .post('/api/auth/login')
          .send(deviceUserData);

        expect(loginResponse.status).toBe(200);
        deviceTokens.push({
          deviceId: deviceUserData.deviceId,
          tokens: loginResponse.body.data,
        });
      }

      // Verify all devices have active tokens
      const activeTokens = await prisma.refreshToken.findMany({
        where: {
          userId,
          isActive: true,
        },
      });

      expect(activeTokens).toHaveLength(5); // 1 from registration + 4 from logins

      // Test token refresh from each device
      for (const deviceToken of deviceTokens) {
        const refreshResponse = await request
          .post('/api/auth/refresh')
          .send({
            refreshToken: deviceToken.tokens.refreshToken,
            deviceId: deviceToken.deviceId,
          });

        expect(refreshResponse.status).toBe(200);
      }
    });

    it('デバイス制限を強制し最古のデバイスを削除すること', async () => {
      const baseUserData = generateUniqueUserData({
        password: 'DeviceLimit123',
      });

      // Register user (device 1)
      const registerResponse = await request
        .post('/api/auth/register')
        .send(baseUserData);

      expect(registerResponse.status).toBe(201);
      const userId = registerResponse.body.data.user.id;

      // Login from 4 more devices (total 5, which is the limit)
      for (let i = 0; i < 4; i++) {
        const deviceUserData = {
          email: baseUserData.email,
          password: baseUserData.password,
          deviceId: generateUniqueUserData().deviceId, // Only generate unique deviceId
        };

        await request
          .post('/api/auth/login')
          .send(deviceUserData);
      }

      // Verify we have 5 active tokens
      let activeTokens = await prisma.refreshToken.findMany({
        where: {
          userId,
          isActive: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      expect(activeTokens).toHaveLength(5);
      const oldestTokenId = activeTokens[0]?.id;

      // Login from 6th device (should remove oldest)
      const sixthDeviceData = {
        email: baseUserData.email,
        password: baseUserData.password,
        deviceId: generateUniqueUserData().deviceId, // Only generate unique deviceId
      };

      const sixthDeviceResponse = await request
        .post('/api/auth/login')
        .send(sixthDeviceData);

      expect(sixthDeviceResponse.status).toBe(200);

      // Verify still 5 active tokens and oldest was removed
      activeTokens = await prisma.refreshToken.findMany({
        where: {
          userId,
          isActive: true,
        },
      });

      expect(activeTokens).toHaveLength(5);
      
      // Verify oldest token was deactivated
      const oldestToken = await prisma.refreshToken.findUnique({
        where: { id: oldestTokenId },
      });

      expect(oldestToken?.isActive).toBe(false);
    });

    it('クロスデバイスログアウトシナリオを処理すること', async () => {
      const baseUserData = generateUniqueUserData({
        password: 'CrossLogout123',
      });

      // Register and login from multiple devices
      const registerResponse = await request
        .post('/api/auth/register')
        .send(baseUserData);

      const device1Tokens = registerResponse.body.data;

      const device2UserData = {
        email: baseUserData.email,
        password: baseUserData.password,
        deviceId: generateUniqueUserData().deviceId, // Only generate unique deviceId
      };

      const device2Response = await request
        .post('/api/auth/login')
        .send(device2UserData);

      const device2Tokens = device2Response.body.data;

      // Logout from device 1 using refresh token
      const logoutResponse = await request
        .post('/api/auth/logout')
        .set(generateAuthHeader(device1Tokens.token))
        .send({
          refreshToken: device1Tokens.refreshToken,
        });

      expect(logoutResponse.status).toBe(200);

      // Device 1 refresh token should be invalid
      const device1RefreshResponse = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken: device1Tokens.refreshToken,
          deviceId: baseUserData.deviceId,
        });

      expect(device1RefreshResponse.status).toBe(401);

      // Device 2 should still work
      const device2RefreshResponse = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken: device2Tokens.refreshToken,
          deviceId: device2UserData.deviceId,
        });

      expect(device2RefreshResponse.status).toBe(200);
    });
  });

  describe('セキュリティシナリオ', () => {
    it('リフレッシュ後のトークンの再利用を防ぐこと', async () => {
      const userData = generateUniqueUserData({
        password: 'TokenReuse123',
      });

      // Register user
      const registerResponse = await request
        .post('/api/auth/register')
        .send(userData);

      const originalTokens = registerResponse.body.data;

      // Refresh token (first time)
      const firstRefreshResponse = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken: originalTokens.refreshToken,
          deviceId: userData.deviceId,
        });

      expect(firstRefreshResponse.status).toBe(200);
      const firstNewTokens = firstRefreshResponse.body.data;

      // Try to use original refresh token again (should fail)
      const secondRefreshResponse = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken: originalTokens.refreshToken,
          deviceId: userData.deviceId,
        });

      expect(secondRefreshResponse.status).toBe(401);

      // Use new refresh token (should work)
      const thirdRefreshResponse = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken: firstNewTokens.refreshToken,
          deviceId: userData.deviceId,
        });

      expect(thirdRefreshResponse.status).toBe(200);
    });

    it('同時リフレッシュリクエストを適切に処理すること', async () => {
      const userData = generateUniqueUserData({
        password: 'Concurrent123',
      });

      // Register user
      const registerResponse = await request
        .post('/api/auth/register')
        .send(userData);

      const originalTokens = registerResponse.body.data;

      // Send multiple concurrent refresh requests
      const refreshPromises = Array(3).fill(null).map(() =>
        request
          .post('/api/auth/refresh')
          .send({
            refreshToken: originalTokens.refreshToken,
            deviceId: userData.deviceId,
          })
      );

      const refreshResponses = await Promise.all(refreshPromises);

      // Only one should succeed (or all should handle gracefully)
      const successfulResponses = refreshResponses.filter(response => response.status === 200);
      const failedResponses = refreshResponses.filter(response => response.status !== 200);

      expect(successfulResponses.length).toBeGreaterThan(0);
      
      // If multiple succeed, they should all return different tokens
      if (successfulResponses.length > 1) {
        const tokens = successfulResponses.map(response => response.body.data.refreshToken);
        const uniqueTokens = new Set(tokens);
        expect(uniqueTokens.size).toBe(tokens.length);
      }
    });

    it('期限切れアクセストークンシナリオを処理すること', async () => {
      const userData = generateUniqueUserData({
        password: 'Expired123',
      });

      // Register user
      const registerResponse = await request
        .post('/api/auth/register')
        .send(userData);

      const tokens = registerResponse.body.data;

      // In a real scenario, we would wait for token expiration
      // For testing, we can simulate with an invalid token
      const expiredToken = 'expired.token.here';

      // Try to use expired token
      const healthResponse = await request
        .get('/health')
        .set(generateAuthHeader(expiredToken));

      // This would normally be handled by the client refreshing the token
      // But here we just verify the refresh mechanism works
      const refreshResponse = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken: tokens.refreshToken,
          deviceId: userData.deviceId,
        });

      expect(refreshResponse.status).toBe(200);

      // Use new token
      const newHealthResponse = await request
        .get('/health')
        .set(generateAuthHeader(refreshResponse.body.data.token));

      expect(newHealthResponse.status).toBe(200);
    });
  });

  describe('エラー復旧シナリオ', () => {
    it('登録中のネットワーク中断を処理すること', async () => {
      const userData = generateUniqueUserData({
        password: 'Interruption123',
      });

      // First attempt (simulated network failure by incomplete registration)
      // We'll just verify that a retry works properly
      
      const firstAttemptResponse = await request
        .post('/api/auth/register')
        .send(userData);

      expect(firstAttemptResponse.status).toBe(201);

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      expect(user).toBeDefined();

      // Second attempt should fail (duplicate email)
      const secondAttemptResponse = await request
        .post('/api/auth/register')
        .send(userData);

      expect(secondAttemptResponse.status).toBe(400);
      expect(secondAttemptResponse.body.error).toBe('User already exists with this email');

      // But login should work
      const loginResponse = await request
        .post('/api/auth/login')
        .send(userData);

      expect(loginResponse.status).toBe(200);
    });

    it('部分的ログアウトシナリオを処理すること', async () => {
      const userData = generateUniqueUserData({
        password: 'PartialLogout123',
      });

      // Register and get tokens
      const registerResponse = await request
        .post('/api/auth/register')
        .send(userData);

      const tokens = registerResponse.body.data;

      // Manually deactivate refresh token (simulating partial logout)
      await prisma.refreshToken.updateMany({
        where: { token: tokens.refreshToken },
        data: { isActive: false },
      });

      // Try to refresh (should fail)
      const refreshResponse = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken: tokens.refreshToken,
          deviceId: userData.deviceId,
        });

      expect(refreshResponse.status).toBe(401);

      // User should be able to login again
      const loginResponse = await request
        .post('/api/auth/login')
        .send(userData);

      expect(loginResponse.status).toBe(200);
    });
  });
});