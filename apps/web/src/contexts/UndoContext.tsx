import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { sdkClient } from '../lib/sdk-client';
import type { Task, TaskList } from '@lightlist/sdk';

interface UndoAction {
  id: string;
  type: 'delete_task' | 'delete_task_list' | 'delete_completed_tasks';
  timestamp: number;
  data: any;
  undo: () => Promise<void>;
  description: string;
}

interface UndoContextType {
  pendingUndo: UndoAction | null;
  addUndoAction: (action: Omit<UndoAction, 'id' | 'timestamp'>) => void;
  executeUndo: () => Promise<void>;
  dismissUndo: () => void;
}

const UndoContext = createContext<UndoContextType | null>(null);

export const useUndo = () => {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndo must be used within an UndoProvider');
  }
  return context;
};

interface UndoProviderProps {
  children: React.ReactNode;
}

const UNDO_TIMEOUT = 5000; // 5秒

export const UndoProvider: React.FC<UndoProviderProps> = ({ children }) => {
  const [pendingUndo, setPendingUndo] = useState<UndoAction | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Undoアクションを追加
  const addUndoAction = useCallback((action: Omit<UndoAction, 'id' | 'timestamp'>) => {
    // 既存のタイマーをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const undoAction: UndoAction = {
      ...action,
      id: `undo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
    };

    setPendingUndo(undoAction);

    // 5秒後に自動的にUndoオプションを削除
    timeoutRef.current = setTimeout(() => {
      setPendingUndo(null);
    }, UNDO_TIMEOUT);
  }, []);

  // Undoを実行
  const executeUndo = useCallback(async () => {
    if (!pendingUndo) return;

    try {
      await pendingUndo.undo();
      setPendingUndo(null);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } catch (error) {
      console.error('Failed to execute undo:', error);
      // エラーが発生してもUndoオプションを削除
      setPendingUndo(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [pendingUndo]);

  // Undoを拒否
  const dismissUndo = useCallback(() => {
    setPendingUndo(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const value: UndoContextType = {
    pendingUndo,
    addUndoAction,
    executeUndo,
    dismissUndo,
  };

  return (
    <UndoContext.Provider value={value}>
      {children}
    </UndoContext.Provider>
  );
};

// タスク削除のUndo機能を作成するヘルパー関数
export const createTaskDeleteUndo = (
  task: Task,
  taskListId: string,
  onRestore?: (task: Task) => void
): Omit<UndoAction, 'id' | 'timestamp'> => ({
  type: 'delete_task',
  data: { task, taskListId },
  description: `タスク「${task.text}」を削除しました`,
  undo: async () => {
    const response = await sdkClient.task.createTask(taskListId, {
      text: task.text,
      date: task.date,
    });
    if (response.data?.task && onRestore) {
      onRestore(response.data.task);
    }
  },
});

// タスクリスト削除のUndo機能を作成するヘルパー関数
export const createTaskListDeleteUndo = (
  taskList: TaskList,
  tasks: Task[],
  onRestore?: (taskList: TaskList) => void
): Omit<UndoAction, 'id' | 'timestamp'> => ({
  type: 'delete_task_list',
  data: { taskList, tasks },
  description: `タスクリスト「${taskList.name}」を削除しました`,
  undo: async () => {
    // タスクリストを再作成
    const taskListResponse = await sdkClient.taskList.createTaskList({
      name: taskList.name,
    });
    
    if (taskListResponse.data?.taskList) {
      const newTaskList = taskListResponse.data.taskList;
      
      // 背景色を設定
      if (taskList.background) {
        await sdkClient.taskList.updateTaskList(newTaskList.id, {
          background: taskList.background,
        });
      }
      
      // タスクを復元
      for (const task of tasks) {
        await sdkClient.task.createTask(newTaskList.id, {
          text: task.text,
          date: task.date,
        });
      }
      
      if (onRestore) {
        onRestore(newTaskList);
      }
    }
  },
});

// 完了タスク削除のUndo機能を作成するヘルパー関数
export const createCompletedTasksDeleteUndo = (
  completedTasks: Task[],
  taskListId: string,
  onRestore?: (tasks: Task[]) => void
): Omit<UndoAction, 'id' | 'timestamp'> => ({
  type: 'delete_completed_tasks',
  data: { completedTasks, taskListId },
  description: `${completedTasks.length}件の完了済みタスクを削除しました`,
  undo: async () => {
    const restoredTasks: Task[] = [];
    
    for (const task of completedTasks) {
      const response = await sdkClient.task.createTask(taskListId, {
        text: task.text,
        date: task.date,
      });
      
      if (response.data?.task) {
        // タスクを完了状態にする
        const updateResponse = await sdkClient.task.updateTask(response.data.task.id, {
          completed: true,
        });
        
        if (updateResponse.data?.task) {
          restoredTasks.push(updateResponse.data.task);
        }
      }
    }
    
    if (onRestore) {
      onRestore(restoredTasks);
    }
  },
});