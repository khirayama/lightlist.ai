import { BaseApiClient } from './base';
import type {
  TaskList,
  CreateTaskListRequest,
  UpdateTaskListRequest,
  UpdateTaskListOrderRequest,
  ApiResponse,
} from '../types';

/**
 * タスクリストAPIクライアント
 */
export class TaskListApiClient extends BaseApiClient {
  /**
   * タスクリスト一覧取得
   */
  async getTaskLists(): Promise<ApiResponse<{ taskLists: TaskList[] }>> {
    return this.get<ApiResponse<{ taskLists: TaskList[] }>>('/api/task-lists', true);
  }

  /**
   * タスクリスト作成
   */
  async createTaskList(data: CreateTaskListRequest): Promise<ApiResponse<{ taskList: TaskList }>> {
    return this.post<ApiResponse<{ taskList: TaskList }>>('/api/task-lists', data, true);
  }

  /**
   * タスクリスト更新
   */
  async updateTaskList(
    taskListId: string,
    data: UpdateTaskListRequest
  ): Promise<ApiResponse<{ taskList: TaskList }>> {
    return this.put<ApiResponse<{ taskList: TaskList }>>(
      `/api/task-lists/${taskListId}`,
      data,
      true
    );
  }

  /**
   * タスクリスト削除
   */
  async deleteTaskList(taskListId: string): Promise<ApiResponse> {
    return this.delete<ApiResponse>(`/api/task-lists/${taskListId}`, true);
  }

  /**
   * タスクリストの順序更新
   */
  async updateTaskListOrder(
    userId: string,
    data: UpdateTaskListOrderRequest
  ): Promise<ApiResponse<{ taskListOrder: string[] }>> {
    return this.put<ApiResponse<{ taskListOrder: string[] }>>(
      `/api/users/${userId}/task-lists/order`,
      data,
      true
    );
  }
}