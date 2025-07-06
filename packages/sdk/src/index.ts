// SDK メインエントリポイント

// Actions
export { ActionsImpl } from './actions/implementation/actions';
export { SettingsActionsImpl } from './actions/implementation/settings-actions';
export { AuthActionsImpl } from './actions/implementation/auth-actions';
export { TaskListActionsImpl } from './actions/implementation/tasklist-actions';
export { TaskActionsImpl } from './actions/implementation/task-actions';
export { ShareActionsImpl } from './actions/implementation/share-actions';

// Services
export { SettingsServiceImpl } from './services/implementation/settings.service';
export { AuthServiceImpl } from './services/implementation/auth.service';
export { CollaborativeServiceImpl } from './services/implementation/collaborative.service';
export { ShareServiceImpl } from './services/implementation/share.service';

// Store
export { StoreImpl as Store } from './store/implementation';
export * from './store/selectors';

// Types
export * from './types';

// Interfaces
export type { 
  SettingsActions, 
  AuthActions, 
  TaskListActions, 
  TaskActions, 
  ShareActions,
  Actions 
} from './actions';

export type { 
  SettingsService,
  AuthService,
  CollaborativeService,
  ShareService
} from './services';

export type { Store as StoreInterface } from './store';

// SDK Factory Function
import { ActionsImpl } from './actions/implementation/actions';
import { SettingsServiceImpl } from './services/implementation/settings.service';
import { AuthServiceImpl } from './services/implementation/auth.service';
import { CollaborativeServiceImpl } from './services/implementation/collaborative.service';
import { ShareServiceImpl } from './services/implementation/share.service';
import { StoreImpl } from './store/implementation';
import { HttpClientImpl } from './services/base/http-client';

// HTTP Client (export type and value separately)
export type { HttpClient } from './services/base/http-client';
export { HttpClientImpl } from './services/base/http-client';

export interface SDKConfig {
  apiUrl: string;
  apiTimeout?: number;
}

export function createSDK(config: SDKConfig) {
  const store = new StoreImpl({});
  
  // 簡単なストレージ実装（ブラウザまたはネイティブ対応）
  const storage = typeof window !== 'undefined' ? window.localStorage : {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  };

  // AuthServiceを先に作成（循環参照を避けるため、httpClientは後で設定）
  let authService: AuthServiceImpl;
  let isRefreshing = false;
  
  // HttpClientを設定（認証トークンの自動設定と401エラー時の自動リフレッシュ）
  const httpClient = new HttpClientImpl({
    baseUrl: config.apiUrl,
    timeout: config.apiTimeout || 10000,
    retries: 3,
    getAuthToken: async () => {
      if (authService) {
        return authService.getAccessToken();
      }
      return null;
    },
    onUnauthorized: async () => {
      if (authService && !isRefreshing) {
        isRefreshing = true;
        try {
          const refreshToken = authService.getRefreshToken();
          if (refreshToken) {
            await authService.refresh(refreshToken);
          }
        } catch (error) {
          // リフレッシュに失敗した場合、トークンをクリア
          await authService.logout();
          throw error;
        } finally {
          isRefreshing = false;
        }
      }
    }
  });

  // AuthServiceを初期化
  authService = new AuthServiceImpl(httpClient, storage);
  
  const settingsService = new SettingsServiceImpl(httpClient);
  const collaborativeService = new CollaborativeServiceImpl(httpClient);
  const shareService = new ShareServiceImpl(httpClient);

  const actions = new ActionsImpl(
    authService,
    settingsService,
    collaborativeService,
    shareService,
    store
  );

  return {
    actions,
    store,
    httpClient,
    authService
  };
}