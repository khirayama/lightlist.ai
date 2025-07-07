import { AuthActions } from '../index';
import { AuthService, SettingsService } from '../services';
import { Store } from '../store';
import { AuthCredential, AuthSession, ActionResult, AppError, User } from '../types';

export class AuthActionsImpl implements AuthActions {
  constructor(
    private authService: AuthService,
    private settingsService: SettingsService,
    private store: Store
  ) {}

  async register(credential: AuthCredential): Promise<ActionResult<AuthSession>> {
    return this.executeWithErrorHandling(async () => {
      const response = await this.authService.register(credential);
      this.updateUserInStore(credential.email);
      return response.data;
    });
  }

  async login(credential: AuthCredential): Promise<ActionResult<AuthSession>> {
    return this.executeWithErrorHandling(async () => {
      const response = await this.authService.login(credential);
      this.updateUserInStore(credential.email);
      return response.data;
    });
  }

  async logout(): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      await this.authService.logout();
      this.clearUserDataInStore();
    });
  }

  async deleteUser(): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      await this.authService.deleteUser();
      this.clearUserDataInStore();
    });
  }

  async updateEmail(credential: AuthCredential): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      await this.authService.updateEmail(credential);
      this.updateUserEmailInStore(credential.email);
    });
  }

  async updatePassword(credential: AuthCredential): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      await this.authService.updatePassword(credential);
    });
  }

  async sendPasswordResetRequest(email: string): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      await this.authService.forgotPassword(email);
    });
  }

  async resetPassword(token: string, password: string): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      await this.authService.resetPassword(token, password);
    });
  }

  async bootstrap(): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      // 認証状態をチェック
      const accessToken = this.authService.getAccessToken();
      
      if (accessToken) {
        // 認証されている場合のみストアを初期化
        await this.initializeStoreData();
      }
      // 認証されていない場合は何もしない（ストアはクリアしない）
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
  private updateUserInStore(email: string): void {
    this.store.setState((state) => ({
      ...state,
      user: this.createUser(email)
    }));
  }

  private updateUserEmailInStore(email: string): void {
    this.store.setState((state) => {
      if (state.user) {
        return {
          ...state,
          user: {
            ...state.user,
            email,
            updatedAt: new Date().toISOString()
          }
        };
      }
      return state;
    });
  }

  private clearUserDataInStore(): void {
    this.store.setState((state) => ({
      ...state,
      user: null,
      taskLists: [],
      activeSessionIds: []
    }));
  }

  private async initializeStoreData(): Promise<void> {
    try {
      // 並列で初期データを取得
      const [settingsResponse, appResponse, taskListOrderResponse] = await Promise.all([
        this.settingsService.getSettings(),
        this.settingsService.getApp(),
        this.settingsService.getTaskListOrder()
      ]);

      // ストアに初期データを設定
      this.store.setState((state) => ({
        ...state,
        settings: settingsResponse.data,
        app: appResponse.data,
        taskListOrder: taskListOrderResponse.data
      }));
    } catch (error) {
      // エラーが発生した場合は、エラーをストアに記録
      const appError = this.convertErrorToAppError(error);
      this.store.setState((state) => ({
        ...state,
        errors: [...state.errors, appError]
      }));
      throw appError;
    }
  }

  private createUser(email: string): User {
    return {
      id: 'user-' + Date.now(),
      email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
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