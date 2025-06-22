import { z } from 'zod';
import { isValidDeviceId } from './jwt';
import { validatePasswordStrength } from './password';

// メールアドレスのバリデーション
const emailSchema = z.string().email('Invalid email address').max(320, 'Email address is too long');

// パスワードのバリデーション（強度チェック付き）
const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .refine(
    (password) => {
      const { isValid } = validatePasswordStrength(password);
      return isValid;
    },
    {
      message: 'Password does not meet requirements'
    }
  );

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

// App設定更新のスキーマ
export const updateAppSettingsSchema = z.object({
  taskInsertPosition: z.enum(['top', 'bottom']).optional(),
  autoSort: z.boolean().optional(),
});

// ユーザー設定更新のスキーマ
export const updateUserSettingsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).optional(),
  language: z.enum(['ja', 'en']).optional(),
});

// タスクリスト順序更新のスキーマ
export const updateTaskListOrderSchema = z.object({
  taskListIds: z.array(z.string().min(1, 'Task list ID cannot be empty')),
});

// タスクリスト作成のスキーマ
export const createTaskListSchema = z.object({
  name: z.string().min(1, 'Task list name is required').max(100, 'Task list name is too long'),
});

// タスクリスト更新のスキーマ
export const updateTaskListSchema = z.object({
  name: z.string().min(1, 'Task list name is required').max(100, 'Task list name is too long').optional(),
  background: z.string().max(7, 'Background color format is invalid').optional(),
});

// タスク作成のスキーマ
export const createTaskSchema = z.object({
  text: z.string().min(1, 'Task text is required').max(500, 'Task text is too long'),
});

// タスク更新のスキーマ
export const updateTaskSchema = z.object({
  text: z.string().min(1, 'Task text is required').max(500, 'Task text is too long').optional(),
  completed: z.boolean().optional(),
  date: z.string().nullable().optional(),
});

// 共同編集同期のスキーマ
export const collaborativeSyncSchema = z.object({
  stateVector: z.string().min(1, 'State vector is required'),
  update: z.string().optional(),
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
