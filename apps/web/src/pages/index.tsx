import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [taskLists] = useState([
    { id: '1', name: '📝個人', background: '#FFE4E1' },
    { id: '2', name: '💼仕事', background: '#E6E6FA' },
  ]);
  const [tasks] = useState([
    { id: '1', text: '買い物リスト作成', completed: false, date: '2025-06-24' },
    { id: '2', text: 'ミーティング資料準備', completed: true, date: null },
    { id: '3', text: 'プロジェクト進捗確認', completed: false, date: '2025-06-25' },
  ]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
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

  return (
    <Layout title="Lightlist - ホーム" requireAuth>
      <div className="flex h-full">
        {/* サイドバー */}
        <div className="w-80 bg-white dark:bg-gray-800 shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              タスクリスト
            </h2>
            <button className="w-full px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors">
              {t('taskList.addTaskList')}
            </button>
          </div>

          <div className="space-y-2">
            {taskLists.map((list) => (
              <div
                key={list.id}
                className="flex items-center justify-between p-3 rounded-md border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                style={{ backgroundColor: list.background + '20' }}
              >
                <span className="text-gray-900 dark:text-white">{list.name}</span>
                <div className="flex space-x-2">
                  <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    🎨
                  </button>
                  <button className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
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

        {/* メインコンテンツ */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  📝個人
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

              <div className="mb-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder={t('tasks.taskPlaceholder')}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors">
                    {t('tasks.addTask')}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
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
                    <button className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400">
                      🗑️
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <button className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                  {t('tasks.deleteCompleted')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;