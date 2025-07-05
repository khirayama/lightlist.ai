import { describe, it, expect, beforeEach } from 'vitest';
import { createTestStore } from './setup';
import { Store } from '../index';
import { createSelectors } from '../selectors';
import { User, AppSettings, UserSettings, TaskList, Task, AppError } from '../../types';

describe('Store セレクター機能', () => {
  let store: Store;
  let selectors: ReturnType<typeof createSelectors>;

  beforeEach(() => {
    store = createTestStore();
    selectors = createSelectors(store);
  });

  describe('基本セレクター', () => {
    it('ユーザー情報を取得できる', () => {
      const user: User = {
        id: 'user1',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      store.updateUser(user);
      
      const state = store.getState();
      expect(selectors.getUser(state)).toEqual(user);
    });

    it('ユーザー情報がnullの場合nullを返す', () => {
      const state = store.getState();
      expect(selectors.getUser(state)).toBeNull();
    });

    it('App設定を取得できる', () => {
      const app: AppSettings = {
        id: 'app1',
        taskInsertPosition: 'top',
        autoSort: true
      };
      
      store.updateApp(app);
      
      const state = store.getState();
      expect(selectors.getApp(state)).toEqual(app);
    });

    it('ユーザー設定を取得できる', () => {
      const settings: UserSettings = {
        theme: 'dark',
        language: 'en'
      };
      
      store.updateSettings(settings);
      
      const state = store.getState();
      expect(selectors.getSettings(state)).toEqual(settings);
    });

    it('タスクリスト一覧を取得できる', () => {
      const taskList1: TaskList = {
        id: 'list1',
        name: 'リスト1',
        tasks: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const taskList2: TaskList = {
        id: 'list2',
        name: 'リスト2',
        tasks: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      store.addTaskList(taskList1);
      store.addTaskList(taskList2);
      
      const state = store.getState();
      expect(selectors.getTaskLists(state)).toEqual([taskList1, taskList2]);
    });

    it('特定のタスクリストを取得できる', () => {
      const taskList: TaskList = {
        id: 'list1',
        name: 'テストリスト',
        tasks: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      store.addTaskList(taskList);
      
      const state = store.getState();
      expect(selectors.getTaskList(state, 'list1')).toEqual(taskList);
    });

    it('存在しないタスクリストはnullを返す', () => {
      const state = store.getState();
      expect(selectors.getTaskList(state, 'nonexistent')).toBeNull();
    });

    it('タスク一覧を取得できる', () => {
      const taskList: TaskList = {
        id: 'list1',
        name: 'テストリスト',
        tasks: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const task1: Task = {
        id: 'task1',
        text: 'タスク1',
        completed: false,
        taskListId: 'list1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const task2: Task = {
        id: 'task2',
        text: 'タスク2',
        completed: true,
        taskListId: 'list1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      store.addTaskList(taskList);
      store.addTask('list1', task1);
      store.addTask('list1', task2);
      
      const state = store.getState();
      expect(selectors.getTasks(state, 'list1')).toEqual([task1, task2]);
    });

    it('特定のタスクを取得できる', () => {
      const taskList: TaskList = {
        id: 'list1',
        name: 'テストリスト',
        tasks: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const task: Task = {
        id: 'task1',
        text: 'テストタスク',
        completed: false,
        taskListId: 'list1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      store.addTaskList(taskList);
      store.addTask('list1', task);
      
      const state = store.getState();
      expect(selectors.getTask(state, 'list1', 'task1')).toEqual(task);
    });

    it('存在しないタスクはnullを返す', () => {
      const taskList: TaskList = {
        id: 'list1',
        name: 'テストリスト',
        tasks: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      store.addTaskList(taskList);
      
      const state = store.getState();
      expect(selectors.getTask(state, 'list1', 'nonexistent')).toBeNull();
    });
  });

  describe('計算済みセレクター', () => {
    beforeEach(() => {
      const taskList: TaskList = {
        id: 'list1',
        name: 'テストリスト',
        tasks: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const task1: Task = {
        id: 'task1',
        text: '完了タスク1',
        completed: true,
        taskListId: 'list1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const task2: Task = {
        id: 'task2',
        text: '未完了タスク1',
        completed: false,
        taskListId: 'list1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const task3: Task = {
        id: 'task3',
        text: '完了タスク2',
        completed: true,
        date: '2024-01-01',
        taskListId: 'list1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const task4: Task = {
        id: 'task4',
        text: '未完了タスク2',
        completed: false,
        date: '2024-01-01',
        taskListId: 'list1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      store.addTaskList(taskList);
      store.addTask('list1', task1);
      store.addTask('list1', task2);
      store.addTask('list1', task3);
      store.addTask('list1', task4);
    });

    it('完了したタスクを取得できる', () => {
      const state = store.getState();
      const completedTasks = selectors.getCompletedTasks(state, 'list1');
      
      expect(completedTasks).toHaveLength(2);
      expect(completedTasks.every(task => task.completed)).toBe(true);
      expect(completedTasks.map(task => task.id)).toEqual(['task1', 'task3']);
    });

    it('未完了のタスクを取得できる', () => {
      const state = store.getState();
      const incompleteTasks = selectors.getIncompleteTasks(state, 'list1');
      
      expect(incompleteTasks).toHaveLength(2);
      expect(incompleteTasks.every(task => !task.completed)).toBe(true);
      expect(incompleteTasks.map(task => task.id)).toEqual(['task2', 'task4']);
    });

    it('特定の日付のタスクを取得できる', () => {
      const state = store.getState();
      const dateFilteredTasks = selectors.getTasksByDate(state, 'list1', '2024-01-01');
      
      expect(dateFilteredTasks).toHaveLength(2);
      expect(dateFilteredTasks.every(task => task.date === '2024-01-01')).toBe(true);
      expect(dateFilteredTasks.map(task => task.id)).toEqual(['task3', 'task4']);
    });

    it('存在しない日付では空配列を返す', () => {
      const state = store.getState();
      const dateFilteredTasks = selectors.getTasksByDate(state, 'list1', '2024-12-31');
      
      expect(dateFilteredTasks).toEqual([]);
    });
  });

  describe('同期状態セレクター', () => {
    beforeEach(() => {
      store.setSyncStatus('list1', 'syncing');
      store.setSyncStatus('list2', 'failed');
      store.setSyncStatus('list3', 'pending');
    });

    it('同期中のタスクリストIDを取得できる', () => {
      const state = store.getState();
      const syncingLists = selectors.getSyncingTaskLists(state);
      
      expect(syncingLists).toEqual(['list1']);
    });

    it('同期失敗のタスクリストIDを取得できる', () => {
      const state = store.getState();
      const failedLists = selectors.getFailedTaskLists(state);
      
      expect(failedLists).toEqual(['list2']);
    });

    it('特定のタスクリストが同期中かどうかを確認できる', () => {
      const state = store.getState();
      
      expect(selectors.isTaskListSyncing(state, 'list1')).toBe(true);
      expect(selectors.isTaskListSyncing(state, 'list2')).toBe(false);
      expect(selectors.isTaskListSyncing(state, 'nonexistent')).toBe(false);
    });

    it('最終同期時刻を取得できる', () => {
      // 同期をクリアして最終同期時刻を設定
      store.clearSyncStatus('list1');
      
      const state = store.getState();
      const lastSync = selectors.getLastSyncTime(state, 'list1');
      
      expect(lastSync).toBeDefined();
      expect(typeof lastSync).toBe('string');
    });

    it('未同期のタスクリストは最終同期時刻がnull', () => {
      const state = store.getState();
      const lastSync = selectors.getLastSyncTime(state, 'list2');
      
      expect(lastSync).toBeNull();
    });
  });

  describe('エラーセレクター', () => {
    beforeEach(() => {
      const error1: AppError = {
        type: 'network',
        code: 'NETWORK_ERROR',
        message: 'ネットワークエラー'
      };
      
      const error2: AppError = {
        type: 'validation',
        code: 'VALIDATION_ERROR',
        message: 'バリデーションエラー'
      };
      
      const error3: AppError = {
        type: 'network',
        code: 'TIMEOUT_ERROR',
        message: 'タイムアウトエラー'
      };
      
      store.addError(error1);
      store.addError(error2);
      store.addError(error3);
    });

    it('全てのエラーを取得できる', () => {
      const state = store.getState();
      const errors = selectors.getErrors(state);
      
      expect(errors).toHaveLength(3);
    });

    it('特定のタイプのエラーを取得できる', () => {
      const state = store.getState();
      const networkErrors = selectors.getErrorsByType(state, 'network');
      
      expect(networkErrors).toHaveLength(2);
      expect(networkErrors.every(error => error.type === 'network')).toBe(true);
    });

    it('エラーの有無を確認できる', () => {
      const state = store.getState();
      expect(selectors.hasErrors(state)).toBe(true);
      
      store.clearErrors();
      const newState = store.getState();
      expect(selectors.hasErrors(newState)).toBe(false);
    });
  });

  describe('認証セレクター', () => {
    it('ユーザーがログインしている場合はtrueを返す', () => {
      const user: User = {
        id: 'user1',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      store.updateUser(user);
      
      const state = store.getState();
      expect(selectors.isAuthenticated(state)).toBe(true);
    });

    it('ユーザーがログアウトしている場合はfalseを返す', () => {
      const state = store.getState();
      expect(selectors.isAuthenticated(state)).toBe(false);
    });

    // 認証中状態のテストは将来的にStoreStateに追加された場合に実装
  });
});