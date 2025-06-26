/**
 * バリデーション機能の型定義
 */

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface FieldValidationResult {
  isValid: boolean;
  error?: ValidationError;
}

export type ValidationRule<T = any> = (value: T) => FieldValidationResult;

export interface ValidationSchema {
  [fieldName: string]: ValidationRule[];
}

export interface FormValidationOptions {
  stopOnFirstError?: boolean;
  validateAllFields?: boolean;
  realTimeValidation?: boolean;
}

// パスワード強度レベル
export enum PasswordStrength {
  WEAK = 'weak',
  MEDIUM = 'medium',
  STRONG = 'strong',
}

export interface PasswordStrengthResult {
  strength: PasswordStrength;
  score: number; // 0-100
  suggestions: string[];
}

// よく使われるフィールド型
export interface CommonFormFields {
  email?: string;
  password?: string;
  confirmPassword?: string;
  taskText?: string;
  taskListName?: string;
}

// バリデーションエラーコード
export enum ValidationErrorCode {
  REQUIRED = 'required',
  EMAIL_INVALID = 'email_invalid',
  PASSWORD_TOO_SHORT = 'password_too_short',
  PASSWORD_TOO_WEAK = 'password_too_weak',
  PASSWORDS_DONT_MATCH = 'passwords_dont_match',
  TEXT_TOO_LONG = 'text_too_long',
  TEXT_TOO_SHORT = 'text_too_short',
  INVALID_FORMAT = 'invalid_format',
}