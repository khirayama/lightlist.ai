import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ColorPicker } from '../components/ColorPicker';
import { Layout } from '../components/Layout';
import { AnimatedTaskListCard } from '../components/AnimatedTaskListCard';
import { useAuth } from '../contexts/AuthContext';
import { sdkClient } from '../lib/sdk-client';
import type { TaskList, Task } from '@lightlist/sdk';

interface HomePageProps {
  i18nInitialized?: boolean;
}

// カスタムフック: SSR対応のウィンドウサイズ取得
const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: 1024, // デフォルト値（デスクトップサイズ）
    height: 768,
  });

  useEffect(() => {
    // ブラウザ環境でのみ実行
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // 初回設定
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

const HomePage: React.FC<HomePageProps> = ({ i18nInitialized = false }) => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const { width } = useWindowSize();
  const isMobile = isMounted && width < 768;
  // const { t } = useSafeTranslation(); // 一時的にコメントアウト
  
  // データ状態
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(null);
  
  // UI状態
  const [isLoadingTaskLists, setIsLoadingTaskLists] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddTaskListModalOpen, setIsAddTaskListModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [editingTaskListId, setEditingTaskListId] = useState<string | null>(null);
  const [editingTaskListName, setEditingTaskListName] = useState('');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const [selectedTaskForDate, setSelectedTaskForDate] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // カルーセル状態
  const [currentTaskListIndex, setCurrentTaskListIndex] = useState(0);

  // データ取得関数
  const fetchTaskLists = async () => {
    if (!user) return;
    
    try {
      setIsLoadingTaskLists(true);
      setError(null);
      const response = await sdkClient.taskList.getTaskLists();
      if (response.data?.taskLists) {
        setTaskLists(response.data.taskLists);
        
        if (response.data.taskLists.length > 0 && !selectedTaskListId) {
          setSelectedTaskListId(response.data.taskLists[0].id);
          setCurrentTaskListIndex(0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch task lists:', err);
      setError('タスクリストの取得に失敗しました');
    } finally {
      setIsLoadingTaskLists(false);
    }
  };

  const fetchTasks = async (taskListId: string) => {
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
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchTaskLists();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (selectedTaskListId) {
      fetchTasks(selectedTaskListId);
    }
  }, [selectedTaskListId]);

  useEffect(() => {
    const handlePopState = () => {
      if (isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };

    if (isDrawerOpen && isMobile) {
      window.history.pushState({ drawerOpen: true }, '');
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isDrawerOpen, isMobile]);

  // 自然言語日付解析関数
  const parseDateFromText = (text: string): { text: string; date?: string } => {
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
  };

  // CRUD操作関数
  const handleAddTask = async () => {
    if (!selectedTaskListId || !newTaskText.trim()) return;
    
    try {
      setError(null);
      const parsed = parseDateFromText(newTaskText.trim());
      const response = await sdkClient.task.createTask(selectedTaskListId, { 
        text: parsed.text,
        date: parsed.date || null
      });
      if (response.data?.task) {
        setTasks(prev => [response.data!.task, ...prev]);
      }
      setNewTaskText('');
    } catch (err) {
      console.error('Failed to add task:', err);
      setError('タスクの追加に失敗しました');
    }
  };

  const handleCreateTaskList = async () => {
    if (!newListName.trim()) return;

    try {
      setError(null);
      const response = await sdkClient.taskList.createTaskList({ name: newListName.trim() });
      if (response.data?.taskList) {
        fetchTaskLists();
        setNewListName('');
        setIsAddTaskListModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to create task list:', err);
      setError('タスクリストの作成に失敗しました');
    }
  };

  const handleUpdateTaskListName = async (taskListId: string) => {
    if (!editingTaskListName.trim()) {
      setEditingTaskListId(null);
      return;
    }

    try {
      setError(null);
      await sdkClient.taskList.updateTaskList(taskListId, { name: editingTaskListName.trim() });
      setEditingTaskListId(null);
      fetchTaskLists();
    } catch (err) {
      console.error('Failed to update task list name:', err);
      setError('タスクリスト名の更新に失敗しました');
    }
  };

  const handleUpdateTaskListBackground = async (taskListId: string, color: string) => {
    try {
      setError(null);
      await sdkClient.taskList.updateTaskList(taskListId, { background: color });
      fetchTaskLists();
    } catch (err) {
      console.error('Failed to update task list background:', err);
      setError('タスクリストの背景色の更新に失敗しました');
    }
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      setError(null);
      const response = await sdkClient.task.updateTask(taskId, { completed });
      if (response.data?.task) {
        setTasks(prev => prev.map(task => 
          task.id === taskId ? response.data!.task : task
        ));
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      setError('タスクの更新に失敗しました');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      setError(null);
      await sdkClient.task.deleteTask(taskId);
      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('タスクの削除に失敗しました');
    }
  };

  const handleDeleteCompletedTasks = async () => {
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
  };

  const handleSortTasks = () => {
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
  };

  const handleUpdateTaskText = async (taskId: string) => {
    if (!editingTaskText.trim()) {
      setEditingTaskId(null);
      return;
    }

    try {
      setError(null);
      const response = await sdkClient.task.updateTask(taskId, { text: editingTaskText.trim() });
      if (response.data?.task) {
        setTasks(prev => prev.map(task => 
          task.id === taskId ? response.data!.task : task
        ));
      }
      setEditingTaskId(null);
    } catch (err) {
      console.error('Failed to update task text:', err);
      setError('タスクの更新に失敗しました');
    }
  };

  const handleSetTaskDate = async (taskId: string, date: string | null) => {
    try {
      setError(null);
      const response = await sdkClient.task.updateTask(taskId, { date });
      if (response.data?.task) {
        setTasks(prev => prev.map(task => 
          task.id === taskId ? response.data!.task : task
        ));
      }
      setSelectedTaskForDate(null);
    } catch (err) {
      console.error('Failed to update task date:', err);
      setError('タスクの日付更新に失敗しました');
    }
  };

  const handleStartEditTask = (taskId: string, currentText: string) => {
    setEditingTaskId(taskId);
    setEditingTaskText(currentText);
  };

  const handleCancelEditTask = () => {
    setEditingTaskId(null);
    setEditingTaskText('');
  };

  const handleOpenDatePicker = (taskId: string) => {
    setSelectedTaskForDate(taskId);
  };

  const handleDeleteTaskList = async (taskListId: string) => {
    if (window.confirm('本当にこのタスクリストを削除しますか？')) {
      try {
        setError(null);
        await sdkClient.taskList.deleteTaskList(taskListId);
        fetchTaskLists();
      } catch (err) {
        console.error('Failed to delete task list:', err);
        setError('タスクリストの削除に失敗しました');
      }
    }
  };

  // 共有機能関連の関数
  const handleOpenShareModal = async () => {
    if (!selectedTaskListId) return;
    
    setIsShareModalOpen(true);
    setIsGeneratingShare(true);
    setError(null);
    
    try {
      const response = await sdkClient.share.createShareLink(selectedTaskListId);
      if (response.data) {
        setShareLink(response.data.shareUrl);
      }
    } catch (err) {
      console.error('Failed to create share link:', err);
      setError('共有リンクの生成に失敗しました');
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareLink) return;
    
    try {
      await navigator.clipboard.writeText(shareLink);
      alert('共有リンクがクリップボードにコピーされました');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      alert('リンクのコピーに失敗しました');
    }
  };

  const handleDeleteShareLink = async () => {
    if (!selectedTaskListId) return;
    
    if (window.confirm('共有リンクを削除しますか？')) {
      try {
        setError(null);
        await sdkClient.share.deleteShareLink(selectedTaskListId);
        setShareLink(null);
        setIsShareModalOpen(false);
        alert('共有リンクが削除されました');
      } catch (err) {
        console.error('Failed to delete share link:', err);
        setError('共有リンクの削除に失敗しました');
      }
    }
  };

  const handleCloseShareModal = () => {
    setIsShareModalOpen(false);
    setShareLink(null);
    setIsGeneratingShare(false);
  };

  const handleSelectTaskList = (taskListId: string) => {
    setSelectedTaskListId(taskListId);
    const index = taskLists.findIndex(list => list.id === taskListId);
    if (index !== -1) {
      setCurrentTaskListIndex(index);
    }
    if (isMobile) {
      setIsDrawerOpen(false);
    }
  };

  const goToTaskList = (index: number) => {
    if (index >= 0 && index < taskLists.length) {
      setCurrentTaskListIndex(index);
      setSelectedTaskListId(taskLists[index].id);
    }
  };

  const goToPrevTaskList = () => {
    const newIndex = currentTaskListIndex > 0 ? currentTaskListIndex - 1 : taskLists.length - 1;
    goToTaskList(newIndex);
  };

  const goToNextTaskList = () => {
    const newIndex = currentTaskListIndex < taskLists.length - 1 ? currentTaskListIndex + 1 : 0;
    goToTaskList(newIndex);
  };

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  // キーボードショートカット
  useEffect(() => {
    // ブラウザ環境でのみ実行
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + / : ショートカット一覧表示
      if (ctrlOrCmd && e.key === '/') {
        e.preventDefault();
        setIsShortcutHelpOpen(true);
        return;
      }

      // Ctrl/Cmd + N : 新しいタスク追加にフォーカス
      if (ctrlOrCmd && e.key === 'n') {
        e.preventDefault();
        const taskInput = document.querySelector('input[aria-label="新しいタスクを入力"]') as HTMLInputElement;
        if (taskInput) {
          taskInput.focus();
        }
        return;
      }

      // Delete : 選択されたタスクを削除
      if (e.key === 'Delete' && selectedTaskId) {
        e.preventDefault();
        if (window.confirm('選択されたタスクを削除しますか？')) {
          handleDeleteTask(selectedTaskId);
          setSelectedTaskId(null);
        }
        return;
      }

      // Ctrl/Cmd + Enter : タスク保存（編集中の場合）
      if (ctrlOrCmd && e.key === 'Enter' && editingTaskId) {
        e.preventDefault();
        handleUpdateTaskText(editingTaskId);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedTaskId, editingTaskId]);

  // タスク選択の処理
  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(selectedTaskId === taskId ? null : taskId);
  };

  if (!isMounted) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lightlistへようこそ</h1>
            <p className="text-gray-600 dark:text-gray-400">タスクを管理するためにログインしてください</p>
            <div className="space-x-4">
              <button onClick={() => router.push('/login')} className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors">ログイン</button>
              <button onClick={() => router.push('/register')} className="px-4 py-2 border border-primary-500 text-primary-500 rounded-md hover:bg-primary-50 dark:hover:bg-primary-900 transition-colors">ユーザー登録</button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lightlistへようこそ</h1>
            <p className="text-gray-600 dark:text-gray-400">タスクを管理するためにログインしてください</p>
            <div className="space-x-4">
              <button onClick={() => router.push('/login')} className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors">ログイン</button>
              <button onClick={() => router.push('/register')} className="px-4 py-2 border border-primary-500 text-primary-500 rounded-md hover:bg-primary-50 dark:hover:bg-primary-900 transition-colors">ユーザー登録</button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const selectedTaskList = taskLists.find(list => list.id === selectedTaskListId);

  return (
    <Layout title="Lightlist - ホーム" requireAuth>
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-md">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      {isColorPickerOpen && editingTaskListId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <ColorPicker color={selectedColor} onChangeComplete={(color) => setSelectedColor(color)} />
            <div className="mt-4 flex justify-end space-x-2">
              <button onClick={() => setIsColorPickerOpen(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">キャンセル</button>
              <button onClick={() => { handleUpdateTaskListBackground(editingTaskListId, selectedColor); setIsColorPickerOpen(false); }} className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors">保存</button>
            </div>
          </div>
        </div>
      )}

      {selectedTaskForDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">期限を設定</h2>
            <input 
              type="date" 
              defaultValue={tasks.find(t => t.id === selectedTaskForDate)?.date || ''}
              onChange={(e) => {
                const date = e.target.value || null;
                handleSetTaskDate(selectedTaskForDate, date);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button onClick={() => setSelectedTaskForDate(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">キャンセル</button>
              <button onClick={() => handleSetTaskDate(selectedTaskForDate, null)} className="px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors">削除</button>
            </div>
          </div>
        </div>
      )}

      {isAddTaskListModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">新しいタスクリストを作成</h2>
            <input type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="タスクリスト名" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            <div className="mt-4 flex justify-end space-x-2">
              <button onClick={() => setIsAddTaskListModalOpen(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">キャンセル</button>
              <button onClick={handleCreateTaskList} disabled={!newListName.trim()} className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">作成</button>
            </div>
          </div>
        </div>
      )}

      {/* 共有モーダル */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              タスクリストを共有
            </h2>
            
            {isGeneratingShare ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mr-4"></div>
                <span className="text-gray-600 dark:text-gray-400">共有リンクを生成中...</span>
              </div>
            ) : shareLink ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    共有リンク
                  </label>
                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="w-full bg-transparent text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <button 
                    onClick={handleCopyShareLink}
                    className="w-full py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
                  >
                    リンクをコピー
                  </button>
                  
                  <button 
                    onClick={handleDeleteShareLink}
                    className="w-full py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                  >
                    共有を解除
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  共有リンクの生成に失敗しました
                </p>
                <button 
                  onClick={handleOpenShareModal}
                  className="py-2 px-4 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
                >
                  再試行
                </button>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button 
                onClick={handleCloseShareModal} 
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ショートカットヘルプモーダル */}
      {isShortcutHelpOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              キーボードショートカット
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">新しいタスクにフォーカス</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded border">
                  {typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'Cmd' : 'Ctrl'} + N
                </kbd>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">タスク保存</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded border">
                  {typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'Cmd' : 'Ctrl'} + Enter
                </kbd>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">選択したタスクを削除</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded border">
                  Delete
                </kbd>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">ショートカット一覧</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded border">
                  {typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'Cmd' : 'Ctrl'} + /
                </kbd>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setIsShortcutHelpOpen(false)} 
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex h-full relative">
        {isMobile && (
          <button onClick={openDrawer} className="fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-600">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        )}

        {isMobile && isDrawerOpen && (
          <div onClick={closeDrawer} className="fixed inset-0 bg-black bg-opacity-50 z-40" />
        )}

        <div className={`transform transition-transform duration-300 ease-in-out flex flex-col w-80 bg-white dark:bg-gray-800 shadow-sm ${isMobile ? (isDrawerOpen ? 'translate-x-0 fixed inset-y-0 left-0 z-50' : '-translate-x-full fixed inset-y-0 left-0 z-50') : 'static'}`}>
          {isMobile && (
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">タスクリスト</h2>
              <button onClick={closeDrawer} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-6">
              <h2 className="hidden md:block text-lg font-semibold text-gray-900 dark:text-white mb-4">タスクリスト</h2>
              <button onClick={() => setIsAddTaskListModalOpen(true)} className="w-full px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors">タスクリストを追加</button>
            </div>

            <div className="space-y-2">
              {isLoadingTaskLists ? (
                <div className="text-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div></div>
              ) : taskLists.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">タスクリストがありません</p>
              ) : (
                taskLists.map((list) => (
                  <div key={list.id} onClick={() => handleSelectTaskList(list.id)} className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${selectedTaskListId === list.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`} style={list.background && selectedTaskListId !== list.id ? { backgroundColor: list.background + '20' } : {}}>
                    {editingTaskListId === list.id ? (
                      <input type="text" value={editingTaskListName} onChange={(e) => setEditingTaskListName(e.target.value)} onBlur={() => handleUpdateTaskListName(list.id)} onKeyDown={(e) => { if (e.key === 'Enter') { handleUpdateTaskListName(list.id); } else if (e.key === 'Escape') { setEditingTaskListId(null); } }} className="w-full bg-transparent text-gray-900 dark:text-white focus:outline-none" autoFocus />
                    ) : (
                      <span onDoubleClick={() => { setEditingTaskListId(list.id); setEditingTaskListName(list.name); }} className="text-gray-900 dark:text-white">{list.name}</span>
                    )}
                    <div className="flex space-x-2">
                      <button onClick={(e) => { e.stopPropagation(); setEditingTaskListId(list.id); setSelectedColor(list.background || '#FFFFFF'); setIsColorPickerOpen(true); }} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">🎨</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteTaskList(list.id); }} className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400">🗑️</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-8">
              <button onClick={() => router.push('/settings')} className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">設定</button>
            </div>
          </div>
        </div>

        <div className={`flex-1 ${isMobile ? 'pt-16' : 'pt-6'} p-6`}>
          <div className="max-w-6xl mx-auto">
            {taskLists.length > 0 ? (
              <div className="relative">
                {taskLists.length > 1 && (
                  <>
                    <button onClick={goToPrevTaskList} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"><svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                    <button onClick={goToNextTaskList} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"><svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                  </>
                )}

                <div className="overflow-hidden mx-8">
                  <div className="flex transition-transform duration-300 ease-in-out" style={{ transform: `translateX(-${currentTaskListIndex * 100}%)` }}>
                    {taskLists.map((taskList, index) => (
                      <div key={taskList.id} className="w-full flex-shrink-0 px-2">
                        <AnimatedTaskListCard 
                          taskList={taskList} 
                          tasks={index === currentTaskListIndex ? tasks : []} 
                          isActive={index === currentTaskListIndex} 
                          isLoadingTasks={isLoadingTasks} 
                          newTaskText={newTaskText} 
                          setNewTaskText={setNewTaskText} 
                          onAddTask={handleAddTask} 
                          onToggleTask={handleToggleTask} 
                          onDeleteTask={handleDeleteTask} 
                          onDeleteCompletedTasks={handleDeleteCompletedTasks} 
                          onSortTasks={handleSortTasks}
                          editingTaskId={editingTaskId}
                          editingTaskText={editingTaskText}
                          setEditingTaskText={setEditingTaskText}
                          onStartEditTask={handleStartEditTask}
                          onUpdateTaskText={handleUpdateTaskText}
                          onCancelEditTask={handleCancelEditTask}
                          onSetTaskDate={handleOpenDatePicker}
                          selectedTaskId={selectedTaskId}
                          onTaskClick={handleTaskClick}
                          onOpenShareModal={handleOpenShareModal}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {taskLists.length > 1 && (
                  <div className="flex justify-center mt-6 space-x-2">
                    {taskLists.map((_, index) => (
                      <button key={index} onClick={() => goToTaskList(index)} className={`w-2 h-2 rounded-full transition-colors ${index === currentTaskListIndex ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'}`} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="text-center py-12">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">タスクリストがありません</h2>
                  <p className="text-gray-500 dark:text-gray-400">左のサイドバーから新しいタスクリストを作成してください</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};


export default HomePage;

// SSRを無効化してクライアントサイドレンダリングのみを使用
// getServerSidePropsを削除してクライアントサイドレンダリングのみに変更