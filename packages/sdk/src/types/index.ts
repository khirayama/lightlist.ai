/**
 * ユーザー関連の型定義
 */
export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 認証トークン関連の型定義
 */
export interface AuthTokens {
  token: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

/**
 * 認証レスポンスの型定義
 */
export interface AuthResponse {
  message: string;
  data: {
    user: User;
    token: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  };
}

/**
 * タスクリスト関連の型定義
 */
export interface TaskList {
  id: string;
  name: string;
  background: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * タスク関連の型定義
 */
export interface Task {
  id: string;
  text: string;
  completed: boolean;
  date: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * アプリ設定の型定義
 */
export interface AppSettings {
  id: string;
  taskListOrder: string[];
  taskInsertPosition: 'top' | 'bottom';
  autoSort: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * ユーザー設定の型定義
 */
export interface UserSettings {
  theme: 'system' | 'light' | 'dark';
  language: 'ja' | 'en';
}

/**
 * 共有タスクリストの型定義
 */
export interface SharedTaskList {
  taskList: TaskList & {
    tasks: Task[];
  };
}

/**
 * APIエラーレスポンスの型定義
 */
export interface ApiError {
  error: string;
  details?: string[];
}

/**
 * API成功レスポンスの型定義
 */
export interface ApiResponse<T = any> {
  message: string;
  data?: T;
}

/**
 * リクエストの型定義
 */
export interface RegisterRequest {
  email: string;
  password: string;
  deviceId: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceId: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
  deviceId: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  email?: string;
}

export interface CreateTaskListRequest {
  name: string;
}

export interface UpdateTaskListRequest {
  name?: string;
  background?: string;
}

export interface CreateTaskRequest {
  text: string;
}

export interface UpdateTaskRequest {
  text?: string;
  completed?: boolean;
  date?: string | null;
}

export interface UpdateTaskListOrderRequest {
  taskListIds: string[];
}

export interface UpdateAppSettingsRequest {
  taskInsertPosition?: 'top' | 'bottom';
  autoSort?: boolean;
}

export interface UpdateUserSettingsRequest {
  theme?: 'system' | 'light' | 'dark';
  language?: 'ja' | 'en';
}

/**
 * 共同編集関連の型定義
 */
export interface CollaborativeState {
  state: string; // base64エンコードされたYjsステート
  stateVector: string; // base64エンコードされたステートベクター
}

export interface CollaborativeSyncRequest {
  stateVector: string;
  update?: string;
}

export interface CollaborativeSyncResponse {
  update?: string;
  stateVector: string;
}