// Services層（API通信層）インターフェース定義

import { 
  AuthCredential, 
  AuthSession, 
  UserSettings, 
  AppSettings, 
  TaskList, 
  Task,
  TaskListShare,
  CollaborativeSession,
  CollaborativeState,
  ApiResponse 
} from '../types';

// 認証サービス
export interface AuthService {
  register(credential: AuthCredential): Promise<ApiResponse<AuthSession>>;
  login(credential: AuthCredential): Promise<ApiResponse<AuthSession>>;
  logout(): Promise<ApiResponse<void>>;
  refresh(refreshToken: string): Promise<ApiResponse<AuthSession>>;
  forgotPassword(email: string): Promise<ApiResponse<void>>;
  resetPassword(token: string, password: string): Promise<ApiResponse<void>>;
  deleteUser(): Promise<ApiResponse<void>>;
  updateEmail(credential: AuthCredential): Promise<ApiResponse<void>>;
  updatePassword(credential: AuthCredential): Promise<ApiResponse<void>>;
  
  // トークン取得メソッド（bootstrap時の認証状態確認に使用）
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  getDeviceId(): string | null;
}

// 設定サービス（タスクリストの初期データ取得も含む）
export interface SettingsService {
  // ユーザー設定
  getSettings(): Promise<ApiResponse<UserSettings>>;
  updateSettings(settings: Partial<UserSettings>): Promise<ApiResponse<UserSettings>>;
  
  // アプリ設定
  getApp(): Promise<ApiResponse<AppSettings>>;
  updateApp(app: Partial<AppSettings>): Promise<ApiResponse<AppSettings>>;
  
  // タスクリスト順序管理（API設計書: GET /app/taskListOrder）
  getTaskListOrder(): Promise<ApiResponse<string[]>>;
  updateTaskListOrder(order: string[]): Promise<ApiResponse<void>>;
}

// 注意: タスク管理サービスは削除されました
// 理由: API設計書にタスク関連のAPIエンドポイントが存在しないため
// 
// タスクとタスクリストの操作は以下の方法で実現されます：
// 1. 初期データ取得: SettingsService.getTaskListOrder()
// 2. リアルタイム操作: CollaborativeService経由でY.jsドキュメント操作
// 3. 永続化: Y.js更新がサーバーに自動同期される

// 共同編集サービス（タスクとタスクリストの実際の操作を担当）
export interface CollaborativeService {
  // セッション管理（API設計書に準拠）
  startSession(taskListId: string, sessionType: 'active' | 'background'): Promise<ApiResponse<CollaborativeSession>>;
  getState(taskListId: string): Promise<ApiResponse<CollaborativeState>>;
  sendUpdate(taskListId: string, update: string): Promise<ApiResponse<{ stateVector: string }>>;
  maintainSession(taskListId: string): Promise<ApiResponse<void>>;
  endSession(taskListId: string): Promise<ApiResponse<void>>;
  
  // 初期データ読み込み（Y.jsドキュメント初期化用）
  getTaskLists(): Promise<ApiResponse<TaskList[]>>;
  initializeTaskList(taskListId: string): Promise<ApiResponse<TaskList>>;
  
  // Y.js操作ヘルパー（内部でsendUpdateを使用）
  createTaskListDocument(taskList: Partial<TaskList>): Promise<ApiResponse<TaskList>>;
  updateTaskListDocument(taskListId: string, updates: Partial<TaskList>): Promise<ApiResponse<void>>;
  deleteTaskListDocument(taskListId: string): Promise<ApiResponse<void>>;
  
  createTaskInDocument(taskListId: string, task: Partial<Task>): Promise<ApiResponse<Task>>;
  updateTaskInDocument(taskListId: string, taskId: string, updates: Partial<Task>): Promise<ApiResponse<void>>;
  deleteTaskInDocument(taskListId: string, taskId: string): Promise<ApiResponse<void>>;
  moveTaskInDocument(taskListId: string, taskId: string, fromIndex: number, toIndex: number): Promise<ApiResponse<void>>;
}

// 共有サービス
export interface ShareService {
  createShareLink(taskListId: string): Promise<ApiResponse<TaskListShare>>;
  getSharedTaskList(shareToken: string): Promise<ApiResponse<TaskList>>;
  copySharedTaskList(shareToken: string): Promise<ApiResponse<TaskList>>;
  removeShareLink(taskListId: string): Promise<ApiResponse<void>>;
}

// 監視サービス
export interface MonitoringService {
  getHealth(): Promise<ApiResponse<{ status: string; timestamp: string }>>;
  getMetrics(): Promise<ApiResponse<{ activeUsers: number; activeSessions: number }>>;
}

// 統合APIサービス（実際のAPIエンドポイントのみ）
export interface ApiService {
  auth: AuthService;
  settings: SettingsService;
  collaborative: CollaborativeService;
  share: ShareService;
  monitoring: MonitoringService;
  
  // 注意: tasksは削除されました
  // 理由: API設計書にタスク関連のAPIエンドポイントが存在しないため
  // タスク操作はcollaborativeサービス経由でY.jsドキュメント操作として実現されます
}