import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestStore } from './setup';
import { Store, StoreListener } from '../index';
import { StoreState, User, TaskList, Task } from '../../types';

describe('Store 購読機能', () => {
  let store: Store;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('基本的な購読機能', () => {
    it('リスナーを購読できる', () => {
      const listener = vi.fn();
      
      const unsubscribe = store.subscribe(listener);
      
      expect(unsubscribe).toBeTypeOf('function');
      expect(listener).not.toHaveBeenCalled();
    });

    it('購読解除ができる', () => {
      const listener = vi.fn();
      
      const unsubscribe = store.subscribe(listener);
      unsubscribe();
      
      // 状態を更新してもリスナーが呼ばれない
      store.updateUser({
        id: 'user1',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      });
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('複数のリスナーを購読できる', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      store.subscribe(listener1);
      store.subscribe(listener2);
      
      store.updateUser({
        id: 'user1',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      });
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('状態変更の通知', () => {
    it('ユーザー情報更新時にリスナーが呼ばれる', () => {
      const listener = vi.fn();
      store.subscribe(listener);
      
      const user: User = {
        id: 'user1',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      store.updateUser(user);
      
      expect(listener).toHaveBeenCalledTimes(1);
      const [newState, prevState] = listener.mock.calls[0];
      expect(newState.user).toEqual(user);
      expect(prevState.user).toBeNull();
    });

    it('TaskList追加時にリスナーが呼ばれる', () => {
      const listener = vi.fn();
      store.subscribe(listener);
      
      const taskList: TaskList = {
        id: 'list1',
        name: 'テストリスト',
        tasks: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      store.addTaskList(taskList);
      
      expect(listener).toHaveBeenCalledTimes(1);
      const [newState, prevState] = listener.mock.calls[0];
      expect(newState.taskLists).toHaveLength(1);
      expect(prevState.taskLists).toHaveLength(0);
    });

    it('Task追加時にリスナーが呼ばれる', () => {
      const listener = vi.fn();
      
      // TaskListを先に追加
      const taskList: TaskList = {
        id: 'list1',
        name: 'テストリスト',
        tasks: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      store.addTaskList(taskList);
      
      // リスナーを購読
      store.subscribe(listener);
      
      const task: Task = {
        id: 'task1',
        text: 'テストタスク',
        completed: false,
        taskListId: 'list1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      store.addTask('list1', task);
      
      expect(listener).toHaveBeenCalledTimes(1);
      const [newState, prevState] = listener.mock.calls[0];
      expect(newState.taskLists[0].tasks).toHaveLength(1);
      expect(prevState.taskLists[0].tasks).toHaveLength(0);
    });
  });

  describe('購読時の状態確認', () => {
    it('現在の状態と前の状態が正しく渡される', () => {
      const listener = vi.fn<[StoreState, StoreState], void>();
      store.subscribe(listener);
      
      // 第1回目の変更
      store.updateUser({
        id: 'user1',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      });
      
      expect(listener).toHaveBeenCalledTimes(1);
      const [newState1, prevState1] = listener.mock.calls[0];
      expect(newState1.user?.id).toBe('user1');
      expect(prevState1.user).toBeNull();
      
      // 第2回目の変更
      store.updateUser({
        id: 'user2',
        email: 'test2@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      });
      
      expect(listener).toHaveBeenCalledTimes(2);
      const [newState2, prevState2] = listener.mock.calls[1];
      expect(newState2.user?.id).toBe('user2');
      expect(prevState2.user?.id).toBe('user1');
    });

    it('状態が変更されない場合はリスナーが呼ばれない（エラーハンドリングケース）', () => {
      const listener = vi.fn();
      store.subscribe(listener);
      
      // 存在しないTaskListを更新しようとする
      store.updateTaskList('nonexistent', { name: 'Updated' });
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('パフォーマンスの考慮', () => {
    it('同じリスナーが重複して登録されない', () => {
      const listener = vi.fn();
      
      store.subscribe(listener);
      store.subscribe(listener); // 同じリスナーを再度購読
      
      store.updateUser({
        id: 'user1',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      });
      
      // Setを使用しているため、重複は自動的に削除される
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('大量のリスナーを効率的に処理できる', () => {
      const listeners: Array<ReturnType<typeof vi.fn>> = [];
      
      // 100個のリスナーを登録
      for (let i = 0; i < 100; i++) {
        const listener = vi.fn();
        listeners.push(listener);
        store.subscribe(listener);
      }
      
      const startTime = Date.now();
      
      store.updateUser({
        id: 'user1',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 全てのリスナーが呼ばれる
      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalledTimes(1);
      });
      
      // パフォーマンステスト（100ms以下で完了することを期待）
      expect(duration).toBeLessThan(100);
    });
  });

  describe('エラーハンドリング', () => {
    it('リスナー内でエラーが発生しても他のリスナーに影響しない', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();
      
      store.subscribe(errorListener);
      store.subscribe(normalListener);
      
      // エラーが発生してもアプリケーションが停止しない
      expect(() => {
        store.updateUser({
          id: 'user1',
          email: 'test@example.com',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        });
      }).not.toThrow();
      
      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(normalListener).toHaveBeenCalledTimes(1);
    });
  });
});