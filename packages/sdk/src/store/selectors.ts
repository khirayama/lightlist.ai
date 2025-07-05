import { Selectors, Store } from './index';
import { StoreState, User, AppSettings, UserSettings, TaskList, Task, AppError } from '../types';

export function createSelectors(store: Store): Selectors {
  return {
    // 基本セレクター
    getUser(state: StoreState): User | null {
      return state.user;
    },

    getApp(state: StoreState): AppSettings | null {
      return state.app;
    },

    getSettings(state: StoreState): UserSettings | null {
      return state.settings;
    },

    getTaskLists(state: StoreState): TaskList[] {
      return state.taskLists;
    },

    getTaskList(state: StoreState, taskListId: string): TaskList | null {
      return state.taskLists.find(taskList => taskList.id === taskListId) || null;
    },

    getTasks(state: StoreState, taskListId: string): Task[] {
      const taskList = state.taskLists.find(tl => tl.id === taskListId);
      return taskList ? taskList.tasks : [];
    },

    getTask(state: StoreState, taskListId: string, taskId: string): Task | null {
      const taskList = state.taskLists.find(tl => tl.id === taskListId);
      if (!taskList) return null;
      
      return taskList.tasks.find(task => task.id === taskId) || null;
    },

    // 計算済みセレクター
    getCompletedTasks(state: StoreState, taskListId: string): Task[] {
      const tasks = this.getTasks(state, taskListId);
      return tasks.filter(task => task.completed);
    },

    getIncompleteTasks(state: StoreState, taskListId: string): Task[] {
      const tasks = this.getTasks(state, taskListId);
      return tasks.filter(task => !task.completed);
    },

    getTasksByDate(state: StoreState, taskListId: string, date: string): Task[] {
      const tasks = this.getTasks(state, taskListId);
      return tasks.filter(task => task.date === date);
    },

    getTaskListsInOrder(state: StoreState): TaskList[] {
      // 現在は単純にそのまま返すが、将来的に順序管理機能を追加予定
      return state.taskLists;
    },

    // 同期状態セレクター
    getSyncingTaskLists(state: StoreState): string[] {
      return state.syncStatus.syncing;
    },

    getFailedTaskLists(state: StoreState): string[] {
      return state.syncStatus.failed;
    },

    isTaskListSyncing(state: StoreState, taskListId: string): boolean {
      return state.syncStatus.syncing.includes(taskListId);
    },

    getLastSyncTime(state: StoreState, taskListId: string): string | null {
      return state.syncStatus.lastSync[taskListId] || null;
    },

    // エラーセレクター
    getErrors(state: StoreState): AppError[] {
      return state.errors;
    },

    getErrorsByType(state: StoreState, type: AppError['type']): AppError[] {
      return state.errors.filter(error => error.type === type);
    },

    hasErrors(state: StoreState): boolean {
      return state.errors.length > 0;
    },

    // 認証セレクター
    isAuthenticated(state: StoreState): boolean {
      return state.user !== null;
    },

    isAuthenticating(state: StoreState): boolean {
      // 将来的に認証中状態をStoreStateに追加予定
      return false;
    }
  };
}