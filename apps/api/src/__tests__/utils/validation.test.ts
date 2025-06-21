import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshTokenSchema,
  updateProfileSchema,
  validateData,
  isValidEmail,
  isValidUUID,
  isValidCUID,
} from '../../utils/validation';

describe('Validation Utils', () => {
  describe('registerSchema', () => {
    const validRegisterData = {
      email: 'test@example.com',
      password: 'TestPass123',
      deviceId: '550e8400-e29b-41d4-a716-446655440000',
    };

    it('should validate correct registration data', () => {
      const result = validateData(registerSchema, validRegisterData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validRegisterData);
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid email format', () => {
      const invalidData = { ...validRegisterData, email: 'invalid-email' };
      const result = validateData(registerSchema, invalidData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid email address');
    });

    it('should reject weak password', () => {
      const invalidData = { ...validRegisterData, password: 'weak' };
      const result = validateData(registerSchema, invalidData);
      
      expect(result.success).toBe(false);
      expect(result.errors?.some(error => error.includes('Password'))).toBe(true);
    });

    it('should reject invalid device ID', () => {
      const invalidData = { ...validRegisterData, deviceId: 'invalid-device' };
      const result = validateData(registerSchema, invalidData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid device ID format');
    });

    it('should reject missing required fields', () => {
      const missingEmailResult = validateData(registerSchema, {
        password: 'TestPass123',
        deviceId: '550e8400-e29b-41d4-a716-446655440000',
      });
      
      expect(missingEmailResult.success).toBe(false);
      
      const missingPasswordResult = validateData(registerSchema, {
        email: 'test@example.com',
        deviceId: '550e8400-e29b-41d4-a716-446655440000',
      });
      
      expect(missingPasswordResult.success).toBe(false);
      
      const missingDeviceIdResult = validateData(registerSchema, {
        email: 'test@example.com',
        password: 'TestPass123',
      });
      
      expect(missingDeviceIdResult.success).toBe(false);
    });

    it('should handle long email addresses', () => {
      const longEmail = 'a'.repeat(310) + '@example.com'; // Over 320 chars
      const invalidData = { ...validRegisterData, email: longEmail };
      const result = validateData(registerSchema, invalidData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Email address is too long');
    });

    it('should accept random string device ID format', () => {
      const randomStringDeviceId = 'abcd1234567890abcd1234567890abcd'; // 32 chars
      const validData = { ...validRegisterData, deviceId: randomStringDeviceId };
      const result = validateData(registerSchema, validData);
      
      expect(result.success).toBe(true);
    });
  });

  describe('loginSchema', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'anypassword', // Login doesn't validate password strength
      deviceId: '550e8400-e29b-41d4-a716-446655440000',
    };

    it('should validate correct login data', () => {
      const result = validateData(loginSchema, validLoginData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validLoginData);
    });

    it('should accept weak passwords for login', () => {
      const weakPasswordData = { ...validLoginData, password: 'weak' };
      const result = validateData(loginSchema, weakPasswordData);
      
      expect(result.success).toBe(true);
    });

    it('should reject empty password', () => {
      const emptyPasswordData = { ...validLoginData, password: '' };
      const result = validateData(loginSchema, emptyPasswordData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should reject invalid email', () => {
      const invalidEmailData = { ...validLoginData, email: 'not-an-email' };
      const result = validateData(loginSchema, invalidEmailData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid email address');
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should validate correct email', () => {
      const result = validateData(forgotPasswordSchema, { email: 'test@example.com' });
      
      expect(result.success).toBe(true);
      expect(result.data?.email).toBe('test@example.com');
    });

    it('should reject invalid email', () => {
      const result = validateData(forgotPasswordSchema, { email: 'invalid-email' });
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid email address');
    });

    it('should reject missing email', () => {
      const result = validateData(forgotPasswordSchema, {});
      
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    const validResetData = {
      token: 'reset-token-123',
      newPassword: 'NewTestPass123',
    };

    it('should validate correct reset data', () => {
      const result = validateData(resetPasswordSchema, validResetData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validResetData);
    });

    it('should reject weak new password', () => {
      const weakPasswordData = { ...validResetData, newPassword: 'weak' };
      const result = validateData(resetPasswordSchema, weakPasswordData);
      
      expect(result.success).toBe(false);
      expect(result.errors?.some(error => error.includes('Password'))).toBe(true);
    });

    it('should reject empty token', () => {
      const emptyTokenData = { ...validResetData, token: '' };
      const result = validateData(resetPasswordSchema, emptyTokenData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Reset token is required');
    });
  });

  describe('changePasswordSchema', () => {
    const validChangeData = {
      currentPassword: 'CurrentPass123',
      newPassword: 'NewTestPass123',
    };

    it('should validate correct change password data', () => {
      const result = validateData(changePasswordSchema, validChangeData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validChangeData);
    });

    it('should reject weak new password', () => {
      const weakPasswordData = { ...validChangeData, newPassword: 'weak' };
      const result = validateData(changePasswordSchema, weakPasswordData);
      
      expect(result.success).toBe(false);
      expect(result.errors?.some(error => error.includes('Password'))).toBe(true);
    });

    it('should reject empty current password', () => {
      const emptyCurrentPasswordData = { ...validChangeData, currentPassword: '' };
      const result = validateData(changePasswordSchema, emptyCurrentPasswordData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Current password is required');
    });
  });

  describe('refreshTokenSchema', () => {
    const validRefreshData = {
      refreshToken: 'refresh-token-123',
      deviceId: '550e8400-e29b-41d4-a716-446655440000',
    };

    it('should validate correct refresh token data', () => {
      const result = validateData(refreshTokenSchema, validRefreshData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validRefreshData);
    });

    it('should reject empty refresh token', () => {
      const emptyTokenData = { ...validRefreshData, refreshToken: '' };
      const result = validateData(refreshTokenSchema, emptyTokenData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Refresh token is required');
    });

    it('should reject invalid device ID', () => {
      const invalidDeviceData = { ...validRefreshData, deviceId: 'invalid' };
      const result = validateData(refreshTokenSchema, invalidDeviceData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid device ID format');
    });
  });

  describe('updateProfileSchema', () => {
    it('should validate correct profile update', () => {
      const result = validateData(updateProfileSchema, { email: 'new@example.com' });
      
      expect(result.success).toBe(true);
      expect(result.data?.email).toBe('new@example.com');
    });

    it('should validate empty update', () => {
      const result = validateData(updateProfileSchema, {});
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should reject invalid email', () => {
      const result = validateData(updateProfileSchema, { email: 'invalid-email' });
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid email address');
    });
  });

  describe('validateData function', () => {
    it('should handle unknown errors', () => {
      // Simulate an error that's not a ZodError
      const mockSchema = {
        parse: () => {
          throw new Error('Unknown error');
        },
      } as any;
      
      const result = validateData(mockSchema, {});
      
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Validation failed']);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user123@domain.co.uk',
        'first.last@subdomain.example.org',
        'user+tag@example.com',
        'a@b.co',
      ];
      
      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user.domain.com',
        '',
        ' ',
        'user@domain..com',
      ];
      
      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('isValidUUID', () => {
    it('should validate correct UUIDs', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
        '00000000-0000-1000-8000-000000000000',
        'ffffffff-ffff-5fff-bfff-ffffffffffff',
      ];
      
      validUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        'invalid-uuid',
        '550e8400-e29b-41d4-a716-44665544000', // too short
        '550e8400-e29b-41d4-a716-446655440000-extra', // too long
        'gggggggg-gggg-gggg-gggg-gggggggggggg', // invalid hex chars
        '550e8400_e29b_41d4_a716_446655440000', // underscores instead of hyphens
        '',
        '123',
      ];
      
      invalidUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(false);
      });
    });
  });

  describe('isValidCUID', () => {
    it('should validate correct CUIDs', () => {
      const validCUIDs = [
        'c123456789012345678901234', // 25 chars total, starts with 'c'
        'cabcdefghijklmnopqrstuvwx',
        'c000000000000000000000000',
        'c111111111111111111111111',
      ];
      
      validCUIDs.forEach(cuid => {
        expect(isValidCUID(cuid)).toBe(true);
      });
    });

    it('should reject invalid CUIDs', () => {
      const invalidCUIDs = [
        'invalid-cuid',
        'a123456789012345678901234', // doesn't start with 'c'
        'c123456789012345678901', // too short (23 chars)
        'c12345678901234567890123456', // too long (27 chars)
        'C123456789012345678901234', // uppercase 'C'
        'c123456789012345678901G23', // invalid uppercase char
        '',
        'c',
      ];
      
      invalidCUIDs.forEach(cuid => {
        expect(isValidCUID(cuid)).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined inputs', () => {
      const nullResult = validateData(registerSchema, null);
      expect(nullResult.success).toBe(false);
      
      const undefinedResult = validateData(registerSchema, undefined);
      expect(undefinedResult.success).toBe(false);
    });

    it('should handle non-object inputs', () => {
      const stringResult = validateData(registerSchema, 'string');
      expect(stringResult.success).toBe(false);
      
      const numberResult = validateData(registerSchema, 123);
      expect(numberResult.success).toBe(false);
      
      const arrayResult = validateData(registerSchema, []);
      expect(arrayResult.success).toBe(false);
    });

    it('should handle extra fields', () => {
      const dataWithExtraFields = {
        email: 'test@example.com',
        password: 'TestPass123',
        deviceId: '550e8400-e29b-41d4-a716-446655440000',
        extraField: 'should be ignored',
      };
      
      const result = validateData(registerSchema, dataWithExtraFields);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        email: 'test@example.com',
        password: 'TestPass123',
        deviceId: '550e8400-e29b-41d4-a716-446655440000',
      });
    });
  });
});