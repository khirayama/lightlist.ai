// Types
export * from './types';

// API Clients
export { BaseApiClient, ApiClientError } from './client/base';
export { AuthApiClient } from './client/auth';
export { TaskListApiClient } from './client/task-list';
export { TaskApiClient } from './client/task';
export { UserApiClient } from './client/user';
export { ShareApiClient } from './client/share';

// Utilities
export * from './utils';

// Import for internal use
import { AuthApiClient } from './client/auth';
import { TaskListApiClient } from './client/task-list';
import { TaskApiClient } from './client/task';
import { UserApiClient } from './client/user';
import { ShareApiClient } from './client/share';

// Main SDK class
export class LightlistSDK {
  public readonly auth: AuthApiClient;
  public readonly taskList: TaskListApiClient;
  public readonly task: TaskApiClient;
  public readonly user: UserApiClient;
  public readonly share: ShareApiClient;

  constructor(baseUrl: string) {
    this.auth = new AuthApiClient(baseUrl);
    this.taskList = new TaskListApiClient(baseUrl);
    this.task = new TaskApiClient(baseUrl);
    this.user = new UserApiClient(baseUrl);
    this.share = new ShareApiClient(baseUrl);
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
    this.taskList.setAuth(accessToken, refreshToken, deviceId);
    this.task.setAuth(accessToken, refreshToken, deviceId);
    this.user.setAuth(accessToken, refreshToken, deviceId);
    this.share.setAuth(accessToken, refreshToken, deviceId);
  }

  /**
   * 認証情報をクリア
   */
  clearAuth(): void {
    this.auth.clearAuth();
    this.taskList.clearAuth();
    this.task.clearAuth();
    this.user.clearAuth();
    this.share.clearAuth();
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