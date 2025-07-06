import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestStore } from './setup';
import { Store } from '../index';
import { createSelectors } from '../selectors';
import { User, AppSettings, UserSettings, TaskList, Task, AppError } from '../types';
import * as Y from 'yjs';

describe('Store 統合テスト', () => {
  let store: Store;
  let selectors: ReturnType<typeof createSelectors>;

  beforeEach(() => {
    store = createTestStore();
    selectors = createSelectors(store);
  });

  describe('完全なユーザーセッションシナリオ', () => {
    it('ログインから作業完了までの一連の流れ', () => {
      // 1. ユーザーログイン
      const user: User = {
        id: 'user1',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const app: AppSettings = {
        id: 'app1',
        taskInsertPosition: 'top',
        autoSort: false
      };

      const settings: UserSettings = {
        theme: 'dark',
        language: 'ja'
      };

      store.updateUser(user);
      store.updateApp(app);
      store.updateSettings(settings);

      // 認証状態確認
      let state = store.getState();
      expect(selectors.isAuthenticated(state)).toBe(true);
      expect(selectors.getUser(state)).toEqual(user);

      // 2. タスクリスト作成
      const taskList: TaskList = {
        id: 'work-list',
        name: '仕事リスト',
        background: '#FF6B6B',
        tasks: [],
        createdAt: '2024-01-01T09:00:00Z',
        updatedAt: '2024-01-01T09:00:00Z'
      };

      store.addTaskList(taskList);

      // 3. Y.jsドキュメント設定
      const yjsDoc = new Y.Doc();
      const taskOrder = yjsDoc.getArray('taskOrder');
      store.setYjsDoc('work-list', yjsDoc);

      // 4. 複数タスクの追加
      const tasks: Task[] = [
        {
          id: 'task1',
          text: 'プロジェクト企画書作成',
          completed: false,
          date: '2024-01-01',
          taskListId: 'work-list',
          createdAt: '2024-01-01T09:00:00Z',
          updatedAt: '2024-01-01T09:00:00Z'
        },
        {
          id: 'task2',
          text: 'チームミーティング',
          completed: false,
          date: '2024-01-01',
          taskListId: 'work-list',
          createdAt: '2024-01-01T09:30:00Z',
          updatedAt: '2024-01-01T09:30:00Z'
        },
        {
          id: 'task3',
          text: 'コードレビュー',
          completed: false,
          taskListId: 'work-list',
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z'
        }
      ];

      tasks.forEach(task => {
        store.addTask('work-list', task);
        taskOrder.push([task.id]);
      });

      // 5. タスク進捗管理
      // 最初のタスクを完了
      store.updateTask('work-list', 'task1', { completed: true });

      state = store.getState();
      const completedTasks = selectors.getCompletedTasks(state, 'work-list');
      const incompleteTasks = selectors.getIncompleteTasks(state, 'work-list');

      expect(completedTasks).toHaveLength(1);
      expect(incompleteTasks).toHaveLength(2);
      expect(completedTasks[0].id).toBe('task1');

      // 6. 同期状態管理
      store.setSyncStatus('work-list', 'syncing');
      expect(selectors.isTaskListSyncing(state, 'work-list')).toBe(false); // 古い状態

      state = store.getState();
      expect(selectors.isTaskListSyncing(state, 'work-list')).toBe(true);

      // 同期完了
      store.clearSyncStatus('work-list');

      state = store.getState();
      expect(selectors.isTaskListSyncing(state, 'work-list')).toBe(false);
      expect(selectors.getLastSyncTime(state, 'work-list')).toBeTruthy();

      // 7. 最終検証
      state = store.getState();
      expect(selectors.getTaskLists(state)).toHaveLength(1);
      expect(selectors.getTasks(state, 'work-list')).toHaveLength(3);
      expect(store.getYjsDoc('work-list')).toBe(yjsDoc);
    });
  });

  describe('エラー発生時のリカバリーシナリオ', () => {
    it('同期エラーからの回復処理', () => {
      // 初期設定
      const taskList: TaskList = {
        id: 'list1',
        name: 'テストリスト',
        tasks: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      store.addTaskList(taskList);

      // 1. 同期エラー発生
      const syncError: AppError = {
        type: 'network',
        code: 'SYNC_TIMEOUT',
        message: '同期がタイムアウトしました'
      };

      store.setSyncStatus('list1', 'failed', syncError);

      let state = store.getState();
      expect(selectors.getFailedTaskLists(state)).toContain('list1');
      expect(selectors.hasErrors(state)).toBe(true);
      expect(selectors.getErrorsByType(state, 'network')).toHaveLength(1);

      // 2. エラーを解決して再同期
      store.removeError('SYNC_TIMEOUT');
      store.setSyncStatus('list1', 'syncing');

      state = store.getState();
      expect(selectors.hasErrors(state)).toBe(false);
      expect(selectors.isTaskListSyncing(state, 'list1')).toBe(true);

      // 3. 同期成功
      store.clearSyncStatus('list1');

      state = store.getState();
      expect(selectors.getFailedTaskLists(state)).not.toContain('list1');
      expect(selectors.isTaskListSyncing(state, 'list1')).toBe(false);
    });
  });

  describe('複数デバイス同時編集シナリオ', () => {
    it('Y.jsを使った協調編集の基本動作', () => {
      // デバイス1のセットアップ
      const device1Store = createTestStore();
      const device1Doc = new Y.Doc();
      const device1TaskOrder = device1Doc.getArray('taskOrder');
      
      device1Store.setYjsDoc('shared-list', device1Doc);

      // デバイス2のセットアップ
      const device2Store = createTestStore();
      const device2Doc = new Y.Doc();
      const device2TaskOrder = device2Doc.getArray('taskOrder');
      
      device2Store.setYjsDoc('shared-list', device2Doc);

      // 1. デバイス1でタスク追加
      device1TaskOrder.push(['task1', 'task2']);

      // 2. デバイス2でタスク追加（異なる位置）
      device2TaskOrder.push(['task3']);

      // 3. 各デバイスでの状態確認
      expect(device1TaskOrder.toArray()).toEqual(['task1', 'task2']);
      expect(device2TaskOrder.toArray()).toEqual(['task3']);

      // 4. 同期シミュレーション（実際の実装では自動）
      const device1Update = Y.encodeStateAsUpdate(device1Doc);
      const device2Update = Y.encodeStateAsUpdate(device2Doc);

      Y.applyUpdate(device2Doc, device1Update);
      Y.applyUpdate(device1Doc, device2Update);

      // 5. 統合された状態確認
      expect(device1TaskOrder.toArray()).toEqual(device2TaskOrder.toArray());
    });
  });

  describe('リスナーとセレクターの統合', () => {
    it('状態変更がリスナーを通じて正しく通知される', () => {
      const listener = vi.fn();
      store.subscribe(listener);

      // 1. ユーザー設定
      const user: User = {
        id: 'user1',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      store.updateUser(user);
      expect(listener).toHaveBeenCalledTimes(1);

      // 2. タスクリスト追加
      const taskList: TaskList = {
        id: 'list1',
        name: 'リスト1',
        tasks: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      store.addTaskList(taskList);
      expect(listener).toHaveBeenCalledTimes(2);

      // 3. タスク追加
      const task: Task = {
        id: 'task1',
        text: 'タスク1',
        completed: false,
        taskListId: 'list1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      store.addTask('list1', task);
      expect(listener).toHaveBeenCalledTimes(3);

      // 4. 最新状態でのセレクター検証
      const [latestState] = listener.mock.calls[listener.mock.calls.length - 1];
      
      expect(selectors.isAuthenticated(latestState)).toBe(true);
      expect(selectors.getTaskLists(latestState)).toHaveLength(1);
      expect(selectors.getTasks(latestState, 'list1')).toHaveLength(1);
    });
  });

  describe('パフォーマンス統合テスト', () => {
    it('大量データでの複合操作性能', () => {
      const startTime = Date.now();

      // 1. 大量のタスクリスト作成
      for (let i = 0; i < 50; i++) {
        const taskList: TaskList = {
          id: `list${i}`,
          name: `リスト${i}`,
          tasks: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        };
        store.addTaskList(taskList);

        // 2. 各リストにタスクを追加
        for (let j = 0; j < 20; j++) {
          const task: Task = {
            id: `task${i}-${j}`,
            text: `タスク${i}-${j}`,
            completed: j % 2 === 0, // 半分を完了状態に
            taskListId: `list${i}`,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          };
          store.addTask(`list${i}`, task);
        }
      }

      // 3. セレクターでの大量データ検索
      const state = store.getState();
      const taskLists = selectors.getTaskLists(state);
      
      let totalCompletedTasks = 0;
      taskLists.forEach(taskList => {
        const completedTasks = selectors.getCompletedTasks(state, taskList.id);
        totalCompletedTasks += completedTasks.length;
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 4. 結果検証
      expect(taskLists).toHaveLength(50);
      expect(totalCompletedTasks).toBe(50 * 10); // 各リスト10個の完了タスク
      
      // パフォーマンステスト（2秒以下で完了することを期待）
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('エッジケースの統合処理', () => {
    it('存在しないリソースへの操作が安全に処理される', () => {
      // 1. 存在しないタスクリストへのタスク追加
      const task: Task = {
        id: 'task1',
        text: 'テストタスク',
        completed: false,
        taskListId: 'nonexistent',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      expect(() => store.addTask('nonexistent', task)).not.toThrow();

      // 2. 存在しないタスクの更新
      expect(() => store.updateTask('nonexistent', 'task1', { completed: true })).not.toThrow();

      // 3. 存在しないタスクの削除
      expect(() => store.removeTask('nonexistent', 'task1')).not.toThrow();

      // 4. セレクターでの存在しないリソース検索
      const state = store.getState();
      expect(selectors.getTaskList(state, 'nonexistent')).toBeNull();
      expect(selectors.getTasks(state, 'nonexistent')).toEqual([]);
      expect(selectors.getTask(state, 'nonexistent', 'task1')).toBeNull();

      // 5. 状態が変更されていないことを確認
      expect(state.taskLists).toHaveLength(0);
    });
  });
});