import { TaskActions } from '../index';
import { CollaborativeService } from '../../services';
import { Store } from '../../store';
import { Task, ActionResult, AppError } from '../../types';

export class TaskActionsImpl implements TaskActions {
  constructor(
    private collaborativeService: CollaborativeService,
    private store: Store
  ) {}

  async createTask(task: Partial<Task>): Promise<ActionResult<Task>> {
    return this.executeWithErrorHandling(async () => {
      // Y.jsドキュメント内にタスクを作成
      const createdTask = await this.collaborativeService.createTaskInDocument(task);
      
      // ストアを更新
      this.addTaskToStore(createdTask);
      
      return createdTask;
    });
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<ActionResult<Task>> {
    return this.executeWithErrorHandling(async () => {
      // Y.jsドキュメント内のタスクを更新
      const updatedTask = await this.collaborativeService.updateTaskInDocument(taskId, updates);
      
      // ストアを更新
      this.updateTaskInStore(updatedTask);
      
      return updatedTask;
    });
  }

  async deleteTask(taskId: string): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      // Y.jsドキュメントからタスクを削除
      await this.collaborativeService.deleteTaskInDocument(taskId);
      
      // ストアから削除
      this.removeTaskFromStore(taskId);
    });
  }

  async moveTask(taskId: string, fromIndex: number, toIndex: number, targetTaskListId?: string): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      // Y.jsドキュメント内でタスクを移動
      await this.collaborativeService.moveTaskInDocument(taskId, fromIndex, toIndex, targetTaskListId);
      
      // ストアを更新
      this.updateTaskOrderInStore(taskId, fromIndex, toIndex, targetTaskListId);
    });
  }

  async toggleTaskCompletion(taskId: string): Promise<ActionResult<Task>> {
    return this.executeWithErrorHandling(async () => {
      // 現在の完了状態を取得
      const currentState = this.store.getState();
      const currentTask = this.findTaskInStore(currentState, taskId);
      
      if (!currentTask) {
        throw new Error(`Task with id ${taskId} not found`);
      }
      
      // 完了状態を反転
      const updates = { completed: !currentTask.completed };
      const updatedTask = await this.collaborativeService.updateTaskInDocument(taskId, updates);
      
      // ストアを更新
      this.updateTaskInStore(updatedTask);
      
      return updatedTask;
    });
  }

  async sortTasks(taskListId: string, sortBy: 'date' | 'name' | 'completion'): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      // Y.jsドキュメント内でタスクをソート
      await this.collaborativeService.sortTasksInDocument(taskListId, sortBy);
      
      // ストアを更新（ソート後の順序）
      this.updateTaskListInStore(taskListId);
    });
  }

  async clearCompletedTasks(taskListId: string): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      // Y.jsドキュメントから完了済みタスクを削除
      await this.collaborativeService.clearCompletedTasksInDocument(taskListId);
      
      // ストアを更新
      this.updateTaskListInStore(taskListId);
    });
  }

  async duplicateTask(taskId: string): Promise<ActionResult<Task>> {
    return this.executeWithErrorHandling(async () => {
      // 元のタスクを取得
      const currentState = this.store.getState();
      const originalTask = this.findTaskInStore(currentState, taskId);
      
      if (!originalTask) {
        throw new Error(`Task with id ${taskId} not found`);
      }
      
      // 複製用のデータを作成
      const duplicateData = {
        ...originalTask,
        id: undefined, // 新しいIDを生成させる
        text: `${originalTask.text} (Copy)`,
        completed: false // 複製タスクは未完了にする
      };
      
      // 新しいタスクを作成
      const duplicatedTask = await this.collaborativeService.createTaskInDocument(duplicateData);
      
      // ストアを更新
      this.addTaskToStore(duplicatedTask);
      
      return duplicatedTask;
    });
  }

  async batchUpdateTasks(updates: Array<{ taskId: string; updates: Partial<Task> }>): Promise<ActionResult<Task[]>> {
    return this.executeWithErrorHandling(async () => {
      const updatedTasks: Task[] = [];
      
      // 各タスクを順次更新
      for (const { taskId, updates: taskUpdates } of updates) {
        const updatedTask = await this.collaborativeService.updateTaskInDocument(taskId, taskUpdates);
        updatedTasks.push(updatedTask);
        this.updateTaskInStore(updatedTask);
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
    const currentState = this.store.getState();
    const taskLists = currentState.taskLists.map(tl => 
      tl.id === task.taskListId 
        ? { ...tl, tasks: [...tl.tasks, task] }
        : tl
    );
    
    this.store.setState({
      ...currentState,
      taskLists
    });
  }

  private updateTaskInStore(updatedTask: Task): void {
    const currentState = this.store.getState();
    const taskLists = currentState.taskLists.map(tl => 
      tl.id === updatedTask.taskListId 
        ? { 
            ...tl, 
            tasks: tl.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
          }
        : tl
    );
    
    this.store.setState({
      ...currentState,
      taskLists
    });
  }

  private removeTaskFromStore(taskId: string): void {
    const currentState = this.store.getState();
    const taskLists = currentState.taskLists.map(tl => ({
      ...tl,
      tasks: tl.tasks.filter(t => t.id !== taskId)
    }));
    
    this.store.setState({
      ...currentState,
      taskLists
    });
  }

  private updateTaskOrderInStore(taskId: string, fromIndex: number, toIndex: number, targetTaskListId?: string): void {
    const currentState = this.store.getState();
    // 実際の並び替えロジックは複雑なので、簡単な更新を行う
    // 実際の実装では、Y.jsから同期された最新の状態を反映
    this.store.setState({
      ...currentState,
      // タスクの順序が変更されたことをマーク
    });
  }

  private updateTaskListInStore(taskListId: string): void {
    const currentState = this.store.getState();
    // 実際の実装では、Y.jsドキュメントから最新の状態を取得して更新
    this.store.setState({
      ...currentState,
      // タスクリストが更新されたことをマーク
    });
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