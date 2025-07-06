import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../index';
import { AuthServiceImpl } from '../auth.service';
import { setupServiceTests, mockHttpClient, mockStorage, mockAuthSession, TEST_BASE_URL } from './setup';

describe('AuthService', () => {
  let authService: AuthService;

  setupServiceTests();

  beforeEach(() => {
    authService = new AuthServiceImpl(mockHttpClient, mockStorage, TEST_BASE_URL);
  });

  describe('register', () => {
    it('有効な認証情報でユーザー登録が成功する', async () => {
      // Arrange
      const credential = {
        email: 'test@example.com',
        password: 'password123',
        deviceId: 'device-123'
      };
      
      mockHttpClient.post.mockResolvedValue({
        data: mockAuthSession,
        message: 'User registered successfully'
      });

      // Act
      const result = await authService.register(credential);

      // Assert
      expect(result.data).toEqual(mockAuthSession);
      expect(result.message).toBe('User registered successfully');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/register', credential);
    });

    it('無効なメールアドレスでバリデーションエラーが発生する', async () => {
      // Arrange
      const credential = {
        email: 'invalid-email',
        password: 'password123',
        deviceId: 'device-123'
      };

      // Act & Assert
      await expect(authService.register(credential)).rejects.toThrow('Invalid email format');
    });

    it('短すぎるパスワードでバリデーションエラーが発生する', async () => {
      // Arrange
      const credential = {
        email: 'test@example.com',
        password: '123',
        deviceId: 'device-123'
      };

      // Act & Assert
      await expect(authService.register(credential)).rejects.toThrow('Password must be at least 8 characters long');
    });

    it('デバイスIDなしでバリデーションエラーが発生する', async () => {
      // Arrange
      const credential = {
        email: 'test@example.com',
        password: 'password123',
        deviceId: ''
      };

      // Act & Assert
      await expect(authService.register(credential)).rejects.toThrow('Device ID is required');
    });
  });

  describe('login', () => {
    it('有効な認証情報でログインが成功する', async () => {
      // Arrange
      const credential = {
        email: 'test@example.com',
        password: 'password123',
        deviceId: 'device-123'
      };
      
      mockHttpClient.post.mockResolvedValue({
        data: mockAuthSession,
        message: 'Login successful'
      });

      // Act
      const result = await authService.login(credential);

      // Assert
      expect(result.data).toEqual(mockAuthSession);
      expect(result.message).toBe('Login successful');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/login', credential);
      expect(mockStorage.setItem).toHaveBeenCalledWith('accessToken', mockAuthSession.accessToken);
      expect(mockStorage.setItem).toHaveBeenCalledWith('refreshToken', mockAuthSession.refreshToken);
    });

    it('無効な認証情報でログインが失敗する', async () => {
      // Arrange
      const credential = {
        email: 'test@example.com',
        password: 'wrongpassword',
        deviceId: 'device-123'
      };
      
      mockHttpClient.post.mockRejectedValue(new Error('Unauthorized'));

      // Act & Assert
      await expect(authService.login(credential)).rejects.toThrow('Unauthorized');
    });
  });

  describe('logout', () => {
    it('ログアウトが成功してトークンが削除される', async () => {
      // Arrange
      mockHttpClient.post.mockResolvedValue({
        data: null,
        message: 'Logout successful'
      });

      // Act
      const result = await authService.logout();

      // Assert
      expect(result.message).toBe('Logout successful');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/logout');
      expect(mockStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(mockStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    });
  });

  describe('refresh', () => {
    it('リフレッシュトークンでアクセストークンが更新される', async () => {
      // Arrange
      const refreshToken = 'refresh-token-123';
      const newAuthSession = {
        ...mockAuthSession,
        accessToken: 'new-access-token'
      };
      
      mockHttpClient.post.mockResolvedValue({
        data: newAuthSession,
        message: 'Token refreshed successfully'
      });

      // Act
      const result = await authService.refresh(refreshToken);

      // Assert
      expect(result.data).toEqual(newAuthSession);
      expect(result.message).toBe('Token refreshed successfully');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken });
      expect(mockStorage.setItem).toHaveBeenCalledWith('accessToken', newAuthSession.accessToken);
      expect(mockStorage.setItem).toHaveBeenCalledWith('refreshToken', newAuthSession.refreshToken);
    });

    it('無効なリフレッシュトークンでエラーが発生する', async () => {
      // Arrange
      const refreshToken = 'invalid-refresh-token';
      mockHttpClient.post.mockRejectedValue(new Error('Invalid refresh token'));

      // Act & Assert
      await expect(authService.refresh(refreshToken)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('forgotPassword', () => {
    it('パスワードリセットメールが送信される', async () => {
      // Arrange
      const email = 'test@example.com';
      mockHttpClient.post.mockResolvedValue({
        data: null,
        message: 'Password reset email sent'
      });

      // Act
      const result = await authService.forgotPassword(email);

      // Assert
      expect(result.message).toBe('Password reset email sent');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/forgot-password', { email });
    });

    it('無効なメールアドレスでバリデーションエラーが発生する', async () => {
      // Arrange
      const email = 'invalid-email';

      // Act & Assert
      await expect(authService.forgotPassword(email)).rejects.toThrow('Invalid email format');
    });
  });

  describe('resetPassword', () => {
    it('パスワードリセットが成功する', async () => {
      // Arrange
      const token = 'reset-token-123';
      const password = 'newpassword123';
      mockHttpClient.post.mockResolvedValue({
        data: null,
        message: 'Password reset successful'
      });

      // Act
      const result = await authService.resetPassword(token, password);

      // Assert
      expect(result.message).toBe('Password reset successful');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/reset-password', { token, password });
    });

    it('無効なトークンでエラーが発生する', async () => {
      // Arrange
      const token = '';
      const password = 'newpassword123';

      // Act & Assert
      await expect(authService.resetPassword(token, password)).rejects.toThrow();
    });
  });
});