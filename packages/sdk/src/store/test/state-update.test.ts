import { describe, it, expect, beforeEach } from 'vitest';
import { createTestStore } from './setup';
import { Store } from '../index';
import { User, AppSettings, UserSettings, TaskList, Task } from '../../types';

describe('Store State更新機能', () => {
  let store: Store;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('ユーザー情報の更新', () => {
    it('ユーザー情報を更新できる', () => {
      const user: User = {
        id: 'user1',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      store.updateUser(user);

      const state = store.getState();
      expect(state.user).toEqual(user);
    });

    it('ユーザー情報をnullに設定できる', () => {
      const user: User = {
        id: 'user1',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      store.updateUser(user);
      store.updateUser(null);

      const state = store.getState();
      expect(state.user).toBeNull();
    });
  });

  describe('App設定の更新', () => {
    it('App設定を更新できる', () => {
      const app: AppSettings = {
        id: 'app1',
        taskInsertPosition: 'top',
        autoSort: true
      };

      store.updateApp(app);

      const state = store.getState();
      expect(state.app).toEqual(app);
    });
  });

  describe('ユーザー設定の更新', () => {
    it('ユーザー設定を更新できる', () => {
      const settings: UserSettings = {
        theme: 'dark',
        language: 'en'
      };

      store.updateSettings(settings);

      const state = store.getState();
      expect(state.settings).toEqual(settings);
    });
  });

  describe('TaskList操作', () => {
    it('TaskListを追加できる', () => {
      const taskList: TaskList = {
        id: 'list1',
        name: 'テストリスト',
        background: '#FF0000',
        tasks: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      store.addTaskList(taskList);

      const state = store.getState();
      expect(state.taskLists).toHaveLength(1);
      expect(state.taskLists[0]).toEqual(taskList);
    });

    it('複数のTaskListを追加できる', () => {
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
      expect(state.taskLists).toHaveLength(2);
      expect(state.taskLists[0]).toEqual(taskList1);
      expect(state.taskLists[1]).toEqual(taskList2);
    });

    it('TaskListを更新できる', () => {
      const taskList: TaskList = {
        id: 'list1',
        name: 'テストリスト',
        tasks: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      store.addTaskList(taskList);
      store.updateTaskList('list1', { name: '更新されたリスト', background: '#00FF00' });

      const state = store.getState();
      expect(state.taskLists[0].name).toBe('更新されたリスト');
      expect(state.taskLists[0].background).toBe('#00FF00');
      expect(state.taskLists[0].id).toBe('list1'); // 他のプロパティは変更されない
    });

    it('TaskListを削除できる', () => {
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
      store.removeTaskList('list1');

      const state = store.getState();
      expect(state.taskLists).toHaveLength(1);
      expect(state.taskLists[0].id).toBe('list2');
    });
  });

  describe('Task操作', () => {
    let taskList: TaskList;

    beforeEach(() => {
      taskList = {
        id: 'list1',
        name: 'テストリスト',
        tasks: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      store.addTaskList(taskList);
    });

    it('Taskを追加できる', () => {
      const task: Task = {
        id: 'task1',
        text: 'テストタスク',
        completed: false,
        taskListId: 'list1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      store.addTask('list1', task);

      const state = store.getState();
      expect(state.taskLists[0].tasks).toHaveLength(1);
      expect(state.taskLists[0].tasks[0]).toEqual(task);
    });

    it('Taskを更新できる', () => {
      const task: Task = {
        id: 'task1',
        text: 'テストタスク',
        completed: false,
        taskListId: 'list1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      store.addTask('list1', task);
      store.updateTask('list1', 'task1', { completed: true, text: '更新されたタスク' });

      const state = store.getState();
      expect(state.taskLists[0].tasks[0].completed).toBe(true);
      expect(state.taskLists[0].tasks[0].text).toBe('更新されたタスク');
      expect(state.taskLists[0].tasks[0].id).toBe('task1');
    });

    it('Taskを削除できる', () => {
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
        completed: false,
        taskListId: 'list1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      store.addTask('list1', task1);
      store.addTask('list1', task2);
      store.removeTask('list1', 'task1');

      const state = store.getState();
      expect(state.taskLists[0].tasks).toHaveLength(1);
      expect(state.taskLists[0].tasks[0].id).toBe('task2');
    });

    it('Taskを移動できる', () => {
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
        completed: false,
        taskListId: 'list1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const task3: Task = {
        id: 'task3',
        text: 'タスク3',
        completed: false,
        taskListId: 'list1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      store.addTask('list1', task1);
      store.addTask('list1', task2);
      store.addTask('list1', task3);

      // task1を先頭から最後に移動
      store.moveTask('list1', 'task1', 0, 2);

      const state = store.getState();
      expect(state.taskLists[0].tasks[0].id).toBe('task2');
      expect(state.taskLists[0].tasks[1].id).toBe('task3');
      expect(state.taskLists[0].tasks[2].id).toBe('task1');
    });
  });

  describe('同期状態管理', () => {
    it('同期状態を設定できる', () => {
      store.setSyncStatus('list1', 'syncing');

      const state = store.getState();
      expect(state.syncStatus.syncing).toContain('list1');
      expect(state.syncStatus.pending).not.toContain('list1');
      expect(state.syncStatus.failed).not.toContain('list1');
    });

    it('同期状態を変更できる', () => {
      store.setSyncStatus('list1', 'pending');
      store.setSyncStatus('list1', 'syncing');
      store.setSyncStatus('list1', 'failed');

      const state = store.getState();
      expect(state.syncStatus.failed).toContain('list1');
      expect(state.syncStatus.pending).not.toContain('list1');
      expect(state.syncStatus.syncing).not.toContain('list1');
    });

    it('同期状態をクリアできる', () => {
      store.setSyncStatus('list1', 'syncing');
      store.clearSyncStatus('list1');

      const state = store.getState();
      expect(state.syncStatus.syncing).not.toContain('list1');
      expect(state.syncStatus.lastSync['list1']).toBeDefined();
    });
  });
});