import { BaseApiClient } from './base';
import type {
  User,
  AppSettings,
  UserSettings,
  UpdateProfileRequest,
  UpdateAppSettingsRequest,
  UpdateUserSettingsRequest,
  ChangePasswordRequest,
  ApiResponse,
} from '../types';

/**
 * ユーザーAPIクライアント
 */
export class UserApiClient extends BaseApiClient {
  /**
   * ユーザープロフィール取得
   */
  async getProfile(userId: string): Promise<ApiResponse<{ user: User }>> {
    return this.get<ApiResponse<{ user: User }>>(
      `/api/users/${userId}/profile`,
      true
    );
  }

  /**
   * ユーザープロフィール更新
   */
  async updateProfile(
    userId: string,
    data: UpdateProfileRequest
  ): Promise<ApiResponse<{ user: User }>> {
    return this.put<ApiResponse<{ user: User }>>(
      `/api/users/${userId}/profile`,
      data,
      true
    );
  }

  /**
   * アカウント削除
   */
  async deleteAccount(userId: string): Promise<ApiResponse> {
    return this.delete<ApiResponse>(`/api/users/${userId}`, true);
  }

  /**
   * パスワード変更
   */
  async changePassword(
    userId: string,
    data: ChangePasswordRequest
  ): Promise<ApiResponse> {
    return this.put<ApiResponse>(`/api/users/${userId}/change-password`, data, true);
  }

  /**
   * ユーザーのApp情報取得
   */
  async getApp(userId: string): Promise<ApiResponse<{ app: AppSettings }>> {
    return this.get<ApiResponse<{ app: AppSettings }>>(
      `/api/users/${userId}/app`,
      true
    );
  }

  /**
   * ユーザーのApp設定更新
   */
  async updateApp(
    userId: string,
    data: UpdateAppSettingsRequest
  ): Promise<ApiResponse<{ app: AppSettings }>> {
    return this.put<ApiResponse<{ app: AppSettings }>>(
      `/api/users/${userId}/app`,
      data,
      true
    );
  }

  /**
   * ユーザー設定取得
   */
  async getSettings(userId: string): Promise<ApiResponse<{ settings: UserSettings }>> {
    return this.get<ApiResponse<{ settings: UserSettings }>>(
      `/api/users/${userId}/settings`,
      true
    );
  }

  /**
   * ユーザー設定更新
   */
  async updateSettings(
    userId: string,
    data: UpdateUserSettingsRequest
  ): Promise<ApiResponse<{ settings: UserSettings }>> {
    return this.put<ApiResponse<{ settings: UserSettings }>>(
      `/api/users/${userId}/settings`,
      data,
      true
    );
  }
}