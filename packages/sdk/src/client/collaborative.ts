import { BaseApiClient } from './base';
import type { ApiResponse } from '../types';

export interface CollaborativeInitializeResponse {
  state: string;
  stateVector: string;
}

export interface CollaborativeFullStateResponse {
  state: string;
  stateVector: string;
}

export interface CollaborativeSyncRequest {
  stateVector: string;
  update?: string;
}

export interface CollaborativeSyncResponse {
  update?: string;
  stateVector: string;
}

/**
 * 共同編集機能のAPIクライアント
 */
export class CollaborativeApiClient extends BaseApiClient {
  /**
   * 共同編集機能を初期化
   */
  async initializeCollaborativeEditing(taskListId: string): Promise<CollaborativeInitializeResponse> {
    const response = await this.post<ApiResponse<CollaborativeInitializeResponse>>(
      `/api/task-lists/${taskListId}/collaborative/initialize`,
      {},
      true
    );
    if (!response.data) {
      throw new Error('Invalid response data');
    }
    return response.data;
  }

  /**
   * タスクリストの完全な共同編集状態を取得
   */
  async getFullState(taskListId: string): Promise<CollaborativeFullStateResponse> {
    const response = await this.get<ApiResponse<CollaborativeFullStateResponse>>(
      `/api/task-lists/${taskListId}/collaborative/full-state`,
      true
    );
    if (!response.data) {
      throw new Error('Invalid response data');
    }
    return response.data;
  }

  /**
   * 共同編集の差分同期
   */
  async sync(taskListId: string, request: CollaborativeSyncRequest): Promise<CollaborativeSyncResponse> {
    const response = await this.post<ApiResponse<CollaborativeSyncResponse>>(
      `/api/task-lists/${taskListId}/collaborative/sync`,
      request,
      true
    );
    if (!response.data) {
      throw new Error('Invalid response data');
    }
    return response.data;
  }
}