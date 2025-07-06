import { TaskListActions } from '../index';
import { CollaborativeService, SettingsService } from '../services';
import { Store } from '../store';
import { TaskList, ActionResult, AppError } from '../types';

export class TaskListActionsImpl implements TaskListActions {
  constructor(
    private collaborativeService: CollaborativeService,
    private settingsService: SettingsService,
    private store: Store
  ) {}

  async getTaskLists(): Promise<ActionResult<TaskList[]>> {
    return this.executeWithErrorHandling(async () => {
      // タスクリスト一覧を取得
      const response = await this.collaborativeService.getTaskLists();
      const taskLists = response.data;
      
      this.updateTaskListsInStore(taskLists);
      return taskLists;
    });
  }

  async createTaskList(taskList: Partial<TaskList>): Promise<ActionResult<TaskList>> {
    return this.executeWithErrorHandling(async () => {
      // Y.jsドキュメントを作成
      const response = await this.collaborativeService.createTaskListDocument(taskList);
      
      // セッションを開始
      await this.collaborativeService.startSession(response.data.id, 'active');
      
      // ストアを更新
      this.addTaskListToStore(response.data);
      this.addActiveSessionToStore(response.data.id);
      
      return response.data;
    });
  }

  async updateTaskList(taskListId: string, updates: Partial<TaskList>): Promise<ActionResult<TaskList>> {
    return this.executeWithErrorHandling(async () => {
      // 現在のタスクリストを取得
      const currentTaskList = this.getTaskListFromStore(taskListId);
      if (!currentTaskList) throw new Error('Task list not found');
      
      // 更新されたタスクリストを作成
      const updatedTaskList = { ...currentTaskList, ...updates, updatedAt: new Date().toISOString() };
      
      // Y.jsドキュメントを更新
      await this.collaborativeService.updateTaskListDocument(taskListId, updates);
      
      // ストアを更新
      this.updateTaskListInStore(updatedTaskList);
      
      return updatedTaskList;
    });
  }

  async deleteTaskList(taskListId: string): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      // Y.jsドキュメントを削除
      await this.collaborativeService.deleteTaskListDocument(taskListId);
      
      // セッションを終了
      await this.collaborativeService.endSession(taskListId);
      
      // ストアから削除
      this.removeTaskListFromStore(taskListId);
      this.removeActiveSessionFromStore(taskListId);
    });
  }

  async moveTaskList(fromIndex: number, toIndex: number): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      const currentState = this.store.getState();
      const taskLists = [...currentState.taskLists];
      
      // インデックスのバリデーション
      if (fromIndex < 0 || fromIndex >= taskLists.length || 
          toIndex < 0 || toIndex >= taskLists.length) {
        const validationError = new Error('Invalid move operation');
        (validationError as any).status = 400;
        throw validationError;
      }
      
      // 配列内で移動
      const [movedTaskList] = taskLists.splice(fromIndex, 1);
      taskLists.splice(toIndex, 0, movedTaskList);
      
      // 新しい順序を永続化
      const newOrder = taskLists.map(tl => tl.id);
      await this.settingsService.updateTaskListOrder(newOrder);
      
      // ストアを更新
      this.updateTaskListsInStore(taskLists);
    });
  }

  async duplicateTaskList(taskListId: string): Promise<ActionResult<TaskList>> {
    return this.executeWithErrorHandling(async () => {
      // 元のタスクリストを取得
      const originalTaskList = this.getTaskListFromStore(taskListId);
      if (!originalTaskList) throw new Error('Task list not found');
      
      // 複製用のデータを作成
      const { id, ...taskListDataWithoutId } = originalTaskList;
      const duplicateData = {
        ...taskListDataWithoutId,
        name: `${originalTaskList.name} (Copy)`,
        tasks: [] // タスクはあとで個別に複製
      };
      
      // 新しいY.jsドキュメントを作成
      const response = await this.collaborativeService.createTaskListDocument(duplicateData);
      
      // セッションを開始
      await this.collaborativeService.startSession(response.data.id, 'active');
      
      // ストアを更新
      this.addTaskListToStore(response.data);
      this.addActiveSessionToStore(response.data.id);
      
      return response.data;
    });
  }

  async archiveTaskList(taskListId: string): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      // アーカイブフラグを設定して更新
      await this.collaborativeService.updateTaskListDocument(taskListId, { 
        archived: true 
      } as any);
      
      // セッションを終了
      await this.collaborativeService.endSession(taskListId);
      
      // ストアから削除（アーカイブされたタスクリストは通常のリストに表示しない）
      this.removeTaskListFromStore(taskListId);
      this.removeActiveSessionFromStore(taskListId);
    });
  }

  async restoreTaskList(taskListId: string): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      // 現在のタスクリストを取得
      const currentTaskList = this.getTaskListFromStore(taskListId);
      if (!currentTaskList) throw new Error('Task list not found');
      
      // アーカイブフラグを解除
      await this.collaborativeService.updateTaskListDocument(taskListId, { 
        archived: false 
      } as any);
      
      // 更新されたタスクリストを作成
      const restoredTaskList = { ...currentTaskList, archived: false, updatedAt: new Date().toISOString() } as TaskList;
      
      // セッションを開始
      await this.collaborativeService.startSession(taskListId, 'active');
      
      // ストアに追加
      this.addTaskListToStore(restoredTaskList);
      this.addActiveSessionToStore(taskListId);
    });
  }

  // 共通のエラーハンドリングとActionResult生成
  private async executeWithErrorHandling<T>(
    action: () => Promise<T>
  ): Promise<ActionResult<T>> {
    try {
      const result = await action();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: this.convertErrorToAppError(error)
      };
    }
  }

  // Store更新のヘルパーメソッド
  private getTaskListFromStore(taskListId: string): TaskList | null {
    const state = this.store.getState();
    return state.taskLists.find(tl => tl.id === taskListId) || null;
  }

  private updateTaskListsInStore(taskLists: TaskList[]): void {
    this.store.setState((state) => ({
      ...state,
      taskLists
    }));
  }

  private addTaskListToStore(taskList: TaskList): void {
    this.store.setState((state) => ({
      ...state,
      taskLists: [...state.taskLists, taskList]
    }));
  }

  private updateTaskListInStore(updatedTaskList: TaskList): void {
    this.store.setState((state) => {
      const taskLists = state.taskLists.map(tl => 
        tl.id === updatedTaskList.id ? updatedTaskList : tl
      );
      return {
        ...state,
        taskLists
      };
    });
  }

  private removeTaskListFromStore(taskListId: string): void {
    this.store.setState((state) => {
      const taskLists = state.taskLists.filter(tl => tl.id !== taskListId);
      return {
        ...state,
        taskLists
      };
    });
  }

  private addActiveSessionToStore(sessionId: string): void {
    this.store.setState((state) => {
      if (!state.activeSessionIds.includes(sessionId)) {
        return {
          ...state,
          activeSessionIds: [...state.activeSessionIds, sessionId]
        };
      }
      return state;
    });
  }

  private removeActiveSessionFromStore(sessionId: string): void {
    this.store.setState((state) => ({
      ...state,
      activeSessionIds: state.activeSessionIds.filter(id => id !== sessionId)
    }));
  }

  private convertErrorToAppError(error: unknown): AppError {
    console.log('TaskListActions - convertErrorToAppError input:', error);
    
    // 既にAppErrorの場合はそのまま返す
    if (error && typeof error === 'object' && 'type' in error) {
      console.log('TaskListActions - Already AppError, returning as-is');
      return error as AppError;
    }

    if (error instanceof Error) {
      const status = (error as any).status;
      console.log('TaskListActions - Error instance with status:', status);
      
      if (status === 400) {
        return {
          type: 'validation',
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: { status }
        };
      }
      
      if (status === 401) {
        return {
          type: 'auth',
          code: 'AUTH_ERROR',
          message: error.message,
          details: { status }
        };
      }
      
      if (status === 404) {
        return {
          type: 'validation',  // 404は通常、無効なIDなどバリデーションエラー
          code: 'NOT_FOUND_ERROR',
          message: error.message,
          details: { status }
        };
      }
      
      return {
        type: 'network',
        code: 'NETWORK_ERROR',
        message: error.message,
        details: { status }
      };
    }

    console.log('TaskListActions - Unknown error type, converting to unknown');
    return {
      type: 'unknown',
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      details: { error }
    };
  }
}