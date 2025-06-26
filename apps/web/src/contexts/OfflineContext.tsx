import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { sdkClient } from '../lib/sdk-client';
import { useAuth } from './AuthContext';

interface OfflineOperation {
  id: string;
  type: 'create_task' | 'update_task' | 'delete_task' | 'create_task_list' | 'update_task_list' | 'delete_task_list';
  data: any;
  taskListId?: string;
  timestamp: number;
  retryCount: number;
}

interface OfflineContextType {
  isOnline: boolean;
  hasQueuedOperations: boolean;
  queueOperation: (operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>) => void;
  syncQueuedOperations: () => Promise<void>;
  clearQueue: () => void;
  getQueuedOperationsCount: () => number;
}

const OfflineContext = createContext<OfflineContextType | null>(null);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

interface OfflineProviderProps {
  children: React.ReactNode;
}

const STORAGE_KEY = 'lightlist_offline_queue';
const MAX_RETRY_COUNT = 3;

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [isOnline, setIsOnline] = useState(true); // SSR対応: 初期値を固定
  const [operationQueue, setOperationQueue] = useState<OfflineOperation[]>([]);
  const isSyncingRef = useRef(false);

  // ローカルストレージからキューを復元
  const loadQueueFromStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const queue = JSON.parse(stored) as OfflineOperation[];
        setOperationQueue(queue);
      }
    } catch (error) {
      console.error('Failed to load offline queue from storage:', error);
    }
  }, []);

  // キューをローカルストレージに保存
  const saveQueueToStorage = useCallback((queue: OfflineOperation[]) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to save offline queue to storage:', error);
    }
  }, []);

  // オンライン状態の監視
  useEffect(() => {
    // ブラウザ環境でのみ実行
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    // 初期値を設定
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 初期化時にキューを復元
  useEffect(() => {
    loadQueueFromStorage();
  }, [loadQueueFromStorage]);

  // キューが変更されたときにストレージに保存
  useEffect(() => {
    saveQueueToStorage(operationQueue);
  }, [operationQueue, saveQueueToStorage]);

  // オンライン復帰時に自動同期
  useEffect(() => {
    if (isOnline && isAuthenticated && operationQueue.length > 0 && !isSyncingRef.current) {
      syncQueuedOperations();
    }
  }, [isOnline, isAuthenticated, operationQueue.length]);

  // 操作をキューに追加
  const queueOperation = useCallback((operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>) => {
    const queuedOperation: OfflineOperation = {
      ...operation,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    setOperationQueue(prev => [...prev, queuedOperation]);

    // オンラインの場合は即座に同期を試行
    if (isOnline && isAuthenticated) {
      setTimeout(() => syncQueuedOperations(), 100);
    }
  }, [isOnline, isAuthenticated]);

  // 個別操作の実行
  const executeOperation = async (operation: OfflineOperation): Promise<boolean> => {
    try {
      switch (operation.type) {
        case 'create_task':
          if (operation.taskListId) {
            await sdkClient.task.createTask(operation.taskListId, operation.data);
          }
          break;
        case 'update_task':
          await sdkClient.task.updateTask(operation.data.id, operation.data.updates);
          break;
        case 'delete_task':
          await sdkClient.task.deleteTask(operation.data.id);
          break;
        case 'create_task_list':
          await sdkClient.taskList.createTaskList(operation.data);
          break;
        case 'update_task_list':
          await sdkClient.taskList.updateTaskList(operation.data.id, operation.data.updates);
          break;
        case 'delete_task_list':
          await sdkClient.taskList.deleteTaskList(operation.data.id);
          break;
        default:
          console.warn('Unknown operation type:', operation.type);
          return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to execute operation:', operation, error);
      return false;
    }
  };

  // キューの同期
  const syncQueuedOperations = useCallback(async (): Promise<void> => {
    if (!isOnline || !isAuthenticated || isSyncingRef.current || operationQueue.length === 0) {
      return;
    }

    isSyncingRef.current = true;

    try {
      const results = await Promise.allSettled(
        operationQueue.map(async (operation) => {
          const success = await executeOperation(operation);
          return { operation, success };
        })
      );

      const updatedQueue: OfflineOperation[] = [];

      results.forEach((result, index) => {
        const operation = operationQueue[index];
        
        if (result.status === 'fulfilled' && result.value.success) {
          // 成功した操作はキューから削除
          console.log('Operation executed successfully:', operation);
        } else {
          // 失敗した操作は再試行回数を増やしてキューに残す
          if (operation.retryCount < MAX_RETRY_COUNT) {
            updatedQueue.push({
              ...operation,
              retryCount: operation.retryCount + 1,
            });
          } else {
            console.error('Operation failed after max retries:', operation);
          }
        }
      });

      setOperationQueue(updatedQueue);
    } catch (error) {
      console.error('Failed to sync queued operations:', error);
    } finally {
      isSyncingRef.current = false;
    }
  }, [isOnline, isAuthenticated, operationQueue]);

  // キューをクリア
  const clearQueue = useCallback(() => {
    setOperationQueue([]);
  }, []);

  // キューの操作数を取得
  const getQueuedOperationsCount = useCallback(() => {
    return operationQueue.length;
  }, [operationQueue]);

  const value: OfflineContextType = {
    isOnline,
    hasQueuedOperations: operationQueue.length > 0,
    queueOperation,
    syncQueuedOperations,
    clearQueue,
    getQueuedOperationsCount,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};