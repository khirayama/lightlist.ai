// タスク管理アプリ SDK 型定義

// ユーザー関連
export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  theme: 'system' | 'light' | 'dark';
  language: 'ja' | 'en';
}

export interface AppSettings {
  id: string;
  taskInsertPosition: 'top' | 'bottom';
  autoSort: boolean;
}

// タスク関連
export interface Task {
  id: string;
  text: string;
  completed: boolean;
  date?: string;
  taskListId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskList {
  id: string;
  name: string;
  background?: string;
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
}

// 共同編集関連
export interface CollaborativeSession {
  id: string;
  taskListId: string;
  deviceId: string;
  sessionType: 'active' | 'background';
  expiresAt: string;
  isActive: boolean;
}

export interface CollaborativeState {
  documentState: string; // Base64エンコードされたY.jsドキュメント
  stateVector: string;   // Base64エンコードされたステートベクター
  hasUpdates: boolean;
}

// 共有関連
export interface TaskListShare {
  taskListId: string;
  shareToken: string;
  shareUrl: string;
  isActive: boolean;
}

// 認証関連
export interface AuthCredential {
  email: string;
  password: string;
  deviceId: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  deviceId: string;
}

// API関連
export interface ApiResponse<T> {
  data: T;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// アクション結果
export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: AppError;
  conflicts?: ConflictResolution[];
}

// エラー関連
export interface AppError {
  type: 'network' | 'validation' | 'auth' | 'conflict' | 'unknown';
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ConflictResolution {
  type: 'merge' | 'overwrite' | 'skip';
  description: string;
  resolution: any;
}

// Store状態
export interface StoreState {
  user: User | null;
  app: AppSettings | null;
  settings: UserSettings | null;
  taskLists: TaskList[];
  activeSessionIds: string[];
  syncStatus: SyncStatus;
  errors: AppError[];
}

export interface SyncStatus {
  pending: string[];     // 同期待ちのタスクリストID
  syncing: string[];     // 同期中のタスクリストID
  failed: string[];      // 同期失敗のタスクリストID
  lastSync: Record<string, string>; // タスクリストID -> 最終同期時刻
}

// Y.js関連
export interface YjsOperation {
  type: 'insert' | 'update' | 'delete' | 'move';
  taskListId: string;
  taskId?: string;
  position?: number;
  data?: any;
}

export interface YjsDocumentManager {
  getDoc(taskListId: string): Y.Doc;
  applyUpdate(taskListId: string, update: Uint8Array): void;
  createSnapshot(taskListId: string): Uint8Array;
  subscribeToUpdates(taskListId: string, callback: (update: Uint8Array) => void): () => void;
}