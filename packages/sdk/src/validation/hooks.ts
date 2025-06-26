/**
 * React用バリデーションフック
 */

import { useState, useCallback, useMemo } from 'react';
import {
  ValidationSchema,
  ValidationResult,
  FieldValidationResult,
  ValidationError,
  FormValidationOptions,
} from './types';
import { FormValidator, getValidationErrorMessage } from './validator';

/**
 * フォームバリデーション用フック
 */
export const useFormValidation = (
  schema: ValidationSchema,
  options: FormValidationOptions = {}
) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validator = useMemo(
    () => new FormValidator(schema, options),
    [schema, options]
  );

  /**
   * フィールドのバリデーション（リアルタイム）
   */
  const validateField = useCallback(
    (fieldName: string, value: any): boolean => {
      const result = validator.validateFieldRealTime(fieldName, value);
      
      setErrors(prev => ({
        ...prev,
        [fieldName]: result.isValid ? '' : (result.error?.message || ''),
      }));

      return result.isValid;
    },
    [validator]
  );

  /**
   * フィールドにタッチ状態を設定
   */
  const setFieldTouched = useCallback((fieldName: string, isTouched = true) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: isTouched,
    }));
  }, []);

  /**
   * フォーム全体のバリデーション
   */
  const validateForm = useCallback(
    (data: Record<string, any>): boolean => {
      const result = validator.validateAll(data);
      
      // 全フィールドをタッチ状態に
      const allFields = Object.keys(schema);
      const newTouched = allFields.reduce((acc, field) => {
        acc[field] = true;
        return acc;
      }, {} as Record<string, boolean>);
      
      setTouched(newTouched);

      // エラー状態を更新
      const newErrors = allFields.reduce((acc, field) => {
        const error = validator.getFieldError(field);
        acc[field] = error?.message || '';
        return acc;
      }, {} as Record<string, string>);
      
      setErrors(newErrors);

      return result.isValid;
    },
    [validator, schema]
  );

  /**
   * フィールドエラーをクリア
   */
  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: '',
    }));
    validator.clearFieldError(fieldName);
  }, [validator]);

  /**
   * 全エラーをクリア
   */
  const clearAllErrors = useCallback(() => {
    setErrors({});
    setTouched({});
    validator.clearAllErrors();
  }, [validator]);

  /**
   * フィールドエラーを取得
   */
  const getFieldError = useCallback(
    (fieldName: string): string | null => {
      return touched[fieldName] ? (errors[fieldName] || null) : null;
    },
    [errors, touched]
  );

  /**
   * フィールドが有効かどうか
   */
  const isFieldValid = useCallback(
    (fieldName: string): boolean => {
      return !touched[fieldName] || !errors[fieldName];
    },
    [errors, touched]
  );

  /**
   * フォームが有効かどうか
   */
  const isFormValid = useMemo(() => {
    return Object.values(errors).every(error => !error);
  }, [errors]);

  /**
   * 送信中状態の管理
   */
  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting);
  }, []);

  return {
    // バリデーション関数
    validateField,
    validateForm,
    clearFieldError,
    clearAllErrors,
    
    // 状態管理
    setFieldTouched,
    setSubmitting,
    
    // 状態取得
    getFieldError,
    isFieldValid,
    isFormValid,
    isSubmitting,
    
    // 生の状態（デバッグ用）
    errors,
    touched,
  };
};

/**
 * 単一フィールドバリデーション用フック
 */
export const useFieldValidation = (
  fieldName: string,
  rules: any[],
  options: { validateOnChange?: boolean; validateOnBlur?: boolean } = {}
) => {
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  
  const { validateOnChange = true, validateOnBlur = true } = options;

  const validate = useCallback(
    (value: any): boolean => {
      const validator = new FormValidator({ [fieldName]: rules });
      const result = validator.validateFieldRealTime(fieldName, value);
      
      setError(result.isValid ? null : (result.error?.message || null));
      return result.isValid;
    },
    [fieldName, rules]
  );

  const handleChange = useCallback(
    (value: any) => {
      if (validateOnChange && touched) {
        validate(value);
      }
    },
    [validate, validateOnChange, touched]
  );

  const handleBlur = useCallback(
    (value: any) => {
      setTouched(true);
      if (validateOnBlur) {
        validate(value);
      }
    },
    [validate, validateOnBlur]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    touched,
    isValid: !error,
    validate,
    handleChange,
    handleBlur,
    clearError,
  };
};

/**
 * パスワード強度表示用フック
 */
export const usePasswordStrength = () => {
  const [strength, setStrength] = useState<{
    score: number;
    level: 'weak' | 'medium' | 'strong';
    suggestions: string[];
  }>({
    score: 0,
    level: 'weak',
    suggestions: [],
  });

  const checkStrength = useCallback((password: string) => {
    // パスワード強度計算のロジック
    let score = 0;
    const suggestions: string[] = [];

    if (password.length >= 8) score += 25;
    else suggestions.push('Use at least 8 characters');

    if (/[a-z]/.test(password)) score += 15;
    else suggestions.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 15;
    else suggestions.push('Include uppercase letters');

    if (/\d/.test(password)) score += 15;
    else suggestions.push('Include numbers');

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;
    else suggestions.push('Include special characters');

    if (password.length >= 12) score += 15;

    let level: 'weak' | 'medium' | 'strong';
    if (score < 40) level = 'weak';
    else if (score < 70) level = 'medium';
    else level = 'strong';

    setStrength({
      score: Math.min(score, 100),
      level,
      suggestions,
    });

    return { score: Math.min(score, 100), level, suggestions };
  }, []);

  return {
    strength,
    checkStrength,
  };
};