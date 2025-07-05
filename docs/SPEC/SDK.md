# タスク管理アプリ SDK設計書

## 目次

- [概要](#概要)
- [1. 型定義](#1-型定義)
- [2. Services層（API通信層）](#2-services層api通信層)
- [3. Actions層（ビジネスロジック層）](#3-actions層ビジネスロジック層)
- [4. 内部アーキテクチャ（Y.js統合とCollaborative機能）](#4-内部アーキテクチャyjs統合とcollaborative機能)
- [5. Store層（状態管理）](#5-store層状態管理)
- [6. エラーハンドリングとリカバリー機能](#6-エラーハンドリングとリカバリー機能)
- [7. メインSDKインターフェース](#7-メインsdkインターフェース)
- [8. 使用例](#8-使用例)
- [9. 実装上の注意点](#9-実装上の注意点)

## 概要

本SDKは、タスク管理アプリのクライアント（web/native）とAPI間の通信、リアルタイム共同編集、状態管理を統合的に提供します。

### アーキテクチャ

```
UI Layer (React Components)
    ↓
Actions Layer (Business Logic)
    ↓ ↓
Services Layer (API Communication)    Store Layer (State Management + Y.js)
```

#### 層の責務と関係性

- **UI Layer**: React コンポーネント。Actions Layer のみを呼び出す
- **Actions Layer**: ビジネスロジック。Services Layer を呼び出し、Store Layer を更新する
- **Services Layer**: API 通信、トークン管理、session storage、プラットフォーム抽象化。Store Layer は呼ばない
- **Store Layer**: 状態管理と Y.js。Actions Layer からのみ更新される

## 1. 型定義

### 基本データ構造

```typescript
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
```

## 2. Services層（API通信層）

**責務**: Services Layer は以下の処理を担当します：
1. **API通信**: RESTful API エンドポイントとの通信
2. **トークン管理**: JWT トークンの自動更新と管理
3. **Session Storage**: セッション情報や認証情報の永続化（内部機能）
4. **プラットフォーム抽象化**: Web と Native の永続化方法の差異を吸収（内部機能）
5. **エラーハンドリング**: ネットワークエラーや API エラーの処理

**重要**: Services Layer は Store Layer を直接呼び出しません。状態の更新は Actions Layer の責務です。

```typescript
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
```

## 3. Actions層（ビジネスロジック層）

**責務**: Actions Layer は以下の処理を担当します：
1. **Services Layer の呼び出し**: API通信やセッション管理を依頼
2. **Store Layer の更新**: 楽観的更新や状態の同期を実行  
3. **ビジネスロジック**: 複数の操作を組み合わせた処理フロー

Actions Layer は Services Layer を呼び出してデータを取得・更新し、同時に Store Layer を更新してUIに即座に反映します。Services Layer は Store Layer を直接呼び出しません。

```typescript
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
```

## 4. 内部アーキテクチャ（Y.js統合とCollaborative機能）

**注意: このセクションは内部実装の説明です。これらのインターフェースはSDKの内部で使用され、ユーザーには公開されません。**

### 内部実装概要

タスクリストとタスクの操作は、以下の内部コンポーネントによって自動的にリアルタイム同期されます：

```typescript
// === 内部実装 - ユーザーには公開されません ===

// 1. Y.js統合エンジン（内部）
interface InternalYjsIntegration {
  // タスクリスト操作時に自動実行
  createDocument(taskListId: string, initialData: TaskList): Y.Doc;
  syncDocument(taskListId: string): Promise<void>;
  destroyDocument(taskListId: string): void;
  
  // タスク操作時に自動実行
  applyTaskUpdate(taskListId: string, operation: TaskOperation): void;
  handleConflict(conflict: YjsConflict): ConflictResolution;
}

// 2. 協調編集マネージャー（内部）
interface InternalCollaborativeManager {
  // SDK初期化時に自動開始
  startAutoManagement(): void;
  
  // タスクリスト作成時に自動実行
  autoStartSession(taskListId: string): Promise<CollaborativeSession>;
  
  // タスクリスト削除時に自動実行
  autoEndSession(taskListId: string): Promise<void>;
  
  // エラー時に自動実行
  autoResolveConflict(conflict: YjsConflict): Promise<void>;
}

// 3. 内部データ構造
interface InternalYjsDocument {
  // Y.Doc.getMap('taskList') -> Y.Map<string, any>
  //   - id: string
  //   - name: string  
  //   - background: string
  //   - taskOrder: Y.Array<string>  // CRDTで自動マージ
  //   - tasks: Y.Map<string, Y.Map<string, any>>
  //     - [taskId]: Y.Map<string, any>
  //       - id: string
  //       - text: string           // Last-Writer-Wins
  //       - completed: boolean     // Last-Writer-Wins
  //       - date: string          // Last-Writer-Wins
  //       - createdAt: string
  //       - updatedAt: string
}

// 4. 自動競合解決ルール
interface InternalConflictResolution {
  // 1. タスクの順序（taskOrder）: Y.jsのCRDTアルゴリズムで自動マージ
  // 2. タスクの内容（text, completed, date）: Last-Writer-Wins（最終更新優先）
  // 3. タスクリストの設定（name, background）: Last-Writer-Wins
  // 4. 同時挿入: 挿入位置を調整してマージ
  // 5. 削除vs更新: 削除を優先
  // 6. ネットワーク切断: ローカル変更をキューイング、復帰時に自動同期
}
```

### ユーザー操作と内部処理の対応

```typescript
// ユーザーが実行する操作 → 内部で自動実行される処理

// タスクリスト作成
await sdk.taskLists.createTaskList({name: 'Shopping'});
// → 内部で自動実行:
//   1. Y.jsドキュメント作成
//   2. 協調編集セッション開始
//   3. 他のユーザーにリアルタイム通知

// タスク作成  
await sdk.tasks.createTask({text: 'Buy milk', taskListId: 'list123'});
// → 内部で自動実行:
//   1. 楽観的更新（即座にUI反映）
//   2. Y.jsドキュメントに追加
//   3. 他のユーザーにリアルタイム同期
//   4. サーバーへバックアップ

// タスク移動
await sdk.tasks.moveTask('task123', 0, 2);
// → 内部で自動実行:
//   1. 楽観的移動（即座にUI反映）
//   2. Y.jsのCRDTアルゴリズムで順序更新
//   3. 競合が発生した場合は自動マージ
//   4. 他のユーザーに順序同期

// ネットワーク切断時
// → 内部で自動実行:
//   1. オフライン変更をローカルキューに保存
//   2. 復帰時に自動的に変更を同期
//   3. 競合がある場合は自動解決
```

### 内部状態管理

```typescript
// SDKの内部状態（ユーザーには見えない）
interface InternalSDKState {
  // Y.jsドキュメント管理
  yjsDocs: Map<string, Y.Doc>;
  
  // 協調編集セッション管理
  activeSessions: Map<string, CollaborativeSession>;
  
  // 自動同期キュー
  syncQueue: Array<PendingOperation>;
  
  // 競合解決履歴
  conflictHistory: Array<ConflictResolution>;
  
  // ネットワーク状態
  isOnline: boolean;
  lastSyncTime: Map<string, Date>;
}
```

## 5. Store層（状態管理）

```typescript
// メインストア
export interface Store {
  // 現在の状態
  state: StoreState;
  
  // Y.jsドキュメント管理
  yjsDocs: Map<string, Y.Doc>;
  
  // 購読管理
  listeners: Set<StoreListener>;
  
  // メソッド
  getState(): StoreState;
  setState(updater: (state: StoreState) => StoreState): void;
  subscribe(listener: StoreListener): () => void;
  
  // Y.js統合
  getYjsDoc(taskListId: string): Y.Doc | null;
  setYjsDoc(taskListId: string, doc: Y.Doc): void;
  removeYjsDoc(taskListId: string): void;
  
  // 状態更新
  updateUser(user: User | null): void;
  updateApp(app: AppSettings | null): void;
  updateSettings(settings: UserSettings | null): void;
  updateTaskLists(taskLists: TaskList[]): void;
  updateTaskList(taskListId: string, updates: Partial<TaskList>): void;
  addTaskList(taskList: TaskList): void;
  removeTaskList(taskListId: string): void;
  
  // タスク操作
  updateTask(taskListId: string, taskId: string, updates: Partial<Task>): void;
  addTask(taskListId: string, task: Task): void;
  removeTask(taskListId: string, taskId: string): void;
  moveTask(taskListId: string, taskId: string, fromIndex: number, toIndex: number): void;
  
  // 同期状態管理
  setSyncStatus(taskListId: string, status: 'pending' | 'syncing' | 'failed', error?: AppError): void;
  clearSyncStatus(taskListId: string): void;
  addActiveSession(sessionId: string): void;
  removeActiveSession(sessionId: string): void;
  
  // エラー管理
  addError(error: AppError): void;
  removeError(errorId: string): void;
  clearErrors(): void;
}

// ストアリスナー
export type StoreListener = (state: StoreState, prevState: StoreState) => void;

// セレクター
export interface Selectors {
  // 基本セレクター
  getUser(state: StoreState): User | null;
  getApp(state: StoreState): AppSettings | null;
  getSettings(state: StoreState): UserSettings | null;
  getTaskLists(state: StoreState): TaskList[];
  getTaskList(state: StoreState, taskListId: string): TaskList | null;
  getTasks(state: StoreState, taskListId: string): Task[];
  getTask(state: StoreState, taskListId: string, taskId: string): Task | null;
  
  // 計算済みセレクター
  getCompletedTasks(state: StoreState, taskListId: string): Task[];
  getIncompleteTasks(state: StoreState, taskListId: string): Task[];
  getTasksByDate(state: StoreState, taskListId: string, date: string): Task[];
  getTaskListsInOrder(state: StoreState): TaskList[];
  
  // 同期状態セレクター
  getSyncingTaskLists(state: StoreState): string[];
  getFailedTaskLists(state: StoreState): string[];
  isTaskListSyncing(state: StoreState, taskListId: string): boolean;
  getLastSyncTime(state: StoreState, taskListId: string): string | null;
  
  // エラーセレクター
  getErrors(state: StoreState): AppError[];
  getErrorsByType(state: StoreState, type: AppError['type']): AppError[];
  hasErrors(state: StoreState): boolean;
  
  // 認証セレクター
  isAuthenticated(state: StoreState): boolean;
  isAuthenticating(state: StoreState): boolean;
}

// ストア初期化
export interface StoreConfig {
  initialState?: Partial<StoreState>;
  enableDevTools?: boolean;
  enablePersistence?: boolean;
  persistenceKey?: string;
  syncInterval?: number;
  maxRetries?: number;
}

// ストアファクトリー
export interface StoreFactory {
  createStore(config: StoreConfig): Store;
  createSelectors(store: Store): Selectors;
}

// イミュータブル更新ヘルパー
export interface ImmutableHelpers {
  updateTaskList(taskLists: TaskList[], taskListId: string, updates: Partial<TaskList>): TaskList[];
  addTaskList(taskLists: TaskList[], taskList: TaskList): TaskList[];
  removeTaskList(taskLists: TaskList[], taskListId: string): TaskList[];
  updateTask(taskList: TaskList, taskId: string, updates: Partial<Task>): TaskList;
  addTask(taskList: TaskList, task: Task): TaskList;
  removeTask(taskList: TaskList, taskId: string): TaskList;
  moveTask(taskList: TaskList, taskId: string, fromIndex: number, toIndex: number): TaskList;
  reorderTasks(taskList: TaskList, newOrder: string[]): TaskList;
}
```

## 6. エラーハンドリングとリカバリー機能

```typescript
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
  checkTaskListIntegrity(taskList: TaskList): IntegrityResult;
  checkYjsDocumentIntegrity(taskListId: string): IntegrityResult;
  checkSyncIntegrity(taskListId: string): IntegrityResult;
  
  // 修復
  repairTaskList(taskList: TaskList): TaskList;
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
```

## 7. メインSDKインターフェース

```typescript
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

// SDK状態
export interface SDKStatus {
  initialized: boolean;
  authenticated: boolean;
  online: boolean;
  syncing: boolean;
  errors: AppError[];
  warnings: AppWarning[];
  performance: PerformanceMetrics;
}

// SDKファクトリー
export interface SDKFactory {
  createSDK(config: SDKConfig): LightListSDK;
  createConfig(platform: 'web' | 'native'): SDKConfig;
  validateConfig(config: SDKConfig): ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}
```

## 8. 使用例

### 基本的な使用例

```typescript
// SDK初期化（シンプル化）
const sdk = new LightListSDK({
  apiUrl: 'https://api.lightlist.com',
  platform: 'web',
  enablePersistence: true,
  enableDebugMode: false
});

await sdk.initialize();

// 認証
const loginResult = await sdk.auth.login({
  email: 'user@example.com',
  password: 'password',
  deviceId: 'device-123'
});

if (loginResult.success) {
  // 初期データ読み込み
  await sdk.auth.bootstrap();
  
  // ストアの状態を監視
  sdk.store.subscribe((state, prevState) => {
    console.log('State updated:', state);
  });
  
  // タスクリスト作成（内部で自動的にリアルタイム同期開始）
  const taskListResult = await sdk.taskLists.createTaskList({
    name: 'My Tasks',
    background: '#FF5733'
  });
  
  if (taskListResult.success) {
    const taskList = taskListResult.data;
    
    // タスク作成（内部で自動的に楽観的更新 + リアルタイム同期）
    const taskResult = await sdk.tasks.createTask({
      text: 'Complete project',
      taskListId: taskList.id,
      date: '2024-01-01'
    });
    
    // タスク更新（即座にUI反映、バックグラウンドで他のユーザーに同期）
    if (taskResult.success) {
      await sdk.tasks.updateTask(taskResult.data.id, {
        text: 'Complete project ASAP'
      });
      
      // タスクの完了状態を切り替え（即座に反映）
      await sdk.tasks.toggleTaskCompletion(taskResult.data.id);
    }
  }
}
```

### リアルタイム同期の使用例

```typescript
// リアルタイム同期は透明に動作します
// ユーザーは特別な操作を行う必要がありません

// 複数ユーザー間でのタスク操作例
const taskListId = 'shared-list-123';

// ユーザーA: タスクを作成
const taskA = await sdk.tasks.createTask({
  text: 'Buy groceries',
  taskListId: taskListId
});
// → 他のユーザーのUIに即座に反映される

// ユーザーB: 同時にタスクを作成
const taskB = await sdk.tasks.createTask({
  text: 'Prepare dinner',
  taskListId: taskListId
});
// → 競合することなく、両方のタスクが全ユーザーに表示される

// ユーザーA: タスクの順序を変更
await sdk.tasks.moveTask(taskA.data.id, 0, 1);
// → 他のユーザーにも順序変更が即座に反映される

// ユーザーB: タスクを完了
await sdk.tasks.toggleTaskCompletion(taskB.data.id);
// → ユーザーAにも完了状態が即座に反映される

// 一括操作も同期される
await sdk.tasks.clearCompletedTasks(taskListId);
// → 完了済みタスクが全ユーザーから削除される

// ネットワーク切断・復帰も自動処理
// オフライン時の変更は復帰時に自動同期される
```

### エラーハンドリングの使用例

```typescript
// シンプルなエラーハンドリング
try {
  await sdk.tasks.createTask({
    text: 'New task',
    taskListId: 'invalid-id'
  });
} catch (error) {
  // ActionResultのerrorプロパティでエラー情報を取得
  console.error('Task creation failed:', error);
  
  // ユーザーに分かりやすいエラーメッセージを表示
  showUserFriendlyError('タスクの作成に失敗しました。しばらくしてから再試行してください。');
}

// ActionResultパターンによる統一的なエラーハンドリング
const result = await sdk.tasks.createTask({
  text: 'New task',
  taskListId: 'list-123'
});

if (result.success) {
  console.log('Task created successfully:', result.data);
} else {
  console.error('Error:', result.error?.message);
  
  // エラータイプに応じた処理
  switch (result.error?.type) {
    case 'network':
      showMessage('ネットワークエラーです。接続を確認してください。');
      break;
    case 'validation':
      showMessage('入力内容に問題があります。');
      break;
    case 'auth':
      showMessage('認証が必要です。');
      // 自動的にログイン画面にリダイレクト
      break;
    default:
      showMessage('予期しないエラーが発生しました。');
  }
}

// ネットワーク状態は内部で自動管理
// オフライン時の操作は自動的にキューイングされ、
// オンライン復帰時に自動同期される（ユーザーは何もする必要がない）
```

### 設定管理の使用例

```typescript
// 設定取得
const settingsResult = await sdk.settings.getSettings();
if (settingsResult.success) {
  const settings = settingsResult.data;
  
  // テーマ変更
  await sdk.settings.updateSettings({
    theme: 'dark'
  });
  
  // アプリ設定変更
  await sdk.settings.updateApp({
    taskInsertPosition: 'bottom',
    autoSort: true
  });
}

// タスクリストの並び替え
await sdk.settings.updateTaskListOrder([
  'taskList1',
  'taskList3',
  'taskList2'
]);
```

### React統合の使用例

```typescript
// React Hook
function useTaskList(taskListId: string) {
  const [taskList, setTaskList] = useState<TaskList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  
  useEffect(() => {
    const unsubscribe = sdk.store.subscribe((state) => {
      const newTaskList = sdk.selectors.getTaskList(state, taskListId);
      setTaskList(newTaskList);
      setLoading(false);
    });
    
    return unsubscribe;
  }, [taskListId]);
  
  const createTask = useCallback(async (task: Partial<Task>) => {
    setError(null);
    const result = await sdk.tasks.createTask({ ...task, taskListId });
    if (!result.success) {
      setError(result.error);
    }
  }, [taskListId]);
  
  return { taskList, loading, error, createTask };
}

// コンポーネント
function TaskListComponent({ taskListId }: { taskListId: string }) {
  const { taskList, loading, error, createTask } = useTaskList(taskListId);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!taskList) return <div>Task list not found</div>;
  
  return (
    <div>
      <h2>{taskList.name}</h2>
      {taskList.tasks.map(task => (
        <div key={task.id}>{task.text}</div>
      ))}
      <button onClick={() => createTask({ text: 'New task' })}>
        Add Task
      </button>
    </div>
  );
}
```

## 9. 実装上の注意点

### ユーザ体験
- トークンの自動リフレッシュ

### パフォーマンス最適化
- Y.jsの更新は小さな差分のみを送信
- ストア更新は必要最小限に抑制
- 大量のタスクリストに対する効率的な処理
- メモリリークの防止

### セキュリティ
- JWTトークンの安全な管理
- Y.js更新の検証
- XSS/CSRF対策
- 機密情報の適切な暗号化

### 信頼性
- ネットワーク切断時の適切な処理
- データの整合性保証
- 自動リカバリー機能
- 適切なエラーメッセージ

### 拡張性
- 新しい機能の追加容易性
- プラットフォーム間の互換性
- 第三者プラグインのサポート
- 将来的なAPI変更への対応
