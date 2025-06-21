import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  isCommonPassword,
  validatePassword,
} from '../../utils/password';

describe('パスワードユーティリティ', () => {
  const validPassword = 'TestPass123';
  const weakPassword = 'weak';
  const commonPassword = 'password';
  
  describe('hashPassword', () => {
    it('パスワードが正常にハッシュ化されること', async () => {
      const hashedPassword = await hashPassword(validPassword);
      
      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).not.toBe(validPassword);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    it('同じパスワードに対して異なるハッシュを生成すること', async () => {
      const hash1 = await hashPassword(validPassword);
      const hash2 = await hashPassword(validPassword);
      
      expect(hash1).not.toBe(hash2); // Due to salt
    });

    it('空のパスワードを処理できること', async () => {
      const hashedPassword = await hashPassword('');
      
      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
    });
  });

  describe('verifyPassword', () => {
    it('正しいパスワードを検証できること', async () => {
      const hashedPassword = await hashPassword(validPassword);
      const isValid = await verifyPassword(validPassword, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('間違ったパスワードを拒否すること', async () => {
      const hashedPassword = await hashPassword(validPassword);
      const isValid = await verifyPassword('WrongPassword123', hashedPassword);
      
      expect(isValid).toBe(false);
    });

    it('ハッシュに対して空のパスワードを拒否すること', async () => {
      const hashedPassword = await hashPassword(validPassword);
      const isValid = await verifyPassword('', hashedPassword);
      
      expect(isValid).toBe(false);
    });

    it('空のハッシュを処理できること', async () => {
      const isValid = await verifyPassword(validPassword, '');
      
      expect(isValid).toBe(false);
    });

    it('無効なハッシュ形式を処理できること', async () => {
      const isValid = await verifyPassword(validPassword, 'invalid-hash');
      
      expect(isValid).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('強力なパスワードを検証できること', () => {
      const result = validatePasswordStrength('StrongPass123');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('大文字が含まれないパスワードを拒否すること', () => {
      const result = validatePasswordStrength('weakpass123');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('小文字が含まれないパスワードを拒否すること', () => {
      const result = validatePasswordStrength('WEAKPASS123');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('数字が含まれないパスワードを拒否すること', () => {
      const result = validatePasswordStrength('WeakPassword');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('短すぎるパスワードを拒否すること', () => {
      const result = validatePasswordStrength('Weak1');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('長すぎるパスワードを拒否すること', () => {
      const veryLongPassword = 'A'.repeat(129) + 'a1'; // 131 chars total
      const result = validatePasswordStrength(veryLongPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must not exceed 128 characters');
    });

    it('最小長さのパスワードを処理できること', () => {
      const result = validatePasswordStrength('MinPass1'); // exactly 8 chars
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('最大長さのパスワードを処理できること', () => {
      const exactlyMaxPassword = 'A' + 'a'.repeat(125) + '12'; // exactly 128 chars
      const result = validatePasswordStrength(exactlyMaxPassword);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('複数のエラーを蓄積すること', () => {
      const result = validatePasswordStrength('abc'); // too short, no uppercase, no number
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
      expect(result.errors).toContain('Password must contain at least one number');
    });
  });

  describe('isCommonPassword', () => {
    it('一般的なパスワードを検出すること', () => {
      const commonPasswords = [
        'password',
        'Password',
        'PASSWORD',
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
      
      commonPasswords.forEach(password => {
        expect(isCommonPassword(password)).toBe(true);
      });
    });

    it('ユニークなパスワードを一般的として判定しないこと', () => {
      const uniquePasswords = [
        'MyUniquePass123',
        'ComplexPassword456',
        'NotCommon789',
        'SpecialPassword2023',
      ];
      
      uniquePasswords.forEach(password => {
        expect(isCommonPassword(password)).toBe(false);
      });
    });

    it('一般的なパスワードで大文字小文字を区別しないこと', () => {
      expect(isCommonPassword('PASSWORD')).toBe(true);
      expect(isCommonPassword('Password')).toBe(true);
      expect(isCommonPassword('pAsSwOrD')).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('強力で一般的でないパスワードを検証できること', () => {
      const result = validatePassword('StrongUniquePass123');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('強度要件を満たさないパスワードを拒否すること', () => {
      const result = validatePassword('weak');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('強力でも一般的なパスワードを拒否すること', () => {
      const result = validatePassword('Password123'); // strong but contains "password"
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is too common, please choose a more secure password');
    });

    it('強度エラーと一般的パスワードエラーの両方を蓄積すること', () => {
      const result = validatePassword('password'); // weak AND common
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Password is too common, please choose a more secure password');
    });

    it('エッジケースを処理できること', () => {
      const edgeCases = [
        '',
        ' ',
        'a',
        'A1',
        'password1',
        'PASSWORD1',
      ];
      
      edgeCases.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('複雑なパスワードを検証できること', () => {
      const complexPasswords = [
        'MySecure#Pass2023!',
        'Complex$Password456',
        'StrongAuth&Key789',
        'Unique^Passphrase012',
      ];
      
      complexPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('統合テスト', () => {
    it('完全なパスワードワークフローを処理できること', async () => {
      const password = 'SecureTestPass123';
      
      // Validate password
      const validation = validatePassword(password);
      expect(validation.isValid).toBe(true);
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      expect(hashedPassword).toBeDefined();
      
      // Verify correct password
      const isValidCorrect = await verifyPassword(password, hashedPassword);
      expect(isValidCorrect).toBe(true);
      
      // Verify incorrect password
      const isValidIncorrect = await verifyPassword('WrongPassword', hashedPassword);
      expect(isValidIncorrect).toBe(false);
    });

    it('無効なパスワードを拒否してハッシュ化しないこと', () => {
      const invalidPasswords = [
        'weak',
        'password',
        'Password',
        'PASSWORD123',
        'onlylowercase',
        'ONLYUPPERCASE',
        '123456789',
      ];
      
      invalidPasswords.forEach(password => {
        const validation = validatePassword(password);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });
  });
});