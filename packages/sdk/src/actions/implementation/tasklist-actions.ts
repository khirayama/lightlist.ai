import { TaskListActions } from '../index';
import { CollaborativeService, SettingsService } from '../../services';
import { Store } from '../../store';
import { TaskList, ActionResult, AppError } from '../../types';

export class TaskListActionsImpl implements TaskListActions {
  constructor(
    private collaborativeService: CollaborativeService,
    private settingsService: SettingsService,
    private store: Store
  ) {}

  async getTaskLists(): Promise<ActionResult<TaskList[]>> {
    return this.executeWithErrorHandling(async () => {
      // タスクリストの順序を取得
      const order = await this.settingsService.getTaskListOrder();
      
      // 各タスクリストのY.jsドキュメントを取得
      const taskLists: TaskList[] = [];
      for (const id of order) {
        try {
          const taskList = await this.collaborativeService.getTaskListDocument(id);
          taskLists.push(taskList);
        } catch (error) {
          // 個別のタスクリスト取得エラーはログに記録するが、処理を続行
          console.warn(`Failed to load task list ${id}:`, error);
        }
      }
      
      this.updateTaskListsInStore(taskLists);
      return taskLists;
    });
  }

  async createTaskList(taskList: Partial<TaskList>): Promise<ActionResult<TaskList>> {
    return this.executeWithErrorHandling(async () => {
      // Y.jsドキュメントを作成
      const createdTaskList = await this.collaborativeService.createTaskListDocument(taskList);
      
      // セッションを開始
      await this.collaborativeService.startSession(createdTaskList.id);
      
      // ストアを更新
      this.addTaskListToStore(createdTaskList);
      this.addActiveSessionToStore(createdTaskList.id);
      
      return createdTaskList;
    });
  }

  async updateTaskList(taskListId: string, updates: Partial<TaskList>): Promise<ActionResult<TaskList>> {
    return this.executeWithErrorHandling(async () => {
      // Y.jsドキュメントを更新
      const updatedTaskList = await this.collaborativeService.updateTaskListDocument(taskListId, updates);
      
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
      const originalTaskList = await this.collaborativeService.getTaskListDocument(taskListId);
      
      // 複製用のデータを作成
      const duplicateData = {
        ...originalTaskList,
        id: undefined, // 新しいIDを生成させる
        name: `${originalTaskList.name} (Copy)`,
        tasks: originalTaskList.tasks // タスクも複製
      };
      
      // 新しいY.jsドキュメントを作成
      const duplicatedTaskList = await this.collaborativeService.createTaskListDocument(duplicateData);
      
      // セッションを開始
      await this.collaborativeService.startSession(duplicatedTaskList.id);
      
      // ストアを更新
      this.addTaskListToStore(duplicatedTaskList);
      this.addActiveSessionToStore(duplicatedTaskList.id);
      
      return duplicatedTaskList;
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
      // アーカイブフラグを解除
      const restoredTaskList = await this.collaborativeService.updateTaskListDocument(taskListId, { 
        archived: false 
      } as any);
      
      // セッションを開始
      await this.collaborativeService.startSession(taskListId);
      
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
  private updateTaskListsInStore(taskLists: TaskList[]): void {
    this.store.setState({
      ...this.store.getState(),
      taskLists
    });
  }

  private addTaskListToStore(taskList: TaskList): void {
    const currentState = this.store.getState();
    this.store.setState({
      ...currentState,
      taskLists: [...currentState.taskLists, taskList]
    });
  }

  private updateTaskListInStore(updatedTaskList: TaskList): void {
    const currentState = this.store.getState();
    const taskLists = currentState.taskLists.map(tl => 
      tl.id === updatedTaskList.id ? updatedTaskList : tl
    );
    
    this.store.setState({
      ...currentState,
      taskLists
    });
  }

  private removeTaskListFromStore(taskListId: string): void {
    const currentState = this.store.getState();
    const taskLists = currentState.taskLists.filter(tl => tl.id !== taskListId);
    
    this.store.setState({
      ...currentState,
      taskLists
    });
  }

  private addActiveSessionToStore(sessionId: string): void {
    const currentState = this.store.getState();
    if (!currentState.activeSessionIds.includes(sessionId)) {
      this.store.setState({
        ...currentState,
        activeSessionIds: [...currentState.activeSessionIds, sessionId]
      });
    }
  }

  private removeActiveSessionFromStore(sessionId: string): void {
    const currentState = this.store.getState();
    const activeSessionIds = currentState.activeSessionIds.filter(id => id !== sessionId);
    
    this.store.setState({
      ...currentState,
      activeSessionIds
    });
  }

  private convertErrorToAppError(error: unknown): AppError {
    if (error instanceof Error) {
      const status = (error as any).status;
      
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
          type: 'network',
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

    return {
      type: 'unknown',
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      details: { error }
    };
  }
}