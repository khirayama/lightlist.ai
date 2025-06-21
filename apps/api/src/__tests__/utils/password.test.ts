import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  isCommonPassword,
  validatePassword,
} from '../../utils/password';

describe('Password Utils', () => {
  const validPassword = 'TestPass123';
  const weakPassword = 'weak';
  const commonPassword = 'password';
  
  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const hashedPassword = await hashPassword(validPassword);
      
      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).not.toBe(validPassword);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    it('should generate different hashes for the same password', async () => {
      const hash1 = await hashPassword(validPassword);
      const hash2 = await hashPassword(validPassword);
      
      expect(hash1).not.toBe(hash2); // Due to salt
    });

    it('should handle empty password', async () => {
      const hashedPassword = await hashPassword('');
      
      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const hashedPassword = await hashPassword(validPassword);
      const isValid = await verifyPassword(validPassword, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hashedPassword = await hashPassword(validPassword);
      const isValid = await verifyPassword('WrongPassword123', hashedPassword);
      
      expect(isValid).toBe(false);
    });

    it('should reject empty password against hash', async () => {
      const hashedPassword = await hashPassword(validPassword);
      const isValid = await verifyPassword('', hashedPassword);
      
      expect(isValid).toBe(false);
    });

    it('should handle empty hash', async () => {
      const isValid = await verifyPassword(validPassword, '');
      
      expect(isValid).toBe(false);
    });

    it('should handle invalid hash format', async () => {
      const isValid = await verifyPassword(validPassword, 'invalid-hash');
      
      expect(isValid).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const result = validatePasswordStrength('StrongPass123');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePasswordStrength('weakpass123');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePasswordStrength('WEAKPASS123');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('WeakPassword');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password too short', () => {
      const result = validatePasswordStrength('Weak1');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password too long', () => {
      const veryLongPassword = 'A'.repeat(129) + 'a1'; // 131 chars total
      const result = validatePasswordStrength(veryLongPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must not exceed 128 characters');
    });

    it('should handle exactly minimum length password', () => {
      const result = validatePasswordStrength('MinPass1'); // exactly 8 chars
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle exactly maximum length password', () => {
      const exactlyMaxPassword = 'A' + 'a'.repeat(125) + '12'; // exactly 128 chars
      const result = validatePasswordStrength(exactlyMaxPassword);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accumulate multiple errors', () => {
      const result = validatePasswordStrength('abc'); // too short, no uppercase, no number
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
      expect(result.errors).toContain('Password must contain at least one number');
    });
  });

  describe('isCommonPassword', () => {
    it('should detect common passwords', () => {
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

    it('should not flag unique passwords as common', () => {
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

    it('should be case insensitive for common passwords', () => {
      expect(isCommonPassword('PASSWORD')).toBe(true);
      expect(isCommonPassword('Password')).toBe(true);
      expect(isCommonPassword('pAsSwOrD')).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong, non-common password', () => {
      const result = validatePassword('StrongUniquePass123');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password that fails strength requirements', () => {
      const result = validatePassword('weak');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject common password even if strong', () => {
      const result = validatePassword('Password123'); // strong but contains "password"
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is too common, please choose a more secure password');
    });

    it('should accumulate both strength and common password errors', () => {
      const result = validatePassword('password'); // weak AND common
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Password is too common, please choose a more secure password');
    });

    it('should handle edge cases', () => {
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

    it('should validate complex passwords', () => {
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

  describe('Integration Tests', () => {
    it('should handle complete password workflow', async () => {
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

    it('should reject and not hash invalid passwords', () => {
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