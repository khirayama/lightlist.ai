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

describe('バリデーションユーティリティ', () => {
  describe('registerSchema', () => {
    const validRegisterData = {
      email: 'test@example.com',
      password: 'TestPass123',
      deviceId: '550e8400-e29b-41d4-a716-446655440000',
    };

    it('正しい登録データを検証できること', () => {
      const result = validateData(registerSchema, validRegisterData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validRegisterData);
      expect(result.errors).toBeUndefined();
    });

    it('無効なメール形式を拒否すること', () => {
      const invalidData = { ...validRegisterData, email: 'invalid-email' };
      const result = validateData(registerSchema, invalidData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid email address');
    });

    it('弱いパスワードを拒否すること', () => {
      const invalidData = { ...validRegisterData, password: 'weak' };
      const result = validateData(registerSchema, invalidData);
      
      expect(result.success).toBe(false);
      expect(result.errors?.some(error => error.includes('Password'))).toBe(true);
    });

    it('無効なデバイスIDを拒否すること', () => {
      const invalidData = { ...validRegisterData, deviceId: 'invalid-device' };
      const result = validateData(registerSchema, invalidData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid device ID format');
    });

    it('必須フィールドの不足を拒否すること', () => {
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

    it('長いメールアドレスを処理できること', () => {
      const longEmail = 'a'.repeat(310) + '@example.com'; // Over 320 chars
      const invalidData = { ...validRegisterData, email: longEmail };
      const result = validateData(registerSchema, invalidData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Email address is too long');
    });

    it('ランダム文字列のデバイスID形式を受け入れること', () => {
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

    it('正しいログインデータを検証できること', () => {
      const result = validateData(loginSchema, validLoginData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validLoginData);
    });

    it('ログイン時に弱いパスワードを受け入れること', () => {
      const weakPasswordData = { ...validLoginData, password: 'weak' };
      const result = validateData(loginSchema, weakPasswordData);
      
      expect(result.success).toBe(true);
    });

    it('空のパスワードを拒否すること', () => {
      const emptyPasswordData = { ...validLoginData, password: '' };
      const result = validateData(loginSchema, emptyPasswordData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('無効なメールを拒否すること', () => {
      const invalidEmailData = { ...validLoginData, email: 'not-an-email' };
      const result = validateData(loginSchema, invalidEmailData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid email address');
    });
  });

  describe('forgotPasswordSchema', () => {
    it('正しいメールを検証できること', () => {
      const result = validateData(forgotPasswordSchema, { email: 'test@example.com' });
      
      expect(result.success).toBe(true);
      expect(result.data?.email).toBe('test@example.com');
    });

    it('無効なメールを拒否すること', () => {
      const result = validateData(forgotPasswordSchema, { email: 'invalid-email' });
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid email address');
    });

    it('メールの不足を拒否すること', () => {
      const result = validateData(forgotPasswordSchema, {});
      
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    const validResetData = {
      token: 'reset-token-123',
      newPassword: 'NewTestPass123',
    };

    it('正しいリセットデータを検証できること', () => {
      const result = validateData(resetPasswordSchema, validResetData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validResetData);
    });

    it('弱い新パスワードを拒否すること', () => {
      const weakPasswordData = { ...validResetData, newPassword: 'weak' };
      const result = validateData(resetPasswordSchema, weakPasswordData);
      
      expect(result.success).toBe(false);
      expect(result.errors?.some(error => error.includes('Password'))).toBe(true);
    });

    it('空のトークンを拒否すること', () => {
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

    it('正しいパスワード変更データを検証できること', () => {
      const result = validateData(changePasswordSchema, validChangeData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validChangeData);
    });

    it('弱い新パスワードを拒否すること', () => {
      const weakPasswordData = { ...validChangeData, newPassword: 'weak' };
      const result = validateData(changePasswordSchema, weakPasswordData);
      
      expect(result.success).toBe(false);
      expect(result.errors?.some(error => error.includes('Password'))).toBe(true);
    });

    it('空の現在パスワードを拒否すること', () => {
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

    it('正しいリフレッシュトークンデータを検証できること', () => {
      const result = validateData(refreshTokenSchema, validRefreshData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validRefreshData);
    });

    it('空のリフレッシュトークンを拒否すること', () => {
      const emptyTokenData = { ...validRefreshData, refreshToken: '' };
      const result = validateData(refreshTokenSchema, emptyTokenData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Refresh token is required');
    });

    it('無効なデバイスIDを拒否すること', () => {
      const invalidDeviceData = { ...validRefreshData, deviceId: 'invalid' };
      const result = validateData(refreshTokenSchema, invalidDeviceData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid device ID format');
    });
  });

  describe('updateProfileSchema', () => {
    it('正しいプロフィール更新を検証できること', () => {
      const result = validateData(updateProfileSchema, { email: 'new@example.com' });
      
      expect(result.success).toBe(true);
      expect(result.data?.email).toBe('new@example.com');
    });

    it('空の更新を検証できること', () => {
      const result = validateData(updateProfileSchema, {});
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('無効なメールを拒否すること', () => {
      const result = validateData(updateProfileSchema, { email: 'invalid-email' });
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid email address');
    });
  });

  describe('validateData関数', () => {
    it('未知のエラーを処理できること', () => {
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
    it('正しいメールアドレスを検証できること', () => {
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

    it('無効なメールアドレスを拒否すること', () => {
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
    it('正しいUUIDを検証できること', () => {
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

    it('無効なUUIDを拒否すること', () => {
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
    it('正しいCUIDを検証できること', () => {
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

    it('無効なCUIDを拒否すること', () => {
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

  describe('エッジケース', () => {
    it('nullとundefinedの入力を処理できること', () => {
      const nullResult = validateData(registerSchema, null);
      expect(nullResult.success).toBe(false);
      
      const undefinedResult = validateData(registerSchema, undefined);
      expect(undefinedResult.success).toBe(false);
    });

    it('オブジェクト以外の入力を処理できること', () => {
      const stringResult = validateData(registerSchema, 'string');
      expect(stringResult.success).toBe(false);
      
      const numberResult = validateData(registerSchema, 123);
      expect(numberResult.success).toBe(false);
      
      const arrayResult = validateData(registerSchema, []);
      expect(arrayResult.success).toBe(false);
    });

    it('余分なフィールドを処理できること', () => {
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