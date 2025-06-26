/**
 * バリデーション機能のエクスポート
 */

// 型定義
export type {
  ValidationError,
  ValidationResult,
  FieldValidationResult,
  ValidationRule,
  ValidationSchema,
  FormValidationOptions,
  CommonFormFields,
  PasswordStrengthResult,
} from './types';

export { ValidationErrorCode, PasswordStrength } from './types';

// バリデーションルール
export {
  required,
  email,
  minLength,
  maxLength,
  passwordStrength,
  confirmPassword,
  taskText,
  taskListName,
  calculatePasswordStrength,
} from './rules';

// バリデーター
export {
  validateField,
  validateForm,
  FormValidator,
  getValidationErrorMessage,
} from './validator';

// 共通スキーマ
export {
  loginSchema,
  registerSchema,
  createRegisterSchemaWithConfirmation,
  forgotPasswordSchema,
  resetPasswordSchema,
  createResetPasswordSchemaWithConfirmation,
  changePasswordSchema,
  createChangePasswordSchemaWithConfirmation,
  taskSchema,
  taskListSchema,
  userSettingsSchema,
  profileUpdateSchema,
  errorMessages,
  createLocalizedSchema,
} from './schemas';

// React フック
export {
  useFormValidation,
  useFieldValidation,
  usePasswordStrength,
} from './hooks';