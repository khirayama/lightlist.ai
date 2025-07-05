import { ShareActions } from '../index';
import { ShareService } from '../../services';
import { Store } from '../../store';
import { TaskList, TaskListShare, ActionResult, AppError } from '../../types';

export class ShareActionsImpl implements ShareActions {
  constructor(
    private shareService: ShareService,
    private store: Store
  ) {}

  async createShareLink(taskListId: string): Promise<ActionResult<TaskListShare>> {
    return this.executeWithErrorHandling(async () => {
      const shareLink = await this.shareService.createShareLink(taskListId);
      return shareLink;
    });
  }

  async getSharedTaskList(shareToken: string): Promise<ActionResult<TaskList>> {
    return this.executeWithErrorHandling(async () => {
      const taskList = await this.shareService.getSharedTaskList(shareToken);
      return taskList;
    });
  }

  async copySharedTaskList(shareToken: string): Promise<ActionResult<TaskList>> {
    return this.executeWithErrorHandling(async () => {
      const copiedTaskList = await this.shareService.copySharedTaskList(shareToken);
      
      // コピーしたタスクリストをストアに追加
      this.addTaskListToStore(copiedTaskList);
      
      return copiedTaskList;
    });
  }

  async removeShareLink(taskListId: string): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      await this.shareService.removeShareLink(taskListId);
    });
  }

  async refreshShareCode(taskListId: string): Promise<ActionResult<TaskListShare>> {
    return this.executeWithErrorHandling(async () => {
      const refreshedShare = await this.shareService.refreshShareCode(taskListId);
      return refreshedShare;
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
  private addTaskListToStore(taskList: TaskList): void {
    const currentState = this.store.getState();
    this.store.setState({
      ...currentState,
      taskLists: [...currentState.taskLists, taskList]
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