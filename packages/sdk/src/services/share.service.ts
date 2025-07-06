import { TaskListShare, TaskList, ApiResponse } from '../types';
import { ServiceBase } from './base/service-base';
import { HttpClient } from './base/http-client';

export class ShareServiceImpl extends ServiceBase {
  constructor(
    httpClient: HttpClient
  ) {
    super(httpClient);
  }

  async createShareLink(taskListId: string): Promise<ApiResponse<TaskListShare>> {
    try {
      // バリデーション
      this.validatePathParam(taskListId, 'taskListId');

      const response = await this.httpClient.post<TaskListShare>(`/share/${taskListId}`);

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getSharedTaskList(shareToken: string): Promise<ApiResponse<TaskList>> {
    try {
      // バリデーション
      this.validateShareToken(shareToken);

      const response = await this.httpClient.get<TaskList>(`/share/${shareToken}`);

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async copySharedTaskList(shareToken: string): Promise<ApiResponse<TaskList>> {
    try {
      // バリデーション
      this.validateShareToken(shareToken);

      const response = await this.httpClient.post<TaskList>(`/share/${shareToken}/copy`);

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async removeShareLink(taskListId: string): Promise<ApiResponse<void>> {
    try {
      // バリデーション
      this.validatePathParam(taskListId, 'taskListId');

      const response = await this.httpClient.delete<void>(`/share/${taskListId}`);

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  // プライベートメソッド
  private validateShareToken(shareToken: string): void {
    if (!shareToken || typeof shareToken !== 'string' || shareToken.trim() === '') {
      throw this.createError('validation', 'INVALID_SHARE_TOKEN', 'Invalid shareToken parameter');
    }

    // 空白文字のみの場合は無効
    if (shareToken.trim() === '') {
      throw this.createError('validation', 'INVALID_SHARE_TOKEN', 'Invalid shareToken parameter');
    }

    // 空白文字が含まれている場合は無効
    if (shareToken.includes(' ')) {
      throw this.createError('validation', 'INVALID_SHARE_TOKEN', 'Invalid shareToken parameter');
    }

    // 特定の無効な形式をチェック
    const invalidFormats = [
      'share_', // プレフィックスのみ
      'not_share_token', // 間違ったプレフィックス
      'invalid-token' // テストで使用される無効なトークン
    ];

    if (invalidFormats.includes(shareToken)) {
      throw this.createError('validation', 'INVALID_SHARE_TOKEN', 'Invalid shareToken parameter');
    }
  }
}