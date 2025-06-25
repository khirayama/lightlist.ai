import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { sdkClient } from '../lib/sdk-client';
import type { TaskList, Task } from '@lightlist/sdk';

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  
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
        
        // 最初のタスクリストを選択
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

  // ユーザーがログインした時にデータを取得
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchTaskLists();
    }
  }, [isAuthenticated, user]);

  // 選択されたタスクリストが変更された時にタスクを取得
  useEffect(() => {
    if (selectedTaskListId) {
      fetchTasks(selectedTaskListId);
    }
  }, [selectedTaskListId]);

  // ドロワーオープン時のページ履歴管理（戻るボタンでドロワーを閉じる）
  useEffect(() => {
    const handlePopState = () => {
      if (isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };

    if (isDrawerOpen) {
      // ドロワーが開いた時に履歴にエントリを追加
      window.history.pushState({ drawerOpen: true }, '');
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isDrawerOpen]);

  // CRUD操作関数
  const handleAddTask = async () => {
    if (!selectedTaskListId || !newTaskText.trim()) return;
    
    try {
      setError(null);
      const response = await sdkClient.task.createTask(selectedTaskListId, { text: newTaskText.trim() });
      if (response.data?.task) {
        setTasks(prev => [response.data!.task, ...prev]); // 上に追加
      }
      setNewTaskText('');
    } catch (err) {
      console.error('Failed to add task:', err);
      setError('タスクの追加に失敗しました');
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
      // 完了済みタスクを一括削除
      await Promise.all(
        completedTasks.map(task => sdkClient.task.deleteTask(task.id))
      );
      setTasks(prev => prev.filter(task => !task.completed));
    } catch (err) {
      console.error('Failed to delete completed tasks:', err);
      setError('完了済みタスクの削除に失敗しました');
    }
  };

  const handleSelectTaskList = (taskListId: string) => {
    setSelectedTaskListId(taskListId);
    // カルーセルのインデックスも同期
    const index = taskLists.findIndex(list => list.id === taskListId);
    if (index !== -1) {
      setCurrentTaskListIndex(index);
    }
    setIsDrawerOpen(false); // モバイルでドロワーを閉じる
  };

  // カルーセル操作関数
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

  // ドロワー操作関数
  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  // SSR時および hydration 前は初期コンテンツを表示
  if (!isMounted) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Lightlistへようこそ
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              タスクを管理するためにログインしてください
            </p>
            <div className="space-x-4">
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
              >
                ログイン
              </button>
              <button
                onClick={() => router.push('/register')}
                className="px-4 py-2 border border-primary-500 text-primary-500 rounded-md hover:bg-primary-50 dark:hover:bg-primary-900 transition-colors"
              >
                ユーザー登録
              </button>
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Lightlistへようこそ
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              タスクを管理するためにログインしてください
            </p>
            <div className="space-x-4">
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
              >
                {t('auth.loginButton')}
              </button>
              <button
                onClick={() => router.push('/register')}
                className="px-4 py-2 border border-primary-500 text-primary-500 rounded-md hover:bg-primary-50 dark:hover:bg-primary-900 transition-colors"
              >
                {t('auth.registerButton')}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // 選択されたタスクリストを取得
  const selectedTaskList = taskLists.find(list => list.id === selectedTaskListId);

  return (
    <Layout title="Lightlist - ホーム" requireAuth>
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-md">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}
      
      <div className="flex h-full relative">
        {/* モバイル用ハンバーガーメニューボタン */}
        <button
          onClick={openDrawer}
          className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-600"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* オーバーレイ（モバイル時のみ） */}
        {isDrawerOpen && (
          <div
            onClick={closeDrawer}
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          />
        )}

        {/* サイドバー/ドロワー */}
        <div
          className={`${
            // デスクトップ: 固定サイドバー、モバイル: ドロワー
            isDrawerOpen
              ? 'translate-x-0' // モバイルでドロワーが開いている
              : '-translate-x-full md:translate-x-0' // モバイルで閉じている、デスクトップで開いている
          } fixed md:static inset-y-0 left-0 z-50 w-80 bg-white dark:bg-gray-800 shadow-sm transform transition-transform duration-300 ease-in-out flex flex-col`}
        >
          {/* ドロワーヘッダー（モバイルのみ） */}
          <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              タスクリスト
            </h2>
            <button
              onClick={closeDrawer}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* サイドバーコンテンツ */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-6">
              {/* デスクトップ用のヘッダー（モバイルは上部のヘッダーを使用） */}
              <h2 className="hidden md:block text-lg font-semibold text-gray-900 dark:text-white mb-4">
                タスクリスト
              </h2>
              <button className="w-full px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors">
                {t('taskList.addTaskList')}
              </button>
            </div>

          <div className="space-y-2">
            {isLoadingTaskLists ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div>
              </div>
            ) : taskLists.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                タスクリストがありません
              </p>
            ) : (
              taskLists.map((list) => (
                <div
                  key={list.id}
                  onClick={() => handleSelectTaskList(list.id)}
                  className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${
                    selectedTaskListId === list.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900'
                      : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  style={
                    list.background && selectedTaskListId !== list.id
                      ? { backgroundColor: list.background + '20' }
                      : {}
                  }
                >
                  <span className="text-gray-900 dark:text-white">{list.name}</span>
                  <div className="flex space-x-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: カラーピッカーモーダルを開く
                      }}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      🎨
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: 削除確認モーダルを開く
                      }}
                      className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-8">
            <button
              onClick={() => router.push('/settings')}
              className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('settings.title')}
            </button>
          </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 md:ml-0 pt-16 md:pt-6 p-6">
          <div className="max-w-6xl mx-auto">
            {taskLists.length > 0 ? (
              <div className="relative">
                {/* カルーセルナビゲーション */}
                {taskLists.length > 1 && (
                  <>
                    {/* 左矢印ボタン */}
                    <button
                      onClick={goToPrevTaskList}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    {/* 右矢印ボタン */}
                    <button
                      onClick={goToNextTaskList}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}

                {/* カルーセルコンテナ */}
                <div className="overflow-hidden mx-8">
                  <div 
                    className="flex transition-transform duration-300 ease-in-out"
                    style={{ transform: `translateX(-${currentTaskListIndex * 100}%)` }}
                  >
                    {taskLists.map((taskList, index) => (
                      <div key={taskList.id} className="w-full flex-shrink-0 px-2">
                        <TaskListCard 
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
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* インジケーター */}
                {taskLists.length > 1 && (
                  <div className="flex justify-center mt-6 space-x-2">
                    {taskLists.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => goToTaskList(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentTaskListIndex
                            ? 'bg-primary-500'
                            : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="text-center py-12">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    タスクリストがありません
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    左のサイドバーから新しいタスクリストを作成してください
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

// TaskListCardコンポーネント
interface TaskListCardProps {
  taskList: TaskList;
  tasks: Task[];
  isActive: boolean;
  isLoadingTasks: boolean;
  newTaskText: string;
  setNewTaskText: (text: string) => void;
  onAddTask: () => void;
  onToggleTask: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteCompletedTasks: () => void;
}

const TaskListCard: React.FC<TaskListCardProps> = ({
  taskList,
  tasks,
  isActive,
  isLoadingTasks,
  newTaskText,
  setNewTaskText,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onDeleteCompletedTasks,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {taskList.name}
        </h1>
        <div className="flex space-x-2">
          <button className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            {t('tasks.sortTasks')}
          </button>
          <button className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            {t('taskList.shareTaskList')}
          </button>
        </div>
      </div>

      {isActive && (
        <div className="mb-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  onAddTask();
                }
              }}
              placeholder={t('tasks.taskPlaceholder')}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button 
              onClick={onAddTask}
              disabled={!newTaskText.trim()}
              className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('tasks.addTask')}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {isLoadingTasks && isActive ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              タスクがありません
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={(e) => onToggleTask(task.id, e.target.checked)}
                className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span
                className={`flex-1 ${
                  task.completed
                    ? 'text-gray-500 dark:text-gray-400 line-through'
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                {task.text}
              </span>
              {task.date && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {task.date}
                </span>
              )}
              <button 
                onClick={() => onDeleteTask(task.id)}
                className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>

      {isActive && (
        <div className="mt-4">
          <button 
            onClick={onDeleteCompletedTasks}
            disabled={tasks.filter(task => task.completed).length === 0}
            className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('tasks.deleteCompleted')} ({tasks.filter(task => task.completed).length})
          </button>
        </div>
      )}
    </div>
  );
};

export default HomePage;