import { BaseApiClient } from './base';
import type {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  ApiResponse,
} from '../types';

/**
 * タスクAPIクライアント
 */
export class TaskApiClient extends BaseApiClient {
  /**
   * タスク一覧取得
   */
  async getTasks(taskListId: string): Promise<ApiResponse<{ tasks: Task[] }>> {
    return this.get<ApiResponse<{ tasks: Task[] }>>(
      `/api/task-lists/${taskListId}/tasks`,
      true
    );
  }

  /**
   * タスク作成
   */
  async createTask(
    taskListId: string,
    data: CreateTaskRequest
  ): Promise<ApiResponse<{ task: Task }>> {
    return this.post<ApiResponse<{ task: Task }>>(
      `/api/task-lists/${taskListId}/tasks`,
      data,
      true
    );
  }

  /**
   * タスク更新
   */
  async updateTask(
    taskId: string,
    data: UpdateTaskRequest
  ): Promise<ApiResponse<{ task: Task }>> {
    return this.put<ApiResponse<{ task: Task }>>(
      `/api/tasks/${taskId}`,
      data,
      true
    );
  }

  /**
   * タスク削除
   */
  async deleteTask(taskId: string): Promise<ApiResponse> {
    return this.delete<ApiResponse>(`/api/tasks/${taskId}`, true);
  }

  /**
   * タスク順序更新
   */
  async updateTaskOrder(
    taskListId: string,
    taskIds: string[]
  ): Promise<ApiResponse<{ taskOrder: string[] }>> {
    return this.put<ApiResponse<{ taskOrder: string[] }>>(
      `/api/task-lists/${taskListId}/tasks/order`,
      { taskIds },
      true
    );
  }
}