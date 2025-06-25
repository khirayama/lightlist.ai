import { BaseApiClient } from './base';
import type {
  SharedTaskList,
  ApiResponse,
} from '../types';

/**
 * 共有APIクライアント
 */
export class ShareApiClient extends BaseApiClient {
  /**
   * タスクリスト共有リンク生成
   */
  async createShareLink(
    taskListId: string
  ): Promise<ApiResponse<{ shareUrl: string; shareToken: string }>> {
    return this.post<ApiResponse<{ shareUrl: string; shareToken: string }>>(
      `/api/task-lists/${taskListId}/share`,
      {},
      true
    );
  }

  /**
   * 共有タスクリスト情報取得
   */
  async getSharedTaskList(shareToken: string): Promise<ApiResponse<SharedTaskList>> {
    return this.get<ApiResponse<SharedTaskList>>(`/api/share/${shareToken}`, false);
  }

  /**
   * タスクリスト共有解除
   */
  async deleteShareLink(taskListId: string): Promise<ApiResponse> {
    return this.delete<ApiResponse>(`/api/task-lists/${taskListId}/share`, true);
  }
}