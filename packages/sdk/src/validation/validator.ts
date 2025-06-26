/**
 * バリデーション実行機能
 */

import {
  ValidationSchema,
  ValidationResult,
  FieldValidationResult,
  ValidationError,
  FormValidationOptions,
} from './types';

/**
 * 単一フィールドのバリデーション
 */
export const validateField = (
  fieldName: string,
  value: any,
  rules: any[]
): FieldValidationResult => {
  for (const rule of rules) {
    const result = rule(value);
    if (!result.isValid) {
      return {
        isValid: false,
        error: {
          field: fieldName,
          message: result.error?.message || 'Validation failed',
          code: result.error?.code || 'validation_error',
        },
      };
    }
  }
  return { isValid: true };
};

/**
 * フォーム全体のバリデーション
 */
export const validateForm = (
  data: Record<string, any>,
  schema: ValidationSchema,
  options: FormValidationOptions = {}
): ValidationResult => {
  const errors: ValidationError[] = [];
  const {
    stopOnFirstError = false,
    validateAllFields = true,
  } = options;

  for (const [fieldName, rules] of Object.entries(schema)) {
    // フィールドが存在しない場合はスキップ（validateAllFields が false の場合）
    if (!validateAllFields && !(fieldName in data)) {
      continue;
    }

    const value = data[fieldName];
    const result = validateField(fieldName, value, rules);

    if (!result.isValid && result.error) {
      errors.push(result.error);
      
      if (stopOnFirstError) {
        break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * リアルタイムバリデーション用のクラス
 */
export class FormValidator {
  private schema: ValidationSchema;
  private options: FormValidationOptions;
  private fieldErrors: Map<string, ValidationError | null> = new Map();

  constructor(schema: ValidationSchema, options: FormValidationOptions = {}) {
    this.schema = schema;
    this.options = { ...options };
  }

  /**
   * スキーマを更新
   */
  updateSchema(schema: ValidationSchema): void {
    this.schema = schema;
  }

  /**
   * 単一フィールドのリアルタイムバリデーション
   */
  validateFieldRealTime(fieldName: string, value: any): FieldValidationResult {
    const rules = this.schema[fieldName];
    if (!rules) {
      return { isValid: true };
    }

    const result = validateField(fieldName, value, rules);
    
    // エラー状態を更新
    if (result.isValid) {
      this.fieldErrors.set(fieldName, null);
    } else {
      this.fieldErrors.set(fieldName, result.error || null);
    }

    return result;
  }

  /**
   * フォーム全体のバリデーション
   */
  validateAll(data: Record<string, any>): ValidationResult {
    const result = validateForm(data, this.schema, this.options);
    
    // エラー状態を更新
    this.fieldErrors.clear();
    for (const error of result.errors) {
      this.fieldErrors.set(error.field, error);
    }

    return result;
  }

  /**
   * 特定フィールドのエラーを取得
   */
  getFieldError(fieldName: string): ValidationError | null {
    return this.fieldErrors.get(fieldName) || null;
  }

  /**
   * 全てのエラーを取得
   */
  getAllErrors(): ValidationError[] {
    return Array.from(this.fieldErrors.values()).filter(
      (error): error is ValidationError => error !== null
    );
  }

  /**
   * フィールドエラーをクリア
   */
  clearFieldError(fieldName: string): void {
    this.fieldErrors.set(fieldName, null);
  }

  /**
   * 全てのエラーをクリア
   */
  clearAllErrors(): void {
    this.fieldErrors.clear();
  }

  /**
   * フィールドが有効かどうかを確認
   */
  isFieldValid(fieldName: string): boolean {
    return !this.fieldErrors.has(fieldName) || this.fieldErrors.get(fieldName) === null;
  }

  /**
   * フォーム全体が有効かどうかを確認
   */
  isFormValid(): boolean {
    return this.getAllErrors().length === 0;
  }
}

/**
 * バリデーション結果からエラーメッセージを抽出
 */
export const getValidationErrorMessage = (
  result: ValidationResult | FieldValidationResult,
  fieldName?: string
): string | null => {
  if ('errors' in result) {
    // ValidationResult の場合
    if (fieldName) {
      const fieldError = result.errors.find(error => error.field === fieldName);
      return fieldError?.message || null;
    }
    return result.errors[0]?.message || null;
  } else {
    // FieldValidationResult の場合
    return result.error?.message || null;
  }
};

/**
 * 共通バリデーションスキーマ
 */
export const commonSchemas = {
  login: {},
  register: {},
  forgotPassword: {},
  resetPassword: {},
  taskCreation: {},
  taskListCreation: {},
  userSettings: {},
} as const;