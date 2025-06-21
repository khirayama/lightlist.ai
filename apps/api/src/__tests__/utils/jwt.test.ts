import { describe, it, expect, beforeAll } from 'vitest';
import * as jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
  getTokenExpiry,
  generateResetToken,
  isValidDeviceId,
  ACCESS_TOKEN_EXPIRY_MS,
  REFRESH_TOKEN_EXPIRY_MS,
} from '../../utils/jwt';
import type { JWTPayload, RefreshTokenPayload } from '../../types/auth';

describe('JWT Utils', () => {
  const testPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: 'test-user-id',
    email: 'test@example.com',
  };

  const testRefreshPayload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
    userId: 'test-user-id',
    deviceId: 'test-device-id',
    tokenId: 'test-token-id',
  };

  const testDeviceId = '550e8400-e29b-41d4-a716-446655440000';
  const testEmail = 'test@example.com';

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(testPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should generate different tokens for different payloads', () => {
      const token1 = generateAccessToken(testPayload);
      const token2 = generateAccessToken({
        ...testPayload,
        userId: 'different-user-id',
      });
      
      expect(token1).not.toBe(token2);
    });

    it('should include correct payload data', () => {
      const token = generateAccessToken(testPayload);
      const decoded = jwt.decode(token) as JWTPayload;
      
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(testRefreshPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include correct payload data', () => {
      const token = generateRefreshToken(testRefreshPayload);
      const decoded = jwt.decode(token) as RefreshTokenPayload;
      
      expect(decoded.userId).toBe(testRefreshPayload.userId);
      expect(decoded.deviceId).toBe(testRefreshPayload.deviceId);
      expect(decoded.tokenId).toBe(testRefreshPayload.tokenId);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const token = generateAccessToken(testPayload);
      const verified = verifyAccessToken(token);
      
      expect(verified).toBeDefined();
      expect(verified?.userId).toBe(testPayload.userId);
      expect(verified?.email).toBe(testPayload.email);
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      const verified = verifyAccessToken(invalidToken);
      
      expect(verified).toBeNull();
    });

    it('should return null for malformed token', () => {
      const malformedToken = 'not-a-jwt-token';
      const verified = verifyAccessToken(malformedToken);
      
      expect(verified).toBeNull();
    });

    it('should return null for token with wrong secret', () => {
      const tokenWithWrongSecret = jwt.sign(testPayload, 'wrong-secret');
      const verified = verifyAccessToken(tokenWithWrongSecret);
      
      expect(verified).toBeNull();
    });

    it('should return null for expired token', () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { ...testPayload, exp: Math.floor(Date.now() / 1000) - 1 },
        process.env.JWT_SECRET || 'test-secret'
      );
      const verified = verifyAccessToken(expiredToken);
      
      expect(verified).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const token = generateRefreshToken(testRefreshPayload);
      const verified = verifyRefreshToken(token);
      
      expect(verified).toBeDefined();
      expect(verified?.userId).toBe(testRefreshPayload.userId);
      expect(verified?.deviceId).toBe(testRefreshPayload.deviceId);
      expect(verified?.tokenId).toBe(testRefreshPayload.tokenId);
    });

    it('should return null for invalid refresh token', () => {
      const invalidToken = 'invalid.refresh.token';
      const verified = verifyRefreshToken(invalidToken);
      
      expect(verified).toBeNull();
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const tokens = generateTokenPair('user-id', testEmail, testDeviceId);
      
      expect(tokens).toBeDefined();
      expect(tokens.token).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe(ACCESS_TOKEN_EXPIRY_MS);
      expect(tokens.refreshExpiresIn).toBe(REFRESH_TOKEN_EXPIRY_MS);
    });

    it('should generate valid tokens', () => {
      const tokens = generateTokenPair('user-id', testEmail, testDeviceId);
      
      const accessVerified = verifyAccessToken(tokens.token);
      const refreshVerified = verifyRefreshToken(tokens.refreshToken);
      
      expect(accessVerified).toBeDefined();
      expect(refreshVerified).toBeDefined();
      expect(accessVerified?.userId).toBe('user-id');
      expect(accessVerified?.email).toBe(testEmail);
      expect(refreshVerified?.userId).toBe('user-id');
      expect(refreshVerified?.deviceId).toBe(testDeviceId);
    });

    it('should generate different refresh tokens each time', () => {
      const tokens1 = generateTokenPair('user-id', testEmail, testDeviceId);
      const tokens2 = generateTokenPair('user-id', testEmail, testDeviceId);
      
      expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
      
      // But they should have different tokenIds
      const refresh1 = verifyRefreshToken(tokens1.refreshToken);
      const refresh2 = verifyRefreshToken(tokens2.refreshToken);
      
      expect(refresh1?.tokenId).not.toBe(refresh2?.tokenId);
    });
  });

  describe('getTokenExpiry', () => {
    it('should return expiry date for valid token', () => {
      const token = generateAccessToken(testPayload);
      const expiry = getTokenExpiry(token);
      
      expect(expiry).toBeDefined();
      expect(expiry).toBeInstanceOf(Date);
      expect(expiry!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid token', () => {
      const expiry = getTokenExpiry('invalid.token');
      expect(expiry).toBeNull();
    });

    it('should return null for malformed token', () => {
      const expiry = getTokenExpiry('not-a-jwt');
      expect(expiry).toBeNull();
    });

    it('should handle decode exceptions gracefully', () => {
      // Test with various inputs that should cause jwt.decode to throw
      const malformedInputs = [
        'malformed..token..with..multiple.dots',
        null as any,
        undefined as any,
        123 as any,
        {} as any,
      ];
      
      malformedInputs.forEach(input => {
        const expiry = getTokenExpiry(input);
        expect(expiry).toBeNull();
      });
    });
  });

  describe('generateResetToken', () => {
    it('should generate a random reset token', () => {
      const token = generateResetToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes * 2 (hex encoding)
    });

    it('should generate different tokens each time', () => {
      const token1 = generateResetToken();
      const token2 = generateResetToken();
      
      expect(token1).not.toBe(token2);
    });

    it('should generate hexadecimal string', () => {
      const token = generateResetToken();
      expect(/^[a-f0-9]+$/i.test(token)).toBe(true);
    });
  });

  describe('isValidDeviceId', () => {
    it('should validate UUID format', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
        '00000000-0000-1000-8000-000000000000',
        'ffffffff-ffff-5fff-bfff-ffffffffffff',
      ];
      
      validUUIDs.forEach(uuid => {
        expect(isValidDeviceId(uuid)).toBe(true);
      });
    });

    it('should validate random string format (32+ chars)', () => {
      const validRandomStrings = [
        'abcd1234567890abcd1234567890abcd', // exactly 32 chars
        'abcd1234567890abcd1234567890abcdef', // 34 chars
        'a1b2c3d4e5f6789012345678901234567890', // 36 chars
      ];
      
      validRandomStrings.forEach(str => {
        expect(isValidDeviceId(str)).toBe(true);
      });
    });

    it('should reject invalid device IDs', () => {
      const invalidDeviceIds = [
        '', // empty
        'short', // too short
        '123-456-789', // wrong format
        'not-a-uuid-or-random-string', // contains hyphens but not UUID
        'abcd1234567890abcd1234567890ab', // 31 chars, too short
        '550e8400-e29b-41d4-a716-44665544000', // malformed UUID
        '550e8400-e29b-41d4-a716-446655440000-extra', // too long UUID
        'gggggggg-gggg-gggg-gggg-gggggggggggg', // invalid hex chars
      ];
      
      invalidDeviceIds.forEach(id => {
        expect(isValidDeviceId(id)).toBe(false);
      });
    });
  });

  describe('Constants', () => {
    it('should have correct expiry constants', () => {
      expect(ACCESS_TOKEN_EXPIRY_MS).toBe(60 * 60 * 1000); // 1 hour
      expect(REFRESH_TOKEN_EXPIRY_MS).toBe(365 * 24 * 60 * 60 * 1000); // 1 year
    });
  });
});