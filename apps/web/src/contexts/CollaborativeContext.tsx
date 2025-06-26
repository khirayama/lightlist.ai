import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { CollaborativeTaskList, type CollaborativeTask, type CollaborativeMetadata } from '@lightlist/sdk';
import { sdkClient } from '../lib/sdk-client';
import { useAuth } from './AuthContext';

interface CollaborativeContextType {
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  error: string | null;
  tasks: CollaborativeTask[];
  metadata: CollaborativeMetadata | null;
  addTask: (content: string, insertPosition?: 'top' | 'bottom') => string | null;
  updateTask: (taskId: string, updates: Partial<CollaborativeTask>) => boolean;
  deleteTask: (taskId: string) => boolean;
  moveTask: (taskId: string, newIndex: number) => boolean;
  updateMetadata: (name?: string, color?: string) => void;
  initializeCollaborativeEditing: (taskListId: string) => Promise<void>;
  destroy: () => void;
}

const CollaborativeContext = createContext<CollaborativeContextType | null>(null);

export const useCollaborative = () => {
  const context = useContext(CollaborativeContext);
  if (!context) {
    throw new Error('useCollaborative must be used within a CollaborativeProvider');
  }
  return context;
};

interface CollaborativeProviderProps {
  children: React.ReactNode;
}

export const CollaborativeProvider: React.FC<CollaborativeProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<CollaborativeTask[]>([]);
  const [metadata, setMetadata] = useState<CollaborativeMetadata | null>(null);
  
  const collaborativeTaskListRef = useRef<CollaborativeTaskList | null>(null);
  const unsubscribeTasksRef = useRef<(() => void) | null>(null);
  const unsubscribeMetadataRef = useRef<(() => void) | null>(null);

  const initializeCollaborativeEditing = useCallback(async (taskListId: string) => {
    if (!isAuthenticated) {
      setError('認証が必要です');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 既存のインスタンスがあれば破棄
      destroy();

      // 新しい共同編集インスタンスを作成
      const collaborativeTaskList = new CollaborativeTaskList(sdkClient.collaborative, taskListId);
      collaborativeTaskListRef.current = collaborativeTaskList;

      // 初期化
      await collaborativeTaskList.initialize();

      // タスク変更イベントを監視
      const unsubscribeTasks = collaborativeTaskList.onTasksChange((newTasks) => {
        setTasks(newTasks);
      });
      unsubscribeTasksRef.current = unsubscribeTasks;

      // メタデータ変更イベントを監視
      const unsubscribeMetadata = collaborativeTaskList.onMetadataChange((newMetadata) => {
        setMetadata(newMetadata);
      });
      unsubscribeMetadataRef.current = unsubscribeMetadata;

      // 初期データを設定
      setTasks(collaborativeTaskList.getTasks());
      setMetadata(collaborativeTaskList.getMetadata());

      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Failed to initialize collaborative editing:', err);
      setError(err instanceof Error ? err.message : '共同編集の初期化に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const addTask = useCallback((content: string, insertPosition: 'top' | 'bottom' = 'top'): string | null => {
    if (!collaborativeTaskListRef.current) {
      setError('共同編集が初期化されていません');
      return null;
    }

    try {
      const taskId = collaborativeTaskListRef.current.addTask(content, insertPosition);
      setError(null);
      return taskId;
    } catch (err) {
      console.error('Failed to add task:', err);
      setError(err instanceof Error ? err.message : 'タスクの追加に失敗しました');
      return null;
    }
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<CollaborativeTask>): boolean => {
    if (!collaborativeTaskListRef.current) {
      setError('共同編集が初期化されていません');
      return false;
    }

    try {
      const success = collaborativeTaskListRef.current.updateTask(taskId, updates);
      if (success) {
        setError(null);
      }
      return success;
    } catch (err) {
      console.error('Failed to update task:', err);
      setError(err instanceof Error ? err.message : 'タスクの更新に失敗しました');
      return false;
    }
  }, []);

  const deleteTask = useCallback((taskId: string): boolean => {
    if (!collaborativeTaskListRef.current) {
      setError('共同編集が初期化されていません');
      return false;
    }

    try {
      const success = collaborativeTaskListRef.current.deleteTask(taskId);
      if (success) {
        setError(null);
      }
      return success;
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError(err instanceof Error ? err.message : 'タスクの削除に失敗しました');
      return false;
    }
  }, []);

  const moveTask = useCallback((taskId: string, newIndex: number): boolean => {
    if (!collaborativeTaskListRef.current) {
      setError('共同編集が初期化されていません');
      return false;
    }

    try {
      const success = collaborativeTaskListRef.current.moveTask(taskId, newIndex);
      if (success) {
        setError(null);
      }
      return success;
    } catch (err) {
      console.error('Failed to move task:', err);
      setError(err instanceof Error ? err.message : 'タスクの移動に失敗しました');
      return false;
    }
  }, []);

  const updateMetadata = useCallback((name?: string, color?: string): void => {
    if (!collaborativeTaskListRef.current) {
      setError('共同編集が初期化されていません');
      return;
    }

    try {
      collaborativeTaskListRef.current.updateMetadata(name, color);
      setError(null);
    } catch (err) {
      console.error('Failed to update metadata:', err);
      setError(err instanceof Error ? err.message : 'メタデータの更新に失敗しました');
    }
  }, []);

  const destroy = useCallback(() => {
    // イベントリスナーの解除
    if (unsubscribeTasksRef.current) {
      unsubscribeTasksRef.current();
      unsubscribeTasksRef.current = null;
    }
    if (unsubscribeMetadataRef.current) {
      unsubscribeMetadataRef.current();
      unsubscribeMetadataRef.current = null;
    }

    // CollaborativeTaskListインスタンスの破棄
    if (collaborativeTaskListRef.current) {
      collaborativeTaskListRef.current.destroy();
      collaborativeTaskListRef.current = null;
    }

    // 状態をリセット
    setTasks([]);
    setMetadata(null);
    setError(null);
  }, []);

  // コンポーネントのアンマウント時にリソースを破棄
  useEffect(() => {
    return destroy;
  }, [destroy]);

  // 認証状態が変更されたときに破棄
  useEffect(() => {
    if (!isAuthenticated) {
      destroy();
    }
  }, [isAuthenticated, destroy]);

  const value: CollaborativeContextType = {
    isLoading,
    isSyncing,
    lastSyncTime,
    error,
    tasks,
    metadata,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    updateMetadata,
    initializeCollaborativeEditing,
    destroy,
  };

  return (
    <CollaborativeContext.Provider value={value}>
      {children}
    </CollaborativeContext.Provider>
  );
};