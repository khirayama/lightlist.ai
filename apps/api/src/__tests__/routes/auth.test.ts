import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getTestRequest, 
  getTestPrisma, 
  testData, 
  createTestUser, 
  createAuthenticatedUser,
  generateAuthHeader,
  createMultipleDevicesForUser,
  delay 
} from '../utils/test-helpers';
import { verifyPassword } from '../../utils/password';
import { verifyAccessToken, verifyRefreshToken } from '../../utils/jwt';

describe('Auth Routes', () => {
  const request = getTestRequest();
  const prisma = getTestPrisma();

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = testData.users.validUser1;
      
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
      const isPasswordHashed = await verifyPassword(userData.password, user!.password);
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

    it('should reject registration with duplicate email', async () => {
      const userData = testData.users.validUser1;
      
      // Create user first
      await createTestUser(userData);

      // Try to register again with same email
      const response = await request
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User already exists with this email');
    });

    it('should reject registration with invalid email', async () => {
      const userData = testData.users.invalidEmail;
      
      const response = await request
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContain('Invalid email address');
    });

    it('should reject registration with weak password', async () => {
      const userData = testData.users.weakPassword;
      
      const response = await request
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password does not meet requirements');
      expect(response.body.details).toBeDefined();
      expect(response.body.details.length).toBeGreaterThan(0);
    });

    it('should reject registration with invalid device ID', async () => {
      const userData = testData.users.invalidDeviceId;
      
      const response = await request
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContain('Invalid device ID format');
    });

    it('should reject registration with missing fields', async () => {
      const response = await request
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          // Missing password and deviceId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should accept random string device ID format', async () => {
      const userData = {
        ...testData.users.validUser1,
        deviceId: testData.deviceIds.randomString,
      };
      
      const response = await request
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.data.user.email).toBe(userData.email);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const userData = testData.users.validUser1;
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

    it('should reject login with incorrect email', async () => {
      const userData = testData.users.validUser1;
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

    it('should reject login with incorrect password', async () => {
      const userData = testData.users.validUser1;
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

    it('should handle multiple device logins', async () => {
      const userData = testData.users.validUser1;
      const user = await createTestUser(userData);

      // Login from first device
      const device1Response = await request
        .post('/api/auth/login')
        .send(userData);

      expect(device1Response.status).toBe(200);

      // Login from second device
      const device2Response = await request
        .post('/api/auth/login')
        .send({
          ...userData,
          deviceId: testData.deviceIds.device2,
        });

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

    it('should replace existing device token on re-login', async () => {
      const userData = testData.users.validUser1;
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

    it('should enforce maximum device limit', async () => {
      const userData = testData.users.validUser1;
      const user = await createTestUser(userData);

      // Create 5 devices (maximum allowed)
      await createMultipleDevicesForUser(user, 5);

      // Try to login from 6th device
      const response = await request
        .post('/api/auth/login')
        .send({
          ...userData,
          deviceId: testData.deviceIds.device6,
        });

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

    it('should reject login with invalid input format', async () => {
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
    it('should logout successfully with refresh token', async () => {
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

    it('should logout successfully with device ID', async () => {
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

    it('should require authentication', async () => {
      const response = await request
        .post('/api/auth/logout')
        .send({
          refreshToken: 'some-token',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token is required');
    });

    it('should handle logout without token or device ID', async () => {
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
    it('should refresh token successfully', async () => {
      const { user, tokens, deviceId } = await createAuthenticatedUser();

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

    it('should reject invalid refresh token', async () => {
      const response = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid.refresh.token',
          deviceId: testData.deviceIds.device1,
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired refresh token');
    });

    it('should reject refresh token not in database', async () => {
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

    it('should reject device ID mismatch', async () => {
      const { tokens } = await createAuthenticatedUser();

      const response = await request
        .post('/api/auth/refresh')
        .send({
          refreshToken: tokens.refreshToken,
          deviceId: testData.deviceIds.device2, // Different device ID
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Device ID mismatch');
    });

    it('should reject malformed request', async () => {
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
    it('should handle forgot password for existing user', async () => {
      const userData = testData.users.validUser1;
      await createTestUser(userData);

      const response = await request
        .post('/api/auth/forgot-password')
        .send({
          email: userData.email,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset email sent successfully');
    });

    it('should handle forgot password for non-existent user (security)', async () => {
      const response = await request
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        });

      // Should return same response for security reasons
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset email sent successfully');
    });

    it('should reject invalid email format', async () => {
      const response = await request
        .post('/api/auth/forgot-password')
        .send({
          email: 'invalid-email',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContain('Invalid email address');
    });

    it('should reject missing email', async () => {
      const response = await request
        .post('/api/auth/forgot-password')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reject reset password (not implemented)', async () => {
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

    it('should reject weak password', async () => {
      const response = await request
        .post('/api/auth/reset-password')
        .send({
          token: 'reset-token-123',
          newPassword: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password does not meet requirements');
    });

    it('should reject malformed request', async () => {
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

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON', async () => {
      const response = await request
        .post('/api/auth/register')
        .send('invalid-json')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });

    it('should handle very long inputs', async () => {
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

    it('should handle special characters in inputs', async () => {
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

    it('should handle concurrent requests', async () => {
      const userData = testData.users.validUser1;
      
      // Send multiple concurrent registration requests
      const promises = Array(5).fill(null).map((_, index) => 
        request
          .post('/api/auth/register')
          .send({
            ...userData,
            email: `test${index}@example.com`,
          })
      );

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify all users were created
      const users = await prisma.user.findMany({
        where: {
          email: {
            in: responses.map((_, index) => `test${index}@example.com`),
          },
        },
      });

      expect(users).toHaveLength(5);
    });
  });
});