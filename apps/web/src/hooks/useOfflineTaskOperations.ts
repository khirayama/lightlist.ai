import { useCallback } from 'react';
import { useOffline } from '../contexts/OfflineContext';
import { sdkClient } from '../lib/sdk-client';
import type { Task, TaskList } from '@lightlist/sdk';

export interface OfflineTaskOperations {
  createTask: (taskListId: string, task: { text: string; date?: string | null }) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  createTaskList: (taskList: { name: string }) => Promise<void>;
  updateTaskList: (taskListId: string, updates: Partial<TaskList>) => Promise<void>;
  deleteTaskList: (taskListId: string) => Promise<void>;
}

export const useOfflineTaskOperations = (): OfflineTaskOperations => {
  const { isOnline, queueOperation } = useOffline();

  const createTask = useCallback(async (taskListId: string, task: { text: string; date?: string | null }) => {
    if (isOnline) {
      try {
        await sdkClient.task.createTask(taskListId, task);
      } catch (error) {
        // オンラインでエラーが発生した場合、オフラインキューに追加
        queueOperation({
          type: 'create_task',
          taskListId,
          data: task,
        });
        throw error;
      }
    } else {
      // オフラインの場合、キューに追加
      queueOperation({
        type: 'create_task',
        taskListId,
        data: task,
      });
    }
  }, [isOnline, queueOperation]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    if (isOnline) {
      try {
        await sdkClient.task.updateTask(taskId, updates);
      } catch (error) {
        // オンラインでエラーが発生した場合、オフラインキューに追加
        queueOperation({
          type: 'update_task',
          data: { id: taskId, updates },
        });
        throw error;
      }
    } else {
      // オフラインの場合、キューに追加
      queueOperation({
        type: 'update_task',
        data: { id: taskId, updates },
      });
    }
  }, [isOnline, queueOperation]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (isOnline) {
      try {
        await sdkClient.task.deleteTask(taskId);
      } catch (error) {
        // オンラインでエラーが発生した場合、オフラインキューに追加
        queueOperation({
          type: 'delete_task',
          data: { id: taskId },
        });
        throw error;
      }
    } else {
      // オフラインの場合、キューに追加
      queueOperation({
        type: 'delete_task',
        data: { id: taskId },
      });
    }
  }, [isOnline, queueOperation]);

  const createTaskList = useCallback(async (taskList: { name: string }) => {
    if (isOnline) {
      try {
        await sdkClient.taskList.createTaskList(taskList);
      } catch (error) {
        // オンラインでエラーが発生した場合、オフラインキューに追加
        queueOperation({
          type: 'create_task_list',
          data: taskList,
        });
        throw error;
      }
    } else {
      // オフラインの場合、キューに追加
      queueOperation({
        type: 'create_task_list',
        data: taskList,
      });
    }
  }, [isOnline, queueOperation]);

  const updateTaskList = useCallback(async (taskListId: string, updates: Partial<TaskList>) => {
    if (isOnline) {
      try {
        await sdkClient.taskList.updateTaskList(taskListId, updates);
      } catch (error) {
        // オンラインでエラーが発生した場合、オフラインキューに追加
        queueOperation({
          type: 'update_task_list',
          data: { id: taskListId, updates },
        });
        throw error;
      }
    } else {
      // オフラインの場合、キューに追加
      queueOperation({
        type: 'update_task_list',
        data: { id: taskListId, updates },
      });
    }
  }, [isOnline, queueOperation]);

  const deleteTaskList = useCallback(async (taskListId: string) => {
    if (isOnline) {
      try {
        await sdkClient.taskList.deleteTaskList(taskListId);
      } catch (error) {
        // オンラインでエラーが発生した場合、オフラインキューに追加
        queueOperation({
          type: 'delete_task_list',
          data: { id: taskListId },
        });
        throw error;
      }
    } else {
      // オフラインの場合、キューに追加
      queueOperation({
        type: 'delete_task_list',
        data: { id: taskListId },
      });
    }
  }, [isOnline, queueOperation]);

  return {
    createTask,
    updateTask,
    deleteTask,
    createTaskList,
    updateTaskList,
    deleteTaskList,
  };
};