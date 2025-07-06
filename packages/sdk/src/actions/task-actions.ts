import { TaskActions } from '../index';
import { CollaborativeService } from '../services';
import { Store } from '../store';
import { Task, ActionResult, AppError } from '../types';

export class TaskActionsImpl implements TaskActions {
  constructor(
    private collaborativeService: CollaborativeService,
    private store: Store
  ) {}

  async createTask(task: Partial<Task>): Promise<ActionResult<Task>> {
    return this.executeWithErrorHandling(async () => {
      // Y.jsドキュメント内にタスクを作成
      if (!task.taskListId) throw new Error('taskListId is required');
      const response = await this.collaborativeService.createTaskInDocument(task.taskListId, task);
      
      // ストアを更新
      this.addTaskToStore(response.data);
      
      return response.data;
    });
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<ActionResult<Task>> {
    return this.executeWithErrorHandling(async () => {
      // 現在のタスクを取得
      const currentTask = this.getTaskFromStore(taskId);
      if (!currentTask) throw new Error('Task not found');
      
      // 更新されたタスクを作成
      const updatedTask = { ...currentTask, ...updates, updatedAt: new Date().toISOString() };
      
      // Y.jsドキュメント内のタスクを更新
      await this.collaborativeService.updateTaskInDocument(currentTask.taskListId, taskId, updates);
      
      // ストアを更新
      this.updateTaskInStore(updatedTask);
      
      return updatedTask;
    });
  }

  async deleteTask(taskId: string): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      // 現在のタスクを取得（taskListIdが必要）
      const currentTask = this.getTaskFromStore(taskId);
      if (!currentTask) throw new Error('Task not found');
      
      // Y.jsドキュメントからタスクを削除
      await this.collaborativeService.deleteTaskInDocument(currentTask.taskListId, taskId);
      
      // ストアから削除
      this.removeTaskFromStore(taskId);
    });
  }

  async moveTask(taskId: string, fromIndex: number, toIndex: number, targetTaskListId?: string): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      // 現在のタスクを取得
      const currentTask = this.getTaskFromStore(taskId);
      if (!currentTask) throw new Error('Task not found');
      
      // 移動元のタスクリストID
      const sourceTaskListId = currentTask.taskListId;
      
      // Y.jsドキュメント内でタスクを移動
      await this.collaborativeService.moveTaskInDocument(sourceTaskListId, taskId, fromIndex, toIndex);
      
      // ストアを更新
      this.updateTaskOrderInStore(taskId, fromIndex, toIndex, targetTaskListId);
    });
  }

  async toggleTaskCompletion(taskId: string): Promise<ActionResult<Task>> {
    return this.executeWithErrorHandling(async () => {
      // 現在の完了状態を取得
      const currentTask = this.getTaskFromStore(taskId);
      
      if (!currentTask) {
        throw new Error(`Task with id ${taskId} not found`);
      }
      
      // 完了状態を反転
      const updates = { completed: !currentTask.completed };
      const updatedTask = { ...currentTask, ...updates, updatedAt: new Date().toISOString() };
      
      // Y.jsドキュメント内のタスクを更新
      await this.collaborativeService.updateTaskInDocument(currentTask.taskListId, taskId, updates);
      
      // ストアを更新
      this.updateTaskInStore(updatedTask);
      
      return updatedTask;
    });
  }

  async sortTasks(taskListId: string, _sortBy: 'date' | 'name' | 'completion'): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      // 現在のタスクリストを取得してソート処理を実装
      // （実際のソート処理は Y.js ドキュメントの更新として実装）
      // ここでは簡単な実装として、ストア更新のみ
      this.updateTaskListInStore(taskListId);
    });
  }

  async clearCompletedTasks(taskListId: string): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      // 完了済みタスクを取得して個別に削除
      const state = this.store.getState();
      const taskList = state.taskLists.find(tl => tl.id === taskListId);
      if (taskList) {
        const completedTasks = taskList.tasks.filter(task => task.completed);
        for (const task of completedTasks) {
          await this.collaborativeService.deleteTaskInDocument(taskListId, task.id);
        }
      }
      
      // ストアを更新
      this.updateTaskListInStore(taskListId);
    });
  }

  async duplicateTask(taskId: string): Promise<ActionResult<Task>> {
    return this.executeWithErrorHandling(async () => {
      // 元のタスクを取得
      const originalTask = this.getTaskFromStore(taskId);
      
      if (!originalTask) {
        throw new Error(`Task with id ${taskId} not found`);
      }
      
      // 複製用のデータを作成
      const { id, ...taskDataWithoutId } = originalTask;
      const duplicateData = {
        ...taskDataWithoutId,
        text: `${originalTask.text} (Copy)`,
        completed: false // 複製タスクは未完了にする
      };
      
      // 新しいタスクを作成
      const response = await this.collaborativeService.createTaskInDocument(originalTask.taskListId, duplicateData);
      
      // ストアを更新
      this.addTaskToStore(response.data);
      
      return response.data;
    });
  }

  async batchUpdateTasks(updates: Array<{ taskId: string; updates: Partial<Task> }>): Promise<ActionResult<Task[]>> {
    return this.executeWithErrorHandling(async () => {
      const updatedTasks: Task[] = [];
      
      // 各タスクを順次更新
      for (const { taskId, updates: taskUpdates } of updates) {
        const currentTask = this.getTaskFromStore(taskId);
        if (currentTask) {
          const updatedTask = { ...currentTask, ...taskUpdates, updatedAt: new Date().toISOString() };
          await this.collaborativeService.updateTaskInDocument(currentTask.taskListId, taskId, taskUpdates);
          updatedTasks.push(updatedTask);
          this.updateTaskInStore(updatedTask);
        }
      }
      
      return updatedTasks;
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
  private addTaskToStore(task: Task): void {
    this.store.setState((state) => {
      const taskLists = state.taskLists.map(tl => 
        tl.id === task.taskListId 
          ? { ...tl, tasks: [...tl.tasks, task] }
          : tl
      );
      return {
        ...state,
        taskLists
      };
    });
  }

  private updateTaskInStore(updatedTask: Task): void {
    this.store.setState((state) => {
      const taskLists = state.taskLists.map(tl => 
        tl.id === updatedTask.taskListId 
          ? { 
              ...tl, 
              tasks: tl.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
            }
          : tl
      );
      return {
        ...state,
        taskLists
      };
    });
  }

  private removeTaskFromStore(taskId: string): void {
    this.store.setState((state) => {
      const taskLists = state.taskLists.map(tl => ({
        ...tl,
        tasks: tl.tasks.filter(t => t.id !== taskId)
      }));
      return {
        ...state,
        taskLists
      };
    });
  }

  private updateTaskOrderInStore(_taskId: string, _fromIndex: number, _toIndex: number, _targetTaskListId?: string): void {
    this.store.setState((state) => ({
      ...state,
      // タスクの順序が変更されたことをマーク
    }));
  }

  private updateTaskListInStore(_taskListId: string): void {
    this.store.setState((state) => ({
      ...state,
      // タスクリストが更新されたことをマーク
    }));
  }

  private getTaskFromStore(taskId: string): Task | null {
    const state = this.store.getState();
    return this.findTaskInStore(state, taskId);
  }

  private findTaskInStore(state: any, taskId: string): Task | null {
    for (const taskList of state.taskLists) {
      const task = taskList.tasks.find((t: Task) => t.id === taskId);
      if (task) {
        return task;
      }
    }
    return null;
  }

  private convertErrorToAppError(error: unknown): AppError {
    // 既にAppErrorの場合はそのまま返す
    if (error && typeof error === 'object' && 'type' in error && 'code' in error && 'message' in error) {
      return error as AppError;
    }

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