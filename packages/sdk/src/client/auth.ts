import { BaseApiClient } from './base';
import type {
  AuthResponse,
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  ApiResponse,
} from '../types';

/**
 * 認証APIクライアント
 */
export class AuthApiClient extends BaseApiClient {
  /**
   * ユーザー登録
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.post<AuthResponse>('/api/auth/register', data);
    
    // 認証情報を自動的に設定
    this.setAuth(
      response.data.token,
      response.data.refreshToken,
      data.deviceId
    );
    
    return response;
  }

  /**
   * ユーザーログイン
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.post<AuthResponse>('/api/auth/login', data);
    
    // 認証情報を自動的に設定
    this.setAuth(
      response.data.token,
      response.data.refreshToken,
      data.deviceId
    );
    
    return response;
  }

  /**
   * ユーザーログアウト
   */
  async logout(refreshToken?: string, deviceId?: string): Promise<ApiResponse> {
    const body: any = {};
    
    if (refreshToken) {
      body.refreshToken = refreshToken;
    } else if (this.getRefreshToken()) {
      body.refreshToken = this.getRefreshToken();
    }
    
    if (deviceId) {
      body.deviceId = deviceId;
    } else if (this.getDeviceId()) {
      body.deviceId = this.getDeviceId();
    }

    const response = await this.post<ApiResponse>('/api/auth/logout', body, true);
    
    // 認証情報をクリア
    this.clearAuth();
    
    return response;
  }

  /**
   * トークンリフレッシュ（手動）
   */
  async refresh(data?: RefreshTokenRequest): Promise<AuthResponse> {
    const requestData = data || {
      refreshToken: this.getRefreshToken()!,
      deviceId: this.getDeviceId()!,
    };

    if (!requestData.refreshToken || !requestData.deviceId) {
      throw new Error('Refresh token and device ID are required');
    }

    const response = await this.post<AuthResponse>('/api/auth/refresh', requestData);
    
    // 新しい認証情報を設定
    this.setAuth(
      response.data.token,
      response.data.refreshToken,
      requestData.deviceId
    );
    
    return response;
  }

  /**
   * パスワードリセット要求
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse> {
    return this.post<ApiResponse>('/api/auth/forgot-password', data);
  }

  /**
   * パスワードリセット実行
   */
  async resetPassword(data: ResetPasswordRequest): Promise<ApiResponse> {
    return this.post<ApiResponse>('/api/auth/reset-password', data);
  }

  /**
   * パスワード変更
   */
  async changePassword(data: ChangePasswordRequest): Promise<ApiResponse> {
    return this.put<ApiResponse>('/api/auth/change-password', data, true);
  }
}