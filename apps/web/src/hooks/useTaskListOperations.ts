import { useState, useCallback } from 'react';
import { sdkClient } from '../lib/sdk-client';
import type { TaskList, User } from '@lightlist/sdk';

interface UseTaskListOperationsProps {
  user: User | null;
  taskLists: TaskList[];
  setTaskLists: React.Dispatch<React.SetStateAction<TaskList[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useTaskListOperations = ({ 
  user, 
  taskLists, 
  setTaskLists, 
  setError 
}: UseTaskListOperationsProps) => {
  const [isLoadingTaskLists, setIsLoadingTaskLists] = useState(false);

  const fetchTaskLists = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoadingTaskLists(true);
      setError(null);
      const response = await sdkClient.taskList.getTaskLists();
      if (response.data?.taskLists) {
        setTaskLists(response.data.taskLists);
      }
    } catch (err) {
      console.error('Failed to fetch task lists:', err);
      setError('タスクリストの取得に失敗しました');
    } finally {
      setIsLoadingTaskLists(false);
    }
  }, [user, setTaskLists, setError]);

  const createTaskList = useCallback(async (name: string) => {
    if (!name.trim()) return;

    try {
      setError(null);
      const response = await sdkClient.taskList.createTaskList({ name: name.trim() });
      if (response.data?.taskList) {
        await fetchTaskLists(); // リストを再取得して順序を更新
      }
    } catch (err) {
      console.error('Failed to create task list:', err);
      setError('タスクリストの作成に失敗しました');
      throw err;
    }
  }, [fetchTaskLists, setError]);

  const updateTaskListName = useCallback(async (taskListId: string, name: string) => {
    if (!name.trim()) {
      return;
    }

    try {
      setError(null);
      await sdkClient.taskList.updateTaskList(taskListId, { name: name.trim() });
      await fetchTaskLists(); // リストを再取得
    } catch (err) {
      console.error('Failed to update task list name:', err);
      setError('タスクリスト名の更新に失敗しました');
    }
  }, [fetchTaskLists, setError]);

  const updateTaskListBackground = useCallback(async (taskListId: string, color: string) => {
    try {
      setError(null);
      await sdkClient.taskList.updateTaskList(taskListId, { background: color });
      await fetchTaskLists(); // リストを再取得
    } catch (err) {
      console.error('Failed to update task list background:', err);
      setError('タスクリストの背景色の更新に失敗しました');
    }
  }, [fetchTaskLists, setError]);

  const deleteTaskList = useCallback(async (taskListId: string) => {
    if (window.confirm('本当にこのタスクリストを削除しますか？')) {
      try {
        setError(null);
        await sdkClient.taskList.deleteTaskList(taskListId);
        await fetchTaskLists(); // リストを再取得
      } catch (err) {
        console.error('Failed to delete task list:', err);
        setError('タスクリストの削除に失敗しました');
      }
    }
  }, [fetchTaskLists, setError]);

  return {
    isLoadingTaskLists,
    fetchTaskLists,
    createTaskList,
    updateTaskListName,
    updateTaskListBackground,
    deleteTaskList,
  };
};