import { z } from 'zod';
import { isValidDeviceId } from './jwt';

// メールアドレスのバリデーション
const emailSchema = z.string().email('Invalid email address').max(320, 'Email address is too long');

// パスワードのバリデーション
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number');

// デバイスIDのバリデーション
const deviceIdSchema = z
  .string()
  .min(1, 'Device ID is required')
  .refine(isValidDeviceId, 'Invalid device ID format');

// ユーザー登録のスキーマ
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  deviceId: deviceIdSchema,
});

// ログインのスキーマ
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  deviceId: deviceIdSchema,
});

// パスワード忘れのスキーマ
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// パスワードリセットのスキーマ
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
});

// パスワード変更のスキーマ
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

// リフレッシュトークンのスキーマ
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
  deviceId: deviceIdSchema,
});

// プロフィール更新のスキーマ
export const updateProfileSchema = z.object({
  email: emailSchema.optional(),
});

// 汎用的なバリデーション結果の型
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * スキーマを使ってデータを検証
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  try {
    const result = schema.parse(data);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => err.message),
      };
    }
    return {
      success: false,
      errors: ['Validation failed'],
    };
  }
}

/**
 * メールアドレスの形式を検証
 */
export function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

/**
 * UUIDの形式を検証
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * CUIDの形式を検証
 */
export function isValidCUID(cuid: string): boolean {
  const cuidRegex = /^c[a-z0-9]{24}$/;
  return cuidRegex.test(cuid);
}
