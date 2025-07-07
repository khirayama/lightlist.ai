// 共通型定義

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

// アクション結果
export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: AppError;
  conflicts?: ConflictResolution[];
}

// Store状態
export interface StoreState {
  user: User | null;
  app: AppSettings | null;
  settings: UserSettings | null;
  taskLists: TaskList[];
  taskListOrder: string[]; // タスクリストの並び順（API設計書: GET /app/taskListOrder）
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