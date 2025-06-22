import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  isCommonPassword,
  validatePassword,
} from '../../utils/password';
import {
  optimizedTestHashPassword,
  optimizedTestVerifyPassword,
  getPreComputedHash,
  PRE_COMPUTED_HASHES,
} from '../../utils/password-test';

describe('パスワードユーティリティ', () => {
  const validPassword = 'TestPass123';
  const weakPassword = 'weak';
  const commonPassword = 'password';
  
  describe('hashPassword (軽量テスト)', () => {
    it('パスワードが正常にハッシュ化されること', async () => {
      const hashedPassword = await optimizedTestHashPassword(validPassword);
      
      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).not.toBe(validPassword);
      expect(hashedPassword.startsWith('$test$')).toBe(true); // Test hash format
    });

    it('同じパスワードに対して同じハッシュを生成すること（テスト用固定ソルト）', async () => {
      const hash1 = await optimizedTestHashPassword(validPassword);
      const hash2 = await optimizedTestHashPassword(validPassword);
      
      expect(hash1).toBe(hash2); // Fixed salt for testing
    });

    it('空のパスワードを処理できること', async () => {
      const hashedPassword = await optimizedTestHashPassword('');
      
      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword.startsWith('$test$')).toBe(true);
    });
  });

  describe('hashPassword (本物のbcrypt)', () => {
    it('パスワードが正常にハッシュ化されること（実際のbcrypt）', async () => {
      const hashedPassword = await hashPassword(validPassword);
      
      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).not.toBe(validPassword);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    it('同じパスワードに対して異なるハッシュを生成すること（実際のbcrypt）', async () => {
      const hash1 = await hashPassword(validPassword);
      const hash2 = await hashPassword(validPassword);
      
      expect(hash1).not.toBe(hash2); // Due to salt
    });
  });

  describe('verifyPassword (軽量テスト)', () => {
    it('正しいパスワードを検証できること', async () => {
      const hashedPassword = await optimizedTestHashPassword(validPassword);
      const isValid = await optimizedTestVerifyPassword(validPassword, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('間違ったパスワードを拒否すること', async () => {
      const hashedPassword = await optimizedTestHashPassword(validPassword);
      const isValid = await optimizedTestVerifyPassword('WrongPassword123', hashedPassword);
      
      expect(isValid).toBe(false);
    });

    it('ハッシュに対して空のパスワードを拒否すること', async () => {
      const hashedPassword = await optimizedTestHashPassword(validPassword);
      const isValid = await optimizedTestVerifyPassword('', hashedPassword);
      
      expect(isValid).toBe(false);
    });

    it('空のハッシュを処理できること', async () => {
      const isValid = await optimizedTestVerifyPassword(validPassword, '');
      
      expect(isValid).toBe(false);
    });

    it('無効なハッシュ形式を処理できること', async () => {
      const isValid = await optimizedTestVerifyPassword(validPassword, 'invalid-hash');
      
      expect(isValid).toBe(false);
    });
  });

  describe('verifyPassword (本物のbcrypt)', () => {
    it('正しいパスワードを検証できること（実際のbcrypt）', async () => {
      const hashedPassword = await hashPassword(validPassword);
      const isValid = await verifyPassword(validPassword, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('間違ったパスワードを拒否すること（実際のbcrypt）', async () => {
      const hashedPassword = await hashPassword(validPassword);
      const isValid = await verifyPassword('WrongPassword123', hashedPassword);
      
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

  describe('事前計算済みハッシュ最適化', () => {
    it('事前計算済みハッシュが利用可能なパスワードに対して高速化されること', async () => {
      const preComputedPassword = 'TestPass123';
      
      // 事前計算済みハッシュが存在することを確認
      const preComputedHash = getPreComputedHash(preComputedPassword);
      expect(preComputedHash).toBeDefined();
      expect(preComputedHash).toBe(PRE_COMPUTED_HASHES[preComputedPassword]);
      
      // 最適化されたハッシュ関数が事前計算済みハッシュを返すことを確認
      const optimizedHash = await optimizedTestHashPassword(preComputedPassword);
      expect(optimizedHash).toBe(preComputedHash);
      
      // 最適化された検証関数が正しく動作することを確認
      const isValid = await optimizedTestVerifyPassword(preComputedPassword, optimizedHash);
      expect(isValid).toBe(true);
    });

    it('事前計算済みでないパスワードに対して通常の軽量ハッシュを使用すること', async () => {
      const uniquePassword = 'UniquePassword123';
      
      // 事前計算済みハッシュが存在しないことを確認
      const preComputedHash = getPreComputedHash(uniquePassword);
      expect(preComputedHash).toBeNull();
      
      // 軽量ハッシュ関数が動作することを確認
      const hash = await optimizedTestHashPassword(uniquePassword);
      expect(hash).toBeDefined();
      expect(hash.startsWith('$test$')).toBe(true);
      
      // 検証が正しく動作することを確認
      const isValid = await optimizedTestVerifyPassword(uniquePassword, hash);
      expect(isValid).toBe(true);
    });

    it('全ての事前計算済みハッシュが正しく検証されること', async () => {
      const passwords = Object.keys(PRE_COMPUTED_HASHES);
      
      for (const password of passwords) {
        const hash = PRE_COMPUTED_HASHES[password as keyof typeof PRE_COMPUTED_HASHES];
        const isValid = await optimizedTestVerifyPassword(password, hash);
        expect(isValid).toBe(true);
      }
    });

    it('パフォーマンス比較：事前計算済みハッシュ vs 軽量ハッシュ', async () => {
      const preComputedPassword = 'TestPass123';
      const uniquePassword = 'UniquePassword123';
      const iterations = 10000; // 繰り返し回数を増加
      
      // 事前計算済みハッシュのパフォーマンス測定
      const preComputedStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await optimizedTestHashPassword(preComputedPassword);
      }
      const preComputedTime = performance.now() - preComputedStart;
      
      // 軽量ハッシュのパフォーマンス測定
      const lightweightStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await optimizedTestHashPassword(uniquePassword);
      }
      const lightweightTime = performance.now() - lightweightStart;
      
      // 事前計算済みハッシュの方が高速であることを確認
      expect(preComputedTime).toBeLessThan(lightweightTime);
      
      console.log(`パフォーマンス比較 (${iterations}回):`);
      console.log(`  事前計算済み: ${preComputedTime.toFixed(2)}ms`);
      console.log(`  軽量ハッシュ: ${lightweightTime.toFixed(2)}ms`);
      console.log(`  高速化率: ${((lightweightTime - preComputedTime) / lightweightTime * 100).toFixed(1)}%`);
    });
  });
});