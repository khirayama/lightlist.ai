import { useState, useCallback } from 'react';
import { LightlistSDK, type Task, type TaskList } from '@lightlist/sdk';

const sdkClient = new LightlistSDK(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080');

interface UseTaskOperationsProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  tasksByListId: Record<string, Task[]>;
  setTasksByListId: React.Dispatch<React.SetStateAction<Record<string, Task[]>>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useTaskOperations = ({ 
  tasks, 
  setTasks, 
  tasksByListId, 
  setTasksByListId, 
  setError 
}: UseTaskOperationsProps) => {
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

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
        setTasksByListId(prev => ({
          ...prev,
          [taskListId]: response.data!.tasks
        }));
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError('タスクの取得に失敗しました');
    } finally {
      setIsLoadingTasks(false);
    }
  }, [setTasks, setTasksByListId, setError]);

  const addTask = useCallback(async (selectedTaskListId: string, newTaskText: string) => {
    if (!selectedTaskListId || !newTaskText.trim()) return;
    
    try {
      setError(null);
      const parsed = parseDateFromText(newTaskText.trim());
      const response = await sdkClient.task.createTask(selectedTaskListId, { 
        text: parsed.text,
        date: parsed.date || null
      });
      if (response.data?.task) {
        const newTasks = [response.data.task, ...tasks];
        setTasks(newTasks);
        setTasksByListId(prev => ({
          ...prev,
          [selectedTaskListId]: newTasks
        }));
      }
    } catch (err) {
      console.error('Failed to add task:', err);
      setError('タスクの追加に失敗しました');
      throw err;
    }
  }, [parseDateFromText, tasks, setTasks, setTasksByListId, setError]);

  const toggleTask = useCallback(async (taskId: string, completed: boolean, selectedTaskListId: string | null) => {
    try {
      setError(null);
      const response = await sdkClient.task.updateTask(taskId, { completed });
      if (response.data?.task && selectedTaskListId) {
        const updatedTasks = tasks.map(task => 
          task.id === taskId ? response.data!.task : task
        );
        setTasks(updatedTasks);
        setTasksByListId(prev => ({
          ...prev,
          [selectedTaskListId]: updatedTasks
        }));
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      setError('タスクの更新に失敗しました');
    }
  }, [tasks, setTasks, setTasksByListId, setError]);

  const deleteTask = useCallback(async (taskId: string, selectedTaskListId: string | null) => {
    try {
      setError(null);
      await sdkClient.task.deleteTask(taskId);
      const filteredTasks = tasks.filter(task => task.id !== taskId);
      setTasks(filteredTasks);
      if (selectedTaskListId) {
        setTasksByListId(prev => ({
          ...prev,
          [selectedTaskListId]: filteredTasks
        }));
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('タスクの削除に失敗しました');
    }
  }, [tasks, setTasks, setTasksByListId, setError]);

  const deleteCompletedTasks = useCallback(async (selectedTaskListId: string | null) => {
    const completedTasks = tasks.filter(task => task.completed);
    if (completedTasks.length === 0) return;

    try {
      setError(null);
      await Promise.all(
        completedTasks.map(task => sdkClient.task.deleteTask(task.id))
      );
      const filteredTasks = tasks.filter(task => !task.completed);
      setTasks(filteredTasks);
      if (selectedTaskListId) {
        setTasksByListId(prev => ({
          ...prev,
          [selectedTaskListId]: filteredTasks
        }));
      }
    } catch (err) {
      console.error('Failed to delete completed tasks:', err);
      setError('完了済みタスクの削除に失敗しました');
    }
  }, [tasks, setTasks, setTasksByListId, setError]);

  const sortTasks = useCallback((selectedTaskListId: string | null) => {
    const sortedTasks = [...tasks].sort((a, b) => {
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
    
    setTasks(sortedTasks);
    if (selectedTaskListId) {
      setTasksByListId(prev => ({
        ...prev,
        [selectedTaskListId]: sortedTasks
      }));
    }
  }, [tasks, setTasks, setTasksByListId]);

  const updateTaskText = useCallback(async (taskId: string, newText: string, selectedTaskListId: string | null) => {
    if (!newText.trim()) return;

    try {
      setError(null);
      const response = await sdkClient.task.updateTask(taskId, { text: newText.trim() });
      if (response.data?.task && selectedTaskListId) {
        const updatedTasks = tasks.map(task => 
          task.id === taskId ? response.data!.task : task
        );
        setTasks(updatedTasks);
        setTasksByListId(prev => ({
          ...prev,
          [selectedTaskListId]: updatedTasks
        }));
      }
    } catch (err) {
      console.error('Failed to update task text:', err);
      setError('タスクの更新に失敗しました');
    }
  }, [tasks, setTasks, setTasksByListId, setError]);

  const setTaskDate = useCallback(async (taskId: string, date: string | null, selectedTaskListId: string | null) => {
    try {
      setError(null);
      const response = await sdkClient.task.updateTask(taskId, { date });
      if (response.data?.task && selectedTaskListId) {
        const updatedTasks = tasks.map(task => 
          task.id === taskId ? response.data!.task : task
        );
        setTasks(updatedTasks);
        setTasksByListId(prev => ({
          ...prev,
          [selectedTaskListId]: updatedTasks
        }));
      }
    } catch (err) {
      console.error('Failed to update task date:', err);
      setError('タスクの日付更新に失敗しました');
    }
  }, [tasks, setTasks, setTasksByListId, setError]);

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