/**
 * 共通バリデーションスキーマ
 */

import {
  required,
  email,
  minLength,
  passwordStrength,
  confirmPassword,
  taskText,
  taskListName,
} from './rules';
import { ValidationSchema, PasswordStrength } from './types';

/**
 * ログインフォームスキーマ
 */
export const loginSchema: ValidationSchema = {
  email: [
    required('Email is required'),
    email('Please enter a valid email address'),
  ],
  password: [
    required('Password is required'),
  ],
};

/**
 * ユーザー登録フォームスキーマ
 */
export const registerSchema: ValidationSchema = {
  email: [
    required('Email is required'),
    email('Please enter a valid email address'),
  ],
  password: [
    required('Password is required'),
    minLength(8, 'Password must be at least 8 characters'),
    passwordStrength(PasswordStrength.MEDIUM, 'Password is too weak'),
  ],
};

/**
 * ユーザー登録フォームスキーマ（確認パスワード付き）
 */
export const createRegisterSchemaWithConfirmation = (passwordValue: string): ValidationSchema => ({
  ...registerSchema,
  confirmPassword: [
    required('Please confirm your password'),
    confirmPassword(passwordValue, 'Passwords do not match'),
  ],
});

/**
 * パスワード忘れフォームスキーマ
 */
export const forgotPasswordSchema: ValidationSchema = {
  email: [
    required('Email is required'),
    email('Please enter a valid email address'),
  ],
};

/**
 * パスワードリセットフォームスキーマ
 */
export const resetPasswordSchema: ValidationSchema = {
  newPassword: [
    required('New password is required'),
    minLength(8, 'Password must be at least 8 characters'),
    passwordStrength(PasswordStrength.MEDIUM, 'Password is too weak'),
  ],
};

/**
 * パスワードリセットフォームスキーマ（確認パスワード付き）
 */
export const createResetPasswordSchemaWithConfirmation = (passwordValue: string): ValidationSchema => ({
  ...resetPasswordSchema,
  confirmPassword: [
    required('Please confirm your new password'),
    confirmPassword(passwordValue, 'Passwords do not match'),
  ],
});

/**
 * パスワード変更フォームスキーマ
 */
export const changePasswordSchema: ValidationSchema = {
  currentPassword: [
    required('Current password is required'),
  ],
  newPassword: [
    required('New password is required'),
    minLength(8, 'Password must be at least 8 characters'),
    passwordStrength(PasswordStrength.MEDIUM, 'Password is too weak'),
  ],
};

/**
 * パスワード変更フォームスキーマ（確認パスワード付き）
 */
export const createChangePasswordSchemaWithConfirmation = (newPasswordValue: string): ValidationSchema => ({
  ...changePasswordSchema,
  confirmPassword: [
    required('Please confirm your new password'),
    confirmPassword(newPasswordValue, 'Passwords do not match'),
  ],
});

/**
 * タスク作成・編集フォームスキーマ
 */
export const taskSchema: ValidationSchema = {
  text: [
    taskText('Task text is required'),
  ],
};

/**
 * タスクリスト作成・編集フォームスキーマ
 */
export const taskListSchema: ValidationSchema = {
  name: [
    taskListName('Task list name is required'),
  ],
};

/**
 * ユーザー設定フォームスキーマ
 */
export const userSettingsSchema: ValidationSchema = {
  email: [
    required('Email is required'),
    email('Please enter a valid email address'),
  ],
};

/**
 * プロフィール更新フォームスキーマ
 */
export const profileUpdateSchema: ValidationSchema = {
  email: [
    required('Email is required'),
    email('Please enter a valid email address'),
  ],
};

/**
 * 多言語対応のエラーメッセージ
 */
export const errorMessages = {
  ja: {
    required: 'この項目は必須です',
    email_invalid: '有効なメールアドレスを入力してください',
    password_too_short: 'パスワードは8文字以上で入力してください',
    password_too_weak: 'パスワードが弱すぎます',
    passwords_dont_match: 'パスワードが一致しません',
    text_too_long: '文字数が多すぎます',
    text_too_short: '文字数が少なすぎます',
    invalid_format: '形式が正しくありません',
  },
  en: {
    required: 'This field is required',
    email_invalid: 'Please enter a valid email address',
    password_too_short: 'Password must be at least 8 characters',
    password_too_weak: 'Password is too weak',
    passwords_dont_match: 'Passwords do not match',
    text_too_long: 'Text is too long',
    text_too_short: 'Text is too short',
    invalid_format: 'Invalid format',
  },
} as const;

/**
 * 多言語対応のバリデーションスキーマ生成
 */
export const createLocalizedSchema = (
  schemaType: 'login' | 'register' | 'forgotPassword' | 'resetPassword' | 'task' | 'taskList',
  language: 'ja' | 'en' = 'en'
): ValidationSchema => {
  const messages = errorMessages[language];

  switch (schemaType) {
    case 'login':
      return {
        email: [
          required(messages.required),
          email(messages.email_invalid),
        ],
        password: [
          required(messages.required),
        ],
      };

    case 'register':
      return {
        email: [
          required(messages.required),
          email(messages.email_invalid),
        ],
        password: [
          required(messages.required),
          minLength(8, messages.password_too_short),
          passwordStrength(PasswordStrength.MEDIUM, messages.password_too_weak),
        ],
      };

    case 'forgotPassword':
      return {
        email: [
          required(messages.required),
          email(messages.email_invalid),
        ],
      };

    case 'resetPassword':
      return {
        newPassword: [
          required(messages.required),
          minLength(8, messages.password_too_short),
          passwordStrength(PasswordStrength.MEDIUM, messages.password_too_weak),
        ],
      };

    case 'task':
      return {
        text: [
          required(messages.required),
        ],
      };

    case 'taskList':
      return {
        name: [
          required(messages.required),
        ],
      };

    default:
      return {};
  }
};