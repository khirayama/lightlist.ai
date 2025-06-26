import * as Y from 'yjs';

export interface CollaborativeTask {
  id: string;
  content: string;
  completed: boolean;
  dueDate?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CollaborativeMetadata {
  name: string;
  color: string;
  lastModified: number;
}

export interface CollaborativeContextType {
  doc: Y.Doc | null;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  error: string | null;
}

export interface SyncResponse {
  update?: string;
  stateVector: string;
}

export interface FullStateResponse {
  state: string;
  stateVector: string;
}

export class CollaborativeTaskList {
  private doc: Y.Doc;
  private tasks: Y.Array<Y.Map<any>>;
  private metadata: Y.Map<any>;
  private apiClient: any;
  private taskListId: string;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isDestroyed = false;

  constructor(apiClient: any, taskListId: string) {
    this.doc = new Y.Doc();
    this.tasks = this.doc.getArray('tasks');
    this.metadata = this.doc.getMap('metadata');
    this.apiClient = apiClient;
    this.taskListId = taskListId;
  }

  /**
   * 共同編集機能を初期化
   */
  async initialize(): Promise<void> {
    try {
      // サーバーから完全な状態を取得
      const response = await this.apiClient.getFullState(this.taskListId);

      if (response.state) {
        // Base64デコードしてYjsドキュメントに適用
        const state = new Uint8Array(Buffer.from(response.state, 'base64'));
        Y.applyUpdate(this.doc, state);
      }

      // 定期同期を開始（5秒間隔）
      this.startSync();
    } catch (error) {
      console.error('Failed to initialize collaborative editing:', error);
      throw error;
    }
  }

  /**
   * 定期同期を開始
   */
  private startSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      if (!this.isDestroyed) {
        await this.sync();
      }
    }, 5000);
  }

  /**
   * サーバーと同期
   */
  async sync(): Promise<void> {
    try {
      const stateVector = Y.encodeStateVector(this.doc);
      const stateVectorBase64 = Buffer.from(stateVector).toString('base64');

      // ローカルの変更がある場合は更新を送信
      const update = Y.encodeStateAsUpdate(this.doc);
      const updateBase64 = update.length > 0 ? Buffer.from(update).toString('base64') : undefined;

      const response = await this.apiClient.sync(this.taskListId, {
        stateVector: stateVectorBase64,
        update: updateBase64,
      });

      // サーバーからの更新を適用
      if (response.update) {
        const serverUpdate = new Uint8Array(Buffer.from(response.update, 'base64'));
        Y.applyUpdate(this.doc, serverUpdate);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      // エラーは投げず、次回の同期で再試行
    }
  }

  /**
   * タスクを追加
   */
  addTask(content: string, insertPosition: 'top' | 'bottom' = 'top'): string {
    const taskId = this.generateTaskId();
    const task = new Y.Map();

    this.doc.transact(() => {
      task.set('id', taskId);
      task.set('content', content);
      task.set('completed', false);
      task.set('createdAt', Date.now());
      task.set('updatedAt', Date.now());

      if (insertPosition === 'top') {
        this.tasks.unshift([task]);
      } else {
        this.tasks.push([task]);
      }
    });

    return taskId;
  }

  /**
   * タスクを更新
   */
  updateTask(taskId: string, updates: Partial<CollaborativeTask>): boolean {
    const taskArray = this.tasks.toArray();
    const task = taskArray.find((t) => t.get('id') === taskId);

    if (task) {
      this.doc.transact(() => {
        Object.entries(updates).forEach(([key, value]) => {
          if (key !== 'id') {
            task.set(key, value);
          }
        });
        task.set('updatedAt', Date.now());
      });
      return true;
    }
    return false;
  }

  /**
   * タスクを削除
   */
  deleteTask(taskId: string): boolean {
    const taskArray = this.tasks.toArray();
    const index = taskArray.findIndex((t) => t.get('id') === taskId);

    if (index !== -1) {
      this.doc.transact(() => {
        this.tasks.delete(index, 1);
      });
      return true;
    }
    return false;
  }

  /**
   * タスクの順序を変更
   */
  moveTask(taskId: string, newIndex: number): boolean {
    const taskArray = this.tasks.toArray();
    const currentIndex = taskArray.findIndex((t) => t.get('id') === taskId);

    if (currentIndex !== -1 && currentIndex !== newIndex) {
      this.doc.transact(() => {
        const task = taskArray[currentIndex];
        this.tasks.delete(currentIndex, 1);
        this.tasks.insert(newIndex, [task]);
      });
      return true;
    }
    return false;
  }

  /**
   * タスクリストのメタデータを更新
   */
  updateMetadata(name?: string, color?: string): void {
    this.doc.transact(() => {
      if (name !== undefined) this.metadata.set('name', name);
      if (color !== undefined) this.metadata.set('color', color);
      this.metadata.set('lastModified', Date.now());
    });
  }

  /**
   * 全タスクを取得
   */
  getTasks(): CollaborativeTask[] {
    return this.tasks.toArray().map((task) => ({
      id: task.get('id'),
      content: task.get('content'),
      completed: task.get('completed'),
      dueDate: task.get('dueDate'),
      createdAt: task.get('createdAt'),
      updatedAt: task.get('updatedAt'),
    }));
  }

  /**
   * メタデータを取得
   */
  getMetadata(): CollaborativeMetadata {
    return {
      name: this.metadata.get('name') || '',
      color: this.metadata.get('color') || '',
      lastModified: this.metadata.get('lastModified') || Date.now(),
    };
  }

  /**
   * 変更イベントを監視
   */
  onTasksChange(callback: (tasks: CollaborativeTask[]) => void): () => void {
    const handler = () => {
      callback(this.getTasks());
    };
    this.tasks.observe(handler);
    return () => this.tasks.unobserve(handler);
  }

  /**
   * メタデータ変更イベントを監視
   */
  onMetadataChange(callback: (metadata: CollaborativeMetadata) => void): () => void {
    const handler = () => {
      callback(this.getMetadata());
    };
    this.metadata.observe(handler);
    return () => this.metadata.unobserve(handler);
  }

  /**
   * タスクIDを生成
   */
  private generateTaskId(): string {
    const clientId = this.doc.clientID;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${clientId}-${timestamp}-${random}`;
  }

  /**
   * リソースを破棄
   */
  destroy(): void {
    this.isDestroyed = true;
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.doc.destroy();
  }
}