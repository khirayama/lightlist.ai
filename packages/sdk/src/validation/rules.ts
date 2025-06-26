/**
 * バリデーションルール
 */

import {
  ValidationRule,
  FieldValidationResult,
  ValidationErrorCode,
  PasswordStrength,
  PasswordStrengthResult,
} from './types';

/**
 * 必須フィールドバリデーション
 */
export const required = (message = 'This field is required'): ValidationRule<string> => {
  return (value: string): FieldValidationResult => {
    const trimmedValue = (value || '').trim();
    if (!trimmedValue) {
      return {
        isValid: false,
        error: {
          field: '',
          message,
          code: ValidationErrorCode.REQUIRED,
        },
      };
    }
    return { isValid: true };
  };
};

/**
 * メールアドレスバリデーション
 */
export const email = (message = 'Please enter a valid email address'): ValidationRule<string> => {
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  
  return (value: string): FieldValidationResult => {
    if (!value) {
      return { isValid: true }; // 空文字は許可（requiredルールと組み合わせて使用）
    }
    
    if (!emailRegex.test(value)) {
      return {
        isValid: false,
        error: {
          field: '',
          message,
          code: ValidationErrorCode.EMAIL_INVALID,
        },
      };
    }
    return { isValid: true };
  };
};

/**
 * 最小文字数バリデーション
 */
export const minLength = (min: number, message?: string): ValidationRule<string> => {
  return (value: string): FieldValidationResult => {
    if (!value) {
      return { isValid: true }; // 空文字は許可
    }
    
    if (value.length < min) {
      return {
        isValid: false,
        error: {
          field: '',
          message: message || `Must be at least ${min} characters`,
          code: ValidationErrorCode.TEXT_TOO_SHORT,
        },
      };
    }
    return { isValid: true };
  };
};

/**
 * 最大文字数バリデーション
 */
export const maxLength = (max: number, message?: string): ValidationRule<string> => {
  return (value: string): FieldValidationResult => {
    if (!value) {
      return { isValid: true }; // 空文字は許可
    }
    
    if (value.length > max) {
      return {
        isValid: false,
        error: {
          field: '',
          message: message || `Must be no more than ${max} characters`,
          code: ValidationErrorCode.TEXT_TOO_LONG,
        },
      };
    }
    return { isValid: true };
  };
};

/**
 * パスワード強度を計算
 */
export const calculatePasswordStrength = (password: string): PasswordStrengthResult => {
  if (!password) {
    return {
      strength: PasswordStrength.WEAK,
      score: 0,
      suggestions: ['Enter a password'],
    };
  }

  let score = 0;
  const suggestions: string[] = [];

  // 長さ
  if (password.length >= 8) {
    score += 25;
  } else {
    suggestions.push('Use at least 8 characters');
  }

  if (password.length >= 12) {
    score += 15;
  }

  // 小文字
  if (/[a-z]/.test(password)) {
    score += 15;
  } else {
    suggestions.push('Include lowercase letters');
  }

  // 大文字
  if (/[A-Z]/.test(password)) {
    score += 15;
  } else {
    suggestions.push('Include uppercase letters');
  }

  // 数字
  if (/\d/.test(password)) {
    score += 15;
  } else {
    suggestions.push('Include numbers');
  }

  // 特殊文字
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 15;
  } else {
    suggestions.push('Include special characters');
  }

  // 強度判定
  let strength: PasswordStrength;
  if (score < 40) {
    strength = PasswordStrength.WEAK;
  } else if (score < 70) {
    strength = PasswordStrength.MEDIUM;
  } else {
    strength = PasswordStrength.STRONG;
  }

  return {
    strength,
    score: Math.min(score, 100),
    suggestions,
  };
};

/**
 * パスワード強度バリデーション
 */
export const passwordStrength = (
  minStrength: PasswordStrength = PasswordStrength.MEDIUM,
  message?: string
): ValidationRule<string> => {
  return (value: string): FieldValidationResult => {
    if (!value) {
      return { isValid: true }; // 空文字は許可
    }

    const result = calculatePasswordStrength(value);
    
    const strengthLevels = {
      [PasswordStrength.WEAK]: 1,
      [PasswordStrength.MEDIUM]: 2,
      [PasswordStrength.STRONG]: 3,
    };

    if (strengthLevels[result.strength] < strengthLevels[minStrength]) {
      return {
        isValid: false,
        error: {
          field: '',
          message: message || `Password is too weak. ${result.suggestions.join(', ')}.`,
          code: ValidationErrorCode.PASSWORD_TOO_WEAK,
        },
      };
    }

    return { isValid: true };
  };
};

/**
 * パスワード確認バリデーション
 */
export const confirmPassword = (
  passwordValue: string,
  message = 'Passwords do not match'
): ValidationRule<string> => {
  return (value: string): FieldValidationResult => {
    if (!value) {
      return { isValid: true }; // 空文字は許可
    }

    if (value !== passwordValue) {
      return {
        isValid: false,
        error: {
          field: '',
          message,
          code: ValidationErrorCode.PASSWORDS_DONT_MATCH,
        },
      };
    }

    return { isValid: true };
  };
};

/**
 * タスクテキストバリデーション
 */
export const taskText = (message = 'Task text is required'): ValidationRule<string> => {
  return (value: string): FieldValidationResult => {
    const trimmedValue = (value || '').trim();
    
    if (!trimmedValue) {
      return {
        isValid: false,
        error: {
          field: '',
          message,
          code: ValidationErrorCode.REQUIRED,
        },
      };
    }

    if (trimmedValue.length > 500) {
      return {
        isValid: false,
        error: {
          field: '',
          message: 'Task text must be 500 characters or less',
          code: ValidationErrorCode.TEXT_TOO_LONG,
        },
      };
    }

    return { isValid: true };
  };
};

/**
 * タスクリスト名バリデーション
 */
export const taskListName = (message = 'Task list name is required'): ValidationRule<string> => {
  return (value: string): FieldValidationResult => {
    const trimmedValue = (value || '').trim();
    
    if (!trimmedValue) {
      return {
        isValid: false,
        error: {
          field: '',
          message,
          code: ValidationErrorCode.REQUIRED,
        },
      };
    }

    if (trimmedValue.length > 100) {
      return {
        isValid: false,
        error: {
          field: '',
          message: 'Task list name must be 100 characters or less',
          code: ValidationErrorCode.TEXT_TOO_LONG,
        },
      };
    }

    return { isValid: true };
  };
};