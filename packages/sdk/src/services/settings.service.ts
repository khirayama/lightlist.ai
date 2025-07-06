import { SettingsService } from '../index';
import { UserSettings, AppSettings, ApiResponse } from '../../types';
import { ServiceBase } from '../base/service-base';
import { HttpClient } from '../base/http-client';

export class SettingsServiceImpl extends ServiceBase implements SettingsService {
  constructor(
    httpClient: HttpClient
  ) {
    super(httpClient);
  }

  async getSettings(): Promise<ApiResponse<UserSettings>> {
    try {
      const response = await this.httpClient.get<UserSettings>('/settings');
      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> {
    try {
      // バリデーション
      this.validateUserSettings(settings);

      const response = await this.httpClient.put<UserSettings>('/settings', settings);
      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getApp(): Promise<ApiResponse<AppSettings>> {
    try {
      const response = await this.httpClient.get<AppSettings>('/app');
      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateApp(app: Partial<AppSettings>): Promise<ApiResponse<AppSettings>> {
    try {
      // バリデーション
      this.validateAppSettings(app);

      const response = await this.httpClient.put<AppSettings>('/app', app);
      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getTaskListOrder(): Promise<ApiResponse<string[]>> {
    try {
      const response = await this.httpClient.get<string[]>('/app/taskListOrder');
      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateTaskListOrder(order: string[]): Promise<ApiResponse<void>> {
    try {
      // バリデーション
      this.validateTaskListOrder(order);

      const response = await this.httpClient.put<void>('/app/taskListOrder', { order });
      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  // プライベートメソッド
  private validateUserSettings(settings: Partial<UserSettings>): void {
    if (settings.theme !== undefined) {
      this.validateTheme(settings.theme);
    }
    if (settings.language !== undefined) {
      this.validateLanguage(settings.language);
    }
  }

  private validateAppSettings(app: Partial<AppSettings>): void {
    if (app.taskInsertPosition !== undefined) {
      this.validateTaskInsertPosition(app.taskInsertPosition);
    }
    if (app.autoSort !== undefined && typeof app.autoSort !== 'boolean') {
      throw this.createError('validation', 'INVALID_AUTO_SORT', 'Auto sort must be a boolean');
    }
  }

  private validateTheme(theme: string): void {
    const validThemes = ['system', 'light', 'dark'];
    if (!validThemes.includes(theme)) {
      throw this.createError('validation', 'INVALID_THEME', `Invalid theme: ${theme}. Must be one of: ${validThemes.join(', ')}`);
    }
  }

  private validateLanguage(language: string): void {
    const validLanguages = ['ja', 'en'];
    if (!validLanguages.includes(language)) {
      throw this.createError('validation', 'INVALID_LANGUAGE', `Invalid language: ${language}. Must be one of: ${validLanguages.join(', ')}`);
    }
  }

  private validateTaskInsertPosition(position: string): void {
    const validPositions = ['top', 'bottom'];
    if (!validPositions.includes(position)) {
      throw this.createError('validation', 'INVALID_TASK_INSERT_POSITION', `Invalid task insert position: ${position}. Must be one of: ${validPositions.join(', ')}`);
    }
  }

  private validateTaskListOrder(order: string[]): void {
    if (!Array.isArray(order)) {
      throw this.createError('validation', 'INVALID_TASK_LIST_ORDER', 'Task list order must be an array');
    }

    // 空の配列は許可する（初期状態や全削除時に必要）
    if (order.length === 0) {
      return;
    }

    for (let i = 0; i < order.length; i++) {
      const id = order[i];
      if (!id || typeof id !== 'string' || id.trim() === '') {
        throw this.createError('validation', 'INVALID_TASK_LIST_ID', `Invalid task list ID at index ${i}: ${id}`);
      }
    }
  }
}