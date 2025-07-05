// Store層（状態管理）インターフェース定義とエクスポート

import * as Y from 'yjs';
import { 
  StoreState, 
  User, 
  AppSettings, 
  UserSettings, 
  TaskList, 
  Task, 
  AppError 
} from '../types';

// 実装をエクスポート
export { createStore } from './implementation';
export { createSelectors } from './selectors';

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