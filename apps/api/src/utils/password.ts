import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * パスワードをハッシュ化
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * パスワードを検証
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * パスワード強度をチェック
 * 要件: 大文字・小文字・数字を含む、8文字以上
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 最小長チェック
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // 大文字を含むかチェック
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // 小文字を含むかチェック
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // 数字を含むかチェック
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // 最大長チェック（セキュリティ上の理由で制限）
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * パスワードが一般的すぎるかをチェック
 */
export function isCommonPassword(password: string): boolean {
  const commonPasswords = [
    'password',
    '12345678',
    'qwerty',
    'abc123',
    'password123',
    'admin',
    'letmein',
    'welcome',
    'monkey',
    '1234567890',
  ];

  return commonPasswords.includes(password.toLowerCase());
}

/**
 * 包括的なパスワード検証
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const strengthCheck = validatePasswordStrength(password);
  const errors = [...strengthCheck.errors];

  // 一般的なパスワードチェック
  if (isCommonPassword(password)) {
    errors.push('Password is too common, please choose a more secure password');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
