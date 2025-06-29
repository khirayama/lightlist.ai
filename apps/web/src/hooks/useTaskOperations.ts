import { useState, useCallback } from 'react';
import { sdkClient } from '../lib/sdk-client';
import type { Task, TaskList } from '@lightlist/sdk';

interface UseTaskOperationsProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  autoSort: boolean;
}

export const useTaskOperations = ({ tasks, setTasks, setError, autoSort }: UseTaskOperationsProps) => {
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  // 共通のソート関数
  const applySorting = useCallback((tasksToSort: Task[]) => {
    return [...tasksToSort].sort((a, b) => {
      // 1. 完了・未完了で分類（未完了が上）
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      
      // 2. 日付有無で分類（日付ありが上）
      const aHasDate = !!a.date;
      const bHasDate = !!b.date;
      if (aHasDate !== bHasDate) {
        return aHasDate ? -1 : 1;
      }
      
      // 3. 日付順（古い順）
      if (aHasDate && bHasDate) {
        return new Date(a.date!).getTime() - new Date(b.date!).getTime();
      }
      
      // 4. その他は作成日順を維持（新しい順）
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, []);

  // 自然言語日付解析関数
  const parseDateFromText = useCallback((text: string): { text: string; date?: string } => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    interface PatternWithDate {
      regex: RegExp;
      date: string;
      dateFromText?: never;
    }

    interface PatternWithDateFromText {
      regex: RegExp;
      dateFromText: true;
      date?: never;
    }

    type DatePattern = PatternWithDate | PatternWithDateFromText;

    // 日本語パターン
    const patterns: DatePattern[] = [
      { regex: /^今日\s+(.+)/, date: formatDate(today) },
      { regex: /^明日\s+(.+)/, date: formatDate(tomorrow) },
      { regex: /^(\d{4}\/\d{1,2}\/\d{1,2})\s+(.+)/, dateFromText: true },
      { regex: /^(\d{4}-\d{1,2}-\d{1,2})\s+(.+)/, dateFromText: true },
    ];

    // 英語パターン
    const englishPatterns: DatePattern[] = [
      { regex: /^today\s+(.+)/i, date: formatDate(today) },
      { regex: /^tomorrow\s+(.+)/i, date: formatDate(tomorrow) },
    ];

    const allPatterns = [...patterns, ...englishPatterns];

    for (const pattern of allPatterns) {
      const match = text.match(pattern.regex);
      if (match) {
        if (pattern.dateFromText) {
          const dateStr = match[1];
          const parsedDate = new Date(dateStr.replace(/\//g, '-'));
          if (!isNaN(parsedDate.getTime())) {
            return {
              text: match[2].trim(),
              date: formatDate(parsedDate)
            };
          }
        } else {
          return {
            text: match[1].trim(),
            date: pattern.date
          };
        }
      }
    }

    return { text };
  }, []);

  const fetchTasks = useCallback(async (taskListId: string) => {
    try {
      setIsLoadingTasks(true);
      setError(null);
      const response = await sdkClient.task.getTasks(taskListId);
      if (response.data?.tasks) {
        setTasks(response.data.tasks);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError('タスクの取得に失敗しました');
    } finally {
      setIsLoadingTasks(false);
    }
  }, [setTasks, setError]);

  const addTask = useCallback(async (taskListId: string, newTaskText: string) => {
    if (!taskListId || !newTaskText.trim()) return;
    
    try {
      setError(null);
      const parsed = parseDateFromText(newTaskText.trim());
      const response = await sdkClient.task.createTask(taskListId, { 
        text: parsed.text,
        date: parsed.date || null
      });
      if (response.data?.task) {
        setTasks(prev => {
          const newTasks = [response.data!.task, ...prev];
          // 自動並び替えが有効な場合は、並び替えを実行
          return autoSort ? applySorting(newTasks) : newTasks;
        });
      }
    } catch (err) {
      console.error('Failed to add task:', err);
      setError('タスクの追加に失敗しました');
      throw err;
    }
  }, [parseDateFromText, setTasks, setError, autoSort, applySorting]);

  const toggleTask = useCallback(async (taskId: string, completed: boolean) => {
    try {
      setError(null);
      const response = await sdkClient.task.updateTask(taskId, { completed });
      if (response.data?.task) {
        setTasks(prev => {
          const updatedTasks = prev.map(task => 
            task.id === taskId ? response.data!.task : task
          );
          // 自動並び替えが有効な場合は、並び替えを実行
          return autoSort ? applySorting(updatedTasks) : updatedTasks;
        });
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      setError('タスクの更新に失敗しました');
    }
  }, [setTasks, setError, autoSort, applySorting]);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      setError(null);
      await sdkClient.task.deleteTask(taskId);
      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('タスクの削除に失敗しました');
    }
  }, [setTasks, setError]);

  const deleteCompletedTasks = useCallback(async () => {
    const completedTasks = tasks.filter(task => task.completed);
    if (completedTasks.length === 0) return;

    try {
      setError(null);
      await Promise.all(
        completedTasks.map(task => sdkClient.task.deleteTask(task.id))
      );
      setTasks(prev => prev.filter(task => !task.completed));
    } catch (err) {
      console.error('Failed to delete completed tasks:', err);
      setError('完了済みタスクの削除に失敗しました');
    }
  }, [tasks, setTasks, setError]);

  const sortTasks = useCallback(() => {
    const sortedTasks = applySorting(tasks);
    setTasks(sortedTasks);
  }, [tasks, setTasks, applySorting]);

  const updateTaskText = useCallback(async (taskId: string, newText: string) => {
    if (!newText.trim()) {
      return;
    }

    try {
      setError(null);
      const response = await sdkClient.task.updateTask(taskId, { text: newText.trim() });
      if (response.data?.task) {
        setTasks(prev => {
          const updatedTasks = prev.map(task => 
            task.id === taskId ? response.data!.task : task
          );
          // 自動並び替えが有効な場合は、並び替えを実行
          return autoSort ? applySorting(updatedTasks) : updatedTasks;
        });
      }
    } catch (err) {
      console.error('Failed to update task text:', err);
      setError('タスクの更新に失敗しました');
    }
  }, [setTasks, setError, autoSort, applySorting]);

  const setTaskDate = useCallback(async (taskId: string, date: string | null) => {
    try {
      setError(null);
      const response = await sdkClient.task.updateTask(taskId, { date });
      if (response.data?.task) {
        setTasks(prev => {
          const updatedTasks = prev.map(task => 
            task.id === taskId ? response.data!.task : task
          );
          // 自動並び替えが有効な場合は、並び替えを実行
          return autoSort ? applySorting(updatedTasks) : updatedTasks;
        });
      }
    } catch (err) {
      console.error('Failed to update task date:', err);
      setError('タスクの日付更新に失敗しました');
    }
  }, [setTasks, setError, autoSort, applySorting]);

  return {
    isLoadingTasks,
    fetchTasks,
    addTask,
    toggleTask,
    deleteTask,
    deleteCompletedTasks,
    sortTasks,
    updateTaskText,
    setTaskDate,
  };
};