// メインSDKクラス（シンプル化されたインターフェース）

import { Actions, AuthActions, SettingsActions, TaskListActions, TaskActions, ShareActions } from './actions';
import { Store, Selectors } from './store';
import { ErrorManager } from './errors';
import { ApiService } from './services';

// メインSDKクラス（シンプル化されたインターフェース）
export class LightListSDK {
  // 各コンポーネント（内部実装）
  private apiService: ApiService;
  private actions: Actions;
  private store: Store;
  private errorManager: ErrorManager;
  
  // 内部依存（ユーザーには公開されない）
  private collaborativeManager: InternalCollaborativeManager;
  private yjsIntegration: InternalYjsIntegration;
  
  constructor(config: SDKConfig) {
    // 初期化処理
    // 内部で協調編集機能が自動開始される
  }
  
  // 公開インターフェース（シンプル化）
  public readonly auth: AuthActions;
  public readonly settings: SettingsActions;
  public readonly taskLists: TaskListActions;
  public readonly tasks: TaskActions;
  public readonly share: ShareActions;
  
  // ストア
  public readonly store: Store;
  public readonly selectors: Selectors;
  
  // 設定
  configure(config: Partial<SDKConfig>): void;
  getConfig(): SDKConfig;
  
  // 初期化
  initialize(): Promise<void>;
  destroy(): void;
  
  // 状態
  isInitialized(): boolean;
  getStatus(): SDKStatus;
  
  // デバッグ
  exportDiagnostics(): Promise<string>;
  enableDebugMode(): void;
  disableDebugMode(): void;
}

// 内部インターフェース（実装詳細）
interface InternalCollaborativeManager {
  startAutoManagement(): void;
  autoStartSession(taskListId: string): Promise<any>;
  autoEndSession(taskListId: string): Promise<void>;
  autoResolveConflict(conflict: any): Promise<void>;
}

interface InternalYjsIntegration {
  createDocument(taskListId: string, initialData: any): any;
  syncDocument(taskListId: string): Promise<void>;
  destroyDocument(taskListId: string): void;
  applyTaskUpdate(taskListId: string, operation: any): void;
  handleConflict(conflict: any): any;
}

// SDK設定
export interface SDKConfig {
  // API設定
  apiUrl: string;
  apiTimeout: number;
  retryConfig: RetryStrategy;
  
  // プラットフォーム
  platform: 'web' | 'native';
  
  // 永続化設定（Services Layer 内部で管理）
  enablePersistence: boolean;
  encryptionEnabled: boolean;
  cacheSize: number;
  cacheTTL: number;
  persistenceKey: string;
  
  // 共同編集
  enableCollaborativeEditing: boolean;
  collaborativeConfig: CollaborativeConfig;
  
  // エラーハンドリング
  enableErrorRecovery: boolean;
  errorConfig: ErrorConfig;
  
  // デバッグ
  enableDebugMode: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface CollaborativeConfig {
  syncInterval: number;
  sessionTimeout: number;
  conflictResolution: 'auto' | 'manual' | 'hybrid';
}

export interface ErrorConfig {
  maxRetries: number;
  retryDelay: number;
  enableReporting: boolean;
  reportingUrl?: string;
}

export interface RetryStrategy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition: (error: any, attempt: number) => boolean;
}

// SDK状態
export interface SDKStatus {
  initialized: boolean;
  authenticated: boolean;
  online: boolean;
  syncing: boolean;
  errors: any[];
  warnings: any[];
  performance: any;
}

// SDKファクトリー
export interface SDKFactory {
  createSDK(config: SDKConfig): LightListSDK;
  createConfig(platform: 'web' | 'native'): SDKConfig;
  validateConfig(config: SDKConfig): ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: any[];
  warnings: string[];
}