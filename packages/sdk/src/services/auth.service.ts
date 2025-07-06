import { AuthService } from '../index';
import { AuthCredential, AuthSession, ApiResponse } from '../../types';
import { ServiceBase } from './base/service-base';
import { HttpClient } from '../base/http-client';

// セッションストレージのインターフェース（Web/Native抽象化）
interface SessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class AuthServiceImpl extends ServiceBase implements AuthService {
  constructor(
    httpClient: HttpClient,
    private storage: SessionStorage
  ) {
    super(httpClient);
  }

  async register(credential: AuthCredential): Promise<ApiResponse<AuthSession>> {
    try {
      // バリデーション
      this.validateAuthCredential(credential);

      // API呼び出し
      const response = await this.httpClient.post<AuthSession>('/auth/register', credential);
      
      // トークンの保存
      await this.saveTokens(response.data);

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async login(credential: AuthCredential): Promise<ApiResponse<AuthSession>> {
    try {
      // バリデーション
      this.validateAuthCredential(credential);

      // API呼び出し
      const response = await this.httpClient.post<AuthSession>('/auth/login', credential);
      
      console.log('Login response received:', {
        accessToken: response.data.accessToken?.substring(0, 20) + '...',
        refreshToken: response.data.refreshToken?.substring(0, 20) + '...',
        deviceId: response.data.deviceId
      });
      
      // トークンの保存
      await this.saveTokens(response.data);

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async logout(): Promise<ApiResponse<void>> {
    try {
      // refreshTokenを取得してAPIに送信
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw this.createError('auth', 'NO_REFRESH_TOKEN', 'No refresh token available for logout');
      }
      
      // API呼び出し
      const response = await this.httpClient.post<void>('/auth/logout', { refreshToken });
      
      // トークンの削除
      await this.clearTokens();

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async refresh(refreshToken: string): Promise<ApiResponse<AuthSession>> {
    try {
      // バリデーション
      if (!refreshToken || typeof refreshToken !== 'string') {
        throw this.createError('validation', 'INVALID_REFRESH_TOKEN', 'Refresh token is required');
      }

      console.log('Refreshing with token:', refreshToken.substring(0, 20) + '...');

      // API呼び出し
      const response = await this.httpClient.post<AuthSession>('/auth/refresh', { refreshToken });
      
      // トークンの更新
      await this.saveTokens(response.data);

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async forgotPassword(email: string): Promise<ApiResponse<void>> {
    try {
      // バリデーション
      this.validateEmail(email);

      // API呼び出し
      const response = await this.httpClient.post<void>('/auth/forgot-password', { email });

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse<void>> {
    try {
      // バリデーション
      if (!token || typeof token !== 'string' || token.trim() === '') {
        throw this.createError('validation', 'INVALID_TOKEN', 'Reset token is required');
      }
      this.validatePassword(password);

      // API呼び出し
      const response = await this.httpClient.post<void>('/auth/reset-password', { token, password });

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async deleteUser(): Promise<ApiResponse<void>> {
    try {
      // API呼び出し
      const response = await this.httpClient.delete<void>('/auth/user');
      
      // トークンの削除
      await this.clearTokens();

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateEmail(credential: AuthCredential): Promise<ApiResponse<void>> {
    try {
      // バリデーション
      this.validateAuthCredential(credential);

      // API呼び出し
      const response = await this.httpClient.put<void>('/auth/email', credential);

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updatePassword(credential: AuthCredential): Promise<ApiResponse<void>> {
    try {
      // バリデーション
      this.validateAuthCredential(credential);

      // API呼び出し
      const response = await this.httpClient.put<void>('/auth/password', credential);

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  // プライベートメソッド
  private validateAuthCredential(credential: AuthCredential): void {
    this.validateEmail(credential.email);
    this.validatePassword(credential.password);
    this.validateDeviceId(credential.deviceId);
  }

  private async saveTokens(authSession: AuthSession): Promise<void> {
    try {
      console.log('Saving tokens:', {
        accessToken: authSession.accessToken?.substring(0, 20) + '...',
        refreshToken: authSession.refreshToken?.substring(0, 20) + '...',
        deviceId: authSession.deviceId
      });
      this.storage.setItem('accessToken', authSession.accessToken);
      this.storage.setItem('refreshToken', authSession.refreshToken);
      this.storage.setItem('deviceId', authSession.deviceId);
      console.log('Tokens saved successfully');
    } catch (error) {
      console.error('Failed to save tokens:', error);
      throw this.createError('unknown', 'STORAGE_ERROR', 'Failed to save tokens', { error });
    }
  }

  private async clearTokens(): Promise<void> {
    try {
      this.storage.removeItem('accessToken');
      this.storage.removeItem('refreshToken');
      this.storage.removeItem('deviceId');
    } catch (error) {
      throw this.createError('unknown', 'STORAGE_ERROR', 'Failed to clear tokens', { error });
    }
  }

  // トークン取得メソッド（他のサービスから使用）
  public getAccessToken(): string | null {
    return this.storage.getItem('accessToken');
  }

  public getRefreshToken(): string | null {
    return this.storage.getItem('refreshToken');
  }

  public getDeviceId(): string | null {
    return this.storage.getItem('deviceId');
  }
}