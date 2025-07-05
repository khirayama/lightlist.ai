import { SettingsActions } from '../index';
import { SettingsService } from '../../services';
import { Store } from '../../store';
import { UserSettings, AppSettings, ActionResult, AppError } from '../../types';

export class SettingsActionsImpl implements SettingsActions {
  constructor(
    private settingsService: SettingsService,
    private store: Store
  ) {}

  async getSettings(): Promise<ActionResult<UserSettings>> {
    return this.executeWithErrorHandling(async () => {
      const settings = await this.settingsService.getSettings();
      this.updateSettingsInStore(settings);
      return settings;
    });
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<ActionResult<UserSettings>> {
    return this.executeWithErrorHandling(async () => {
      const updatedSettings = await this.settingsService.updateSettings(settings);
      this.updateSettingsInStore(updatedSettings);
      return updatedSettings;
    });
  }

  async getApp(): Promise<ActionResult<AppSettings>> {
    return this.executeWithErrorHandling(async () => {
      const app = await this.settingsService.getApp();
      this.updateAppInStore(app);
      return app;
    });
  }

  async updateApp(app: Partial<AppSettings>): Promise<ActionResult<AppSettings>> {
    return this.executeWithErrorHandling(async () => {
      const updatedApp = await this.settingsService.updateApp(app);
      this.updateAppInStore(updatedApp);
      return updatedApp;
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
    this.store.setState({
      ...this.store.getState(),
      settings
    });
  }

  private updateAppInStore(app: AppSettings): void {
    this.store.setState({
      ...this.store.getState(),
      app
    });
  }

  private reorderTaskListsInStore(order: string[]): void {
    const currentState = this.store.getState();
    const taskListsMap = new Map(currentState.taskLists.map(tl => [tl.id, tl]));
    
    // 順序に従ってタスクリストを並び替え
    const reorderedTaskLists = order
      .map(id => taskListsMap.get(id))
      .filter(Boolean)
      .concat(
        // 順序に含まれていないタスクリストを最後に追加
        currentState.taskLists.filter(tl => !order.includes(tl.id))
      );

    this.store.setState({
      ...currentState,
      taskLists: reorderedTaskLists
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