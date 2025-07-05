// Actions層（ビジネスロジック層）インターフェース定義

import { 
  AuthCredential, 
  AuthSession, 
  UserSettings, 
  AppSettings, 
  TaskList, 
  Task,
  TaskListShare,
  ActionResult 
} from '../types';

// 認証アクション
export interface AuthActions {
  register(credential: AuthCredential): Promise<ActionResult<AuthSession>>;
  login(credential: AuthCredential): Promise<ActionResult<AuthSession>>;
  logout(): Promise<ActionResult<void>>;
  deleteUser(): Promise<ActionResult<void>>;
  updateEmail(credential: AuthCredential): Promise<ActionResult<void>>;
  updatePassword(credential: AuthCredential): Promise<ActionResult<void>>;
  sendPasswordResetRequest(email: string): Promise<ActionResult<void>>;
  resetPassword(token: string, password: string): Promise<ActionResult<void>>;
  bootstrap(): Promise<ActionResult<void>>;
}

// 設定アクション
export interface SettingsActions {
  getSettings(): Promise<ActionResult<UserSettings>>;
  updateSettings(settings: Partial<UserSettings>): Promise<ActionResult<UserSettings>>;
  getApp(): Promise<ActionResult<AppSettings>>;
  updateApp(app: Partial<AppSettings>): Promise<ActionResult<AppSettings>>;
  updateTaskListOrder(order: string[]): Promise<ActionResult<void>>;
}

// タスクリストアクション（Y.js協調編集を内部で自動実行）
export interface TaskListActions {
  // 基本操作（内部実装：CollaborativeService経由でY.jsドキュメント操作）
  
  // タスクリスト一覧取得：SettingsService.getTaskListOrder() + 各Y.jsドキュメントから構築
  getTaskLists(): Promise<ActionResult<TaskList[]>>;
  
  // タスクリスト作成：CollaborativeService.createTaskListDocument() → Y.js更新送信
  createTaskList(taskList: Partial<TaskList>): Promise<ActionResult<TaskList>>;
  
  // タスクリスト更新：CollaborativeService.updateTaskListDocument() → Y.js更新送信
  updateTaskList(taskListId: string, updates: Partial<TaskList>): Promise<ActionResult<TaskList>>;
  
  // タスクリスト削除：CollaborativeService.deleteTaskListDocument() → セッション終了
  deleteTaskList(taskListId: string): Promise<ActionResult<void>>;
  
  // 順序変更：SettingsService.updateTaskListOrder() → 永続化
  moveTaskList(fromIndex: number, toIndex: number): Promise<ActionResult<void>>;
  
  // 便利メソッド（同様にY.js経由で実装）
  duplicateTaskList(taskListId: string): Promise<ActionResult<TaskList>>;
  archiveTaskList(taskListId: string): Promise<ActionResult<void>>;
  restoreTaskList(taskListId: string): Promise<ActionResult<void>>;
  
  // 注意: 以下は削除（内部で自動管理）
  // - startCollaboration() → createTaskList()内で自動実行
  // - endCollaboration() → deleteTaskList()内で自動実行  
  // - syncTaskList() → 全操作で自動実行
}

// タスクアクション（Y.js経由でリアルタイム同期を内部で自動実行）
export interface TaskActions {
  // 基本操作（内部実装：CollaborativeService経由でY.jsドキュメント操作）
  
  // タスク作成：CollaborativeService.createTaskInDocument() → Y.js更新送信
  createTask(task: Partial<Task>): Promise<ActionResult<Task>>;
  
  // タスク更新：CollaborativeService.updateTaskInDocument() → Y.js更新送信
  updateTask(taskId: string, updates: Partial<Task>): Promise<ActionResult<Task>>;
  
  // タスク削除：CollaborativeService.deleteTaskInDocument() → Y.js更新送信
  deleteTask(taskId: string): Promise<ActionResult<void>>;
  
  // タスク移動：CollaborativeService.moveTaskInDocument() → Y.js順序更新送信
  moveTask(taskId: string, fromIndex: number, toIndex: number, targetTaskListId?: string): Promise<ActionResult<void>>;
  
  // 完了切り替え：CollaborativeService.updateTaskInDocument() → completed状態をY.js更新
  toggleTaskCompletion(taskId: string): Promise<ActionResult<Task>>;
  
  // 一括操作（同様にCollaborativeService経由で実装）
  
  // ソート：Y.jsドキュメント内のtaskOrder配列を更新
  sortTasks(taskListId: string, sortBy: 'date' | 'name' | 'completion'): Promise<ActionResult<void>>;
  
  // 一括削除：完了済みタスクをY.jsドキュメントから削除
  clearCompletedTasks(taskListId: string): Promise<ActionResult<void>>;
  
  // 便利メソッド（同様にY.js経由で実装）
  duplicateTask(taskId: string): Promise<ActionResult<Task>>;
  batchUpdateTasks(updates: Array<{ taskId: string; updates: Partial<Task> }>): Promise<ActionResult<Task[]>>;
  
  // 注意: 以下は削除（内部で自動管理）
  // - optimisticUpdateTask() → 楽観的更新は内部で自動実行
  // - revertOptimisticUpdate() → エラー時に自動リカバリ
  // - Y.js操作 → CollaborativeService経由で透明に実行
}

// 共有アクション
export interface ShareActions {
  createShareLink(taskListId: string): Promise<ActionResult<TaskListShare>>;
  getSharedTaskList(shareToken: string): Promise<ActionResult<TaskList>>;
  copySharedTaskList(shareToken: string): Promise<ActionResult<TaskList>>;
  removeShareLink(taskListId: string): Promise<ActionResult<void>>;
  refreshShareCode(taskListId: string): Promise<ActionResult<TaskListShare>>;
}

// 統合アクション（同期処理は内部で自動管理されるため、syncは削除）
export interface Actions {
  auth: AuthActions;
  settings: SettingsActions;
  taskLists: TaskListActions;
  tasks: TaskActions;
  share: ShareActions;
  
  // 注意: 以下は削除されました（内部で自動管理されるため）
  // - sync: SyncActions → 各操作で自動実行
  //   - startAutoSync() → SDK初期化時に自動開始
  //   - stopAutoSync() → SDK終了時に自動停止
  //   - syncAll() → ネットワーク復帰時に自動実行
  //   - syncTaskList() → 各タスクリスト操作で自動実行
  //   - handleConflict() → 競合検出時に自動実行
  //   - retryFailedSync() → エラー時に自動リトライ
}