import { describe, it, expect, beforeEach } from 'vitest';
import { AuthActions } from '../index';
import { AuthActionsImpl } from '../auth-actions';
import { 
  setupActionsTests, 
  mockAuthService, 
  mockStore, 
  mockAuthSession, 
  mockAppError,
  createSuccessResult,
  createFailureResult,
  expectActionSuccess,
  expectActionFailure,
  createApiResponse
} from './setup';

describe('AuthActions', () => {
  let authActions: AuthActions;

  setupActionsTests();

  beforeEach(() => {
    authActions = new AuthActionsImpl(mockAuthService, mockStore);
  });

  describe('register', () => {
    it('有効な認証情報でユーザー登録が成功し、ストアが更新される', async () => {
      // Arrange
      const credential = {
        email: 'test@example.com',
        password: 'password123',
        deviceId: 'device-123'
      };

      // AuthService のモック設定
      mockAuthService.register.mockResolvedValue(createApiResponse(mockAuthSession));

      // Act
      const result = await authActions.register(credential);

      // Assert
      const data = expectActionSuccess(result);
      expect(data).toEqual(mockAuthSession);
      
      // AuthService が正しく呼び出されたか確認
      expect(mockAuthService.register).toHaveBeenCalledWith(credential);
      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
      
      // Store が更新されたか確認
      expect(mockStore.setState).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('ネットワークエラーの場合、エラーを返す', async () => {
      // Arrange
      const credential = {
        email: 'test@example.com',
        password: 'password123',
        deviceId: 'device-123'
      };

      // AuthService がエラーを返すようにモック設定
      mockAuthService.register.mockRejectedValue(
        new Error('Network error')
      );

      // Act
      const result = await authActions.register(credential);

      // Assert
      const error = expectActionFailure(result);
      expect(error.type).toBe('network');
      expect(error.message).toContain('Network error');
      
      // Store が更新されていないか確認
      expect(mockStore.setState).not.toHaveBeenCalled();
    });

    it('バリデーションエラーの場合、エラーを返す', async () => {
      // Arrange
      const credential = {
        email: 'invalid-email',
        password: '123', // 短すぎるパスワード
        deviceId: 'device-123'
      };

      // AuthService がバリデーションエラーを返すようにモック設定
      const validationError = new Error('Invalid email format');
      (validationError as any).status = 400;
      mockAuthService.register.mockRejectedValue(validationError);

      // Act
      const result = await authActions.register(credential);

      // Assert
      const error = expectActionFailure(result);
      expect(error.type).toBe('validation');
      expect(error.message).toContain('Invalid email format');
    });
  });

  describe('login', () => {
    it('有効な認証情報でログインが成功し、ストアが更新される', async () => {
      // Arrange
      const credential = {
        email: 'test@example.com',
        password: 'password123',
        deviceId: 'device-123'
      };

      // AuthService のモック設定
      mockAuthService.login.mockResolvedValue(createApiResponse(mockAuthSession));

      // Act
      const result = await authActions.login(credential);

      // Assert
      const data = expectActionSuccess(result);
      expect(data).toEqual(mockAuthSession);
      
      // AuthService が正しく呼び出されたか確認
      expect(mockAuthService.login).toHaveBeenCalledWith(credential);
      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
      
      // Store が更新されたか確認
      expect(mockStore.setState).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('認証失敗の場合、エラーを返す', async () => {
      // Arrange
      const credential = {
        email: 'test@example.com',
        password: 'wrong-password',
        deviceId: 'device-123'
      };

      // AuthService が認証エラーを返すようにモック設定
      const authError = new Error('Invalid credentials');
      (authError as any).status = 401;
      mockAuthService.login.mockRejectedValue(authError);

      // Act
      const result = await authActions.login(credential);

      // Assert
      const error = expectActionFailure(result);
      expect(error.type).toBe('auth');
      expect(error.message).toContain('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('ログアウトが成功し、ストアがクリアされる', async () => {
      // Arrange
      mockAuthService.logout.mockResolvedValue(undefined);

      // Act
      const result = await authActions.logout();

      // Assert
      expectActionSuccess(result);
      
      // AuthService が正しく呼び出されたか確認
      expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
      
      // Store がクリアされたか確認
      expect(mockStore.setState).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });

  describe('bootstrap', () => {
    it('ブートストラップが成功し、ストアが初期化される', async () => {
      // Act
      const result = await authActions.bootstrap();

      // Assert
      expectActionSuccess(result);
      
      // Store の初期化が確認される
      expect(mockStore.setState).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });
});