import { Store, StoreConfig, StoreListener } from './index';
import { StoreState, AppSettings, UserSettings, TaskList, Task, User, AppError } from '../types';
import * as Y from 'yjs';

// デフォルトのストア状態
const createInitialState = (): StoreState => ({
  user: null,
  app: null,
  settings: null,
  taskLists: [],
  activeSessionIds: [],
  syncStatus: {
    pending: [],
    syncing: [],
    failed: [],
    lastSync: {}
  },
  errors: []
});

export class StoreImpl implements Store {
  private _state: StoreState;
  public readonly yjsDocs: Map<string, Y.Doc>;
  public readonly listeners: Set<StoreListener>;

  constructor(config: StoreConfig) {
    this._state = { ...createInitialState(), ...config.initialState };
    this.yjsDocs = new Map();
    this.listeners = new Set();
  }

  // 状態取得
  public get state(): StoreState {
    return this.deepClone(this._state);
  }

  public getState(): StoreState {
    return this.deepClone(this._state);
  }

  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as T;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as T;
    }
    
    if (typeof obj === 'object') {
      const cloned = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }
    
    return obj;
  }

  // 状態更新（基本実装）
  public setState(updater: (state: StoreState) => StoreState): void {
    const prevState = this._state;
    const newState = updater(prevState);
    
    // 状態が実際に変更された場合のみ通知
    if (newState !== prevState) {
      this._state = newState;
      this.notifyListeners(prevState);
    }
  }

  // 購読管理
  public subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(prevState: StoreState): void {
    this.listeners.forEach(listener => {
      try {
        listener(this._state, prevState);
      } catch (error) {
        console.error('Error in store listener:', error);
      }
    });
  }

  // Y.js統合
  public getYjsDoc(taskListId: string): Y.Doc | null {
    return this.yjsDocs.get(taskListId) || null;
  }

  public setYjsDoc(taskListId: string, doc: Y.Doc): void {
    this.yjsDocs.set(taskListId, doc);
  }

  public removeYjsDoc(taskListId: string): void {
    this.yjsDocs.delete(taskListId);
  }

  // 状態更新メソッド（基本実装）
  public updateUser(user: User | null): void {
    this.setState(state => ({ ...state, user }));
  }

  public updateApp(app: AppSettings | null): void {
    this.setState(state => ({ ...state, app }));
  }

  public updateSettings(settings: UserSettings | null): void {
    this.setState(state => ({ ...state, settings }));
  }

  public updateTaskLists(taskLists: TaskList[]): void {
    this.setState(state => ({ ...state, taskLists }));
  }

  public updateTaskList(taskListId: string, updates: Partial<TaskList>): void {
    this.setState(state => {
      const taskListExists = state.taskLists.some(taskList => taskList.id === taskListId);
      if (!taskListExists) {
        console.warn(`TaskList with id "${taskListId}" not found`);
        return state;
      }
      
      return {
        ...state,
        taskLists: state.taskLists.map(taskList =>
          taskList.id === taskListId ? { ...taskList, ...updates } : taskList
        )
      };
    });
  }

  public addTaskList(taskList: TaskList): void {
    this.setState(state => ({
      ...state,
      taskLists: [...state.taskLists, taskList]
    }));
  }

  public removeTaskList(taskListId: string): void {
    this.setState(state => ({
      ...state,
      taskLists: state.taskLists.filter(taskList => taskList.id !== taskListId)
    }));
  }

  // タスク操作（基本実装）
  public updateTask(taskListId: string, taskId: string, updates: Partial<Task>): void {
    this.setState(state => {
      const taskList = state.taskLists.find(tl => tl.id === taskListId);
      if (!taskList) {
        console.warn(`TaskList with id "${taskListId}" not found`);
        return state;
      }
      
      const taskExists = taskList.tasks.some(task => task.id === taskId);
      if (!taskExists) {
        console.warn(`Task with id "${taskId}" not found in TaskList "${taskListId}"`);
        return state;
      }
      
      return {
        ...state,
        taskLists: state.taskLists.map(taskList =>
          taskList.id === taskListId
            ? {
                ...taskList,
                tasks: taskList.tasks.map(task =>
                  task.id === taskId ? { ...task, ...updates } : task
                )
              }
            : taskList
        )
      };
    });
  }

  public addTask(taskListId: string, task: Task): void {
    this.setState(state => {
      const taskListExists = state.taskLists.some(tl => tl.id === taskListId);
      if (!taskListExists) {
        console.warn(`TaskList with id "${taskListId}" not found`);
        return state;
      }
      
      return {
        ...state,
        taskLists: state.taskLists.map(taskList =>
          taskList.id === taskListId
            ? { ...taskList, tasks: [...taskList.tasks, task] }
            : taskList
        )
      };
    });
  }

  public removeTask(taskListId: string, taskId: string): void {
    this.setState(state => {
      const taskList = state.taskLists.find(tl => tl.id === taskListId);
      if (!taskList) {
        console.warn(`TaskList with id "${taskListId}" not found`);
        return state;
      }
      
      const taskExists = taskList.tasks.some(task => task.id === taskId);
      if (!taskExists) {
        console.warn(`Task with id "${taskId}" not found in TaskList "${taskListId}"`);
        return state;
      }
      
      return {
        ...state,
        taskLists: state.taskLists.map(taskList =>
          taskList.id === taskListId
            ? { ...taskList, tasks: taskList.tasks.filter(task => task.id !== taskId) }
            : taskList
        )
      };
    });
  }

  public moveTask(taskListId: string, taskId: string, fromIndex: number, toIndex: number): void {
    this.setState(state => {
      const taskList = state.taskLists.find(tl => tl.id === taskListId);
      if (!taskList) {
        console.warn(`TaskList with id "${taskListId}" not found`);
        return state;
      }
      
      const tasks = taskList.tasks;
      if (fromIndex < 0 || fromIndex >= tasks.length || toIndex < 0 || toIndex >= tasks.length) {
        console.warn(`Invalid index for moveTask: fromIndex=${fromIndex}, toIndex=${toIndex}, tasks.length=${tasks.length}`);
        return state;
      }
      
      if (tasks[fromIndex].id !== taskId) {
        console.warn(`Task at index ${fromIndex} does not match expected taskId "${taskId}"`);
        return state;
      }
      
      return {
        ...state,
        taskLists: state.taskLists.map(taskList =>
          taskList.id === taskListId
            ? {
                ...taskList,
                tasks: this.moveTaskInArray(taskList.tasks, fromIndex, toIndex)
              }
            : taskList
        )
      };
    });
  }

  private moveTaskInArray(tasks: Task[], fromIndex: number, toIndex: number): Task[] {
    const result = [...tasks];
    const [movedTask] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, movedTask);
    return result;
  }

  // 同期状態管理
  public setSyncStatus(taskListId: string, status: 'pending' | 'syncing' | 'failed', error?: AppError): void {
    this.setState(state => {
      const newSyncStatus = { ...state.syncStatus };
      
      // 他のステータスから削除
      newSyncStatus.pending = newSyncStatus.pending.filter(id => id !== taskListId);
      newSyncStatus.syncing = newSyncStatus.syncing.filter(id => id !== taskListId);
      newSyncStatus.failed = newSyncStatus.failed.filter(id => id !== taskListId);
      
      // 新しいステータスに追加
      newSyncStatus[status] = [...newSyncStatus[status], taskListId];
      
      return { ...state, syncStatus: newSyncStatus };
    });

    if (error) {
      this.addError(error);
    }
  }

  public clearSyncStatus(taskListId: string): void {
    this.setState(state => {
      const newSyncStatus = { ...state.syncStatus };
      newSyncStatus.pending = newSyncStatus.pending.filter(id => id !== taskListId);
      newSyncStatus.syncing = newSyncStatus.syncing.filter(id => id !== taskListId);
      newSyncStatus.failed = newSyncStatus.failed.filter(id => id !== taskListId);
      newSyncStatus.lastSync = { ...newSyncStatus.lastSync };
      newSyncStatus.lastSync[taskListId] = new Date().toISOString();
      
      return { ...state, syncStatus: newSyncStatus };
    });
  }

  public addActiveSession(sessionId: string): void {
    this.setState(state => ({
      ...state,
      activeSessionIds: [...state.activeSessionIds, sessionId]
    }));
  }

  public removeActiveSession(sessionId: string): void {
    this.setState(state => ({
      ...state,
      activeSessionIds: state.activeSessionIds.filter(id => id !== sessionId)
    }));
  }

  // エラー管理
  public addError(error: AppError): void {
    this.setState(state => ({
      ...state,
      errors: [...state.errors, error]
    }));
  }

  public removeError(errorId: string): void {
    this.setState(state => ({
      ...state,
      errors: state.errors.filter(error => error.code !== errorId)
    }));
  }

  public clearErrors(): void {
    this.setState(state => ({
      ...state,
      errors: []
    }));
  }
}

// ストア作成ファクトリー
export function createStore(config: StoreConfig): Store {
  return new StoreImpl(config);
}