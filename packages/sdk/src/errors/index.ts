// エラーハンドリングとリカバリー機能インターフェース定義

import { AppError, ApiError, SyncStatus } from '../types';

// エラーコンテキスト
export interface ErrorContext {
  operation: string;
  taskListId?: string;
  taskId?: string;
  userId?: string;
  deviceId?: string;
  timestamp: string;
  stackTrace?: string;
  additionalData?: Record<string, any>;
}

// 警告
export interface AppWarning {
  type: 'network' | 'sync' | 'storage' | 'performance';
  message: string;
  context?: ErrorContext;
  severity: 'low' | 'medium' | 'high';
}

// バリデーションエラー
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value: any;
}

// リカバリーアクション
export interface RecoveryAction {
  type: 'retry' | 'reload' | 'reset' | 'login' | 'sync';
  label: string;
  description: string;
  action: () => Promise<void>;
  priority: number;
}

// リトライ戦略
export interface RetryStrategy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition: (error: AppError, attempt: number) => boolean;
}

// エラーハンドラー
export interface ErrorHandler {
  // エラー処理
  handleError(error: Error, context?: ErrorContext): AppError;
  handleApiError(error: ApiError, context?: ErrorContext): AppError;
  handleNetworkError(error: Error, context?: ErrorContext): AppError;
  handleValidationError(error: ValidationError, context?: ErrorContext): AppError;
  
  // エラー報告
  reportError(error: AppError): void;
  reportWarning(warning: AppWarning): void;
  
  // エラー分類
  classifyError(error: Error): AppError['type'];
  isRetryableError(error: AppError): boolean;
  getRecoveryActions(error: AppError): RecoveryAction[];
}

// リトライマネージャー
export interface RetryManager {
  retry<T>(
    operation: () => Promise<T>,
    strategy: RetryStrategy,
    context?: ErrorContext
  ): Promise<T>;
  
  scheduleRetry(
    operation: () => Promise<void>,
    strategy: RetryStrategy,
    context?: ErrorContext
  ): void;
  
  cancelRetry(operationId: string): void;
  getRetryStatus(operationId: string): RetryStatus | null;
  clearAllRetries(): void;
}

export interface RetryStatus {
  id: string;
  attempts: number;
  maxRetries: number;
  nextRetryAt: string;
  lastError: AppError;
  isActive: boolean;
}

// ネットワーク状態管理
export interface NetworkManager {
  // ネットワーク状態
  isOnline(): boolean;
  getConnectionType(): 'none' | 'wifi' | 'cellular' | 'unknown';
  getConnectionQuality(): 'high' | 'medium' | 'low' | 'unknown';
  
  // イベント
  onNetworkChange(callback: (isOnline: boolean) => void): () => void;
  onConnectionTypeChange(callback: (type: string) => void): () => void;
  
  // オフライン対応
  enableOfflineMode(): void;
  disableOfflineMode(): void;
  isOfflineModeEnabled(): boolean;
  
  // 同期キュー
  addToSyncQueue(operation: SyncOperation): void;
  processSyncQueue(): Promise<void>;
  clearSyncQueue(): void;
  getSyncQueueStatus(): SyncQueueStatus;
}

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: 'task' | 'taskList' | 'settings';
  data: any;
  timestamp: string;
  priority: number;
}

export interface SyncQueueStatus {
  pending: number;
  processing: number;
  failed: number;
  lastProcessed: string;
}

// 競合解決
export interface ConflictResolver {
  // 競合検出
  detectConflict(local: any, remote: any): YjsConflict | null;
  
  // 自動解決
  autoResolve(conflict: YjsConflict): ConflictResolution | null;
  
  // 手動解決
  proposeResolutions(conflict: YjsConflict): ConflictResolution[];
  applyResolution(conflict: YjsConflict, resolution: ConflictResolution): Promise<void>;
  
  // 解決履歴
  getConflictHistory(taskListId: string): ConflictHistoryEntry[];
  clearConflictHistory(taskListId: string): void;
}

export interface YjsConflict {
  type: 'concurrent_edit' | 'order_conflict' | 'deletion_conflict';
  taskListId: string;
  localChange: any;
  remoteChange: any;
  timestamp: string;
}

export interface ConflictResolution {
  type: 'merge' | 'overwrite' | 'skip';
  description: string;
  resolution: any;
}

export interface ConflictHistoryEntry {
  id: string;
  conflict: YjsConflict;
  resolution: ConflictResolution;
  timestamp: string;
  outcome: 'success' | 'failed';
}

// データ整合性チェック
export interface DataIntegrityChecker {
  // 整合性チェック
  checkTaskListIntegrity(taskList: any): IntegrityResult;
  checkYjsDocumentIntegrity(taskListId: string): IntegrityResult;
  checkSyncIntegrity(taskListId: string): IntegrityResult;
  
  // 修復
  repairTaskList(taskList: any): any;
  repairYjsDocument(taskListId: string): Promise<void>;
  repairSyncState(taskListId: string): Promise<void>;
  
  // 診断
  runDiagnostics(): Promise<DiagnosticResult>;
  exportDiagnostics(): Promise<string>;
}

export interface IntegrityResult {
  isValid: boolean;
  issues: IntegrityIssue[];
  suggestions: string[];
}

export interface IntegrityIssue {
  type: 'missing' | 'duplicate' | 'corrupted' | 'inconsistent';
  field: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  canAutoFix: boolean;
}

export interface DiagnosticResult {
  timestamp: string;
  version: string;
  platform: string;
  storageUsage: number;
  cacheStats: CacheStats;
  syncStatus: SyncStatus;
  integrityResults: IntegrityResult[];
  errors: AppError[];
  warnings: AppWarning[];
  performance: PerformanceMetrics;
}

export interface CacheStats {
  size: number;
  hitRate: number;
  missRate: number;
  lastClearTime: string;
}

export interface PerformanceMetrics {
  syncLatency: number;
  renderTime: number;
  memoryUsage: number;
  storageRead: number;
  storageWrite: number;
}

// 統合エラー管理
export interface ErrorManager {
  errorHandler: ErrorHandler;
  retryManager: RetryManager;
  networkManager: NetworkManager;
  conflictResolver: ConflictResolver;
  integrityChecker: DataIntegrityChecker;
  
  // 統合操作
  handleOperationError(error: Error, operation: string, context?: ErrorContext): Promise<void>;
  recoverFromError(error: AppError): Promise<boolean>;
  preventError(riskFactors: string[]): void;
  
  // 監視
  startErrorMonitoring(): void;
  stopErrorMonitoring(): void;
  getErrorStats(): ErrorStats;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<string, number>;
  recoveredErrors: number;
  unrecoveredErrors: number;
  averageRecoveryTime: number;
  lastError: AppError | null;
}