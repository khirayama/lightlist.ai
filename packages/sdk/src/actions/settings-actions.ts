import { SettingsActions } from '../index';
import { SettingsService } from '../services';
import { Store } from '../store';
import { UserSettings, AppSettings, TaskList, ActionResult, AppError } from '../types';

export class SettingsActionsImpl implements SettingsActions {
  constructor(
    private settingsService: SettingsService,
    private store: Store
  ) {}

  async getSettings(): Promise<ActionResult<UserSettings>> {
    return this.executeWithErrorHandling(async () => {
      const response = await this.settingsService.getSettings();
      this.updateSettingsInStore(response.data);
      return response.data;
    });
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<ActionResult<UserSettings>> {
    return this.executeWithErrorHandling(async () => {
      const response = await this.settingsService.updateSettings(settings);
      this.updateSettingsInStore(response.data);
      return response.data;
    });
  }

  async getApp(): Promise<ActionResult<AppSettings>> {
    return this.executeWithErrorHandling(async () => {
      const response = await this.settingsService.getApp();
      this.updateAppInStore(response.data);
      return response.data;
    });
  }

  async updateApp(app: Partial<AppSettings>): Promise<ActionResult<AppSettings>> {
    return this.executeWithErrorHandling(async () => {
      const response = await this.settingsService.updateApp(app);
      this.updateAppInStore(response.data);
      return response.data;
    });
  }

  async updateTaskListOrder(order: string[]): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      await this.settingsService.updateTaskListOrder(order);
      this.reorderTaskListsInStore(order);
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
  private updateSettingsInStore(settings: UserSettings): void {
    this.store.setState((state) => ({
      ...state,
      settings
    }));
  }

  private updateAppInStore(app: AppSettings): void {
    this.store.setState((state) => ({
      ...state,
      app
    }));
  }

  private reorderTaskListsInStore(order: string[]): void {
    const currentState = this.store.getState();
    const taskListsMap = new Map(currentState.taskLists.map(tl => [tl.id, tl]));
    
    // 順序に従ってタスクリストを並び替え
    const reorderedTaskLists = order
      .map(id => taskListsMap.get(id))
      .filter((taskList): taskList is TaskList => taskList !== undefined)
      .concat(
        // 順序に含まれていないタスクリストを最後に追加
        currentState.taskLists.filter(tl => !order.includes(tl.id))
      );

    this.store.setState((state) => ({
      ...state,
      taskLists: reorderedTaskLists
    }));
  }

  private convertErrorToAppError(error: unknown): AppError {
    // 既にAppError構造の場合はそのまま返す
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
      
      if (status === 401) {
        return {
          type: 'auth',
          code: 'AUTH_ERROR',
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