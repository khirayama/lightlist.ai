import { AuthActions } from '../index';
import { AuthService } from '../../services';
import { Store } from '../../store';
import { AuthCredential, AuthSession, ActionResult, AppError, User } from '../../types';

export class AuthActionsImpl implements AuthActions {
  constructor(
    private authService: AuthService,
    private store: Store
  ) {}

  async register(credential: AuthCredential): Promise<ActionResult<AuthSession>> {
    return this.executeWithErrorHandling(async () => {
      const session = await this.authService.register(credential);
      this.updateUserInStore(credential.email);
      return session;
    });
  }

  async login(credential: AuthCredential): Promise<ActionResult<AuthSession>> {
    return this.executeWithErrorHandling(async () => {
      const session = await this.authService.login(credential);
      this.updateUserInStore(credential.email);
      return session;
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
      await this.authService.sendPasswordResetRequest(email);
    });
  }

  async resetPassword(token: string, password: string): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      await this.authService.resetPassword(token, password);
    });
  }

  async bootstrap(): Promise<ActionResult<void>> {
    return this.executeWithErrorHandling(async () => {
      await this.authService.bootstrap();
      this.initializeStoreData();
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
    this.store.setState({
      ...this.store.getState(),
      user: this.createUser(email)
    });
  }

  private updateUserEmailInStore(email: string): void {
    const currentState = this.store.getState();
    if (currentState.user) {
      this.store.setState({
        ...currentState,
        user: {
          ...currentState.user,
          email,
          updatedAt: new Date().toISOString()
        }
      });
    }
  }

  private clearUserDataInStore(): void {
    this.store.setState({
      ...this.store.getState(),
      user: null,
      taskLists: [],
      activeSessionIds: []
    });
  }

  private initializeStoreData(): void {
    this.store.setState({
      ...this.store.getState(),
      // 初期データの読み込み処理
    });
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