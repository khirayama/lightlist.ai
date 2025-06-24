// Types
export * from './types';

// API Clients
export { BaseApiClient, ApiClientError } from './client/base';
export { AuthApiClient } from './client/auth';

// Utilities
export * from './utils';

// Import for internal use
import { AuthApiClient } from './client/auth';

// Main SDK class
export class LightlistSDK {
  public readonly auth: AuthApiClient;

  constructor(baseUrl: string) {
    this.auth = new AuthApiClient(baseUrl);
  }

  /**
   * 認証状態をチェック
   */
  isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  /**
   * 認証情報を設定
   */
  setAuth(accessToken: string, refreshToken: string, deviceId: string): void {
    this.auth.setAuth(accessToken, refreshToken, deviceId);
  }

  /**
   * 認証情報をクリア
   */
  clearAuth(): void {
    this.auth.clearAuth();
  }

  /**
   * 現在のアクセストークンを取得
   */
  getAccessToken(): string | null {
    return this.auth.getAccessToken();
  }

  /**
   * 現在のリフレッシュトークンを取得
   */
  getRefreshToken(): string | null {
    return this.auth.getRefreshToken();
  }

  /**
   * 現在のデバイスIDを取得
   */
  getDeviceId(): string | null {
    return this.auth.getDeviceId();
  }
}