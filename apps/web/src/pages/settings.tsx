import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  
  const [settings, setSettings] = useState({
    taskInsertPosition: 'top',
    autoSort: false,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
  };

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleDeleteAccount = () => {
    // TODO: Implement account deletion
    setShowDeleteConfirm(false);
    logout();
    router.push('/');
  };

  return (
    <Layout title="Lightlist - 設定" requireAuth>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('settings.title')}
          </h1>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t('common.backToHome')}
          </button>
        </div>

        <div className="space-y-6">
          {/* プロフィール設定 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('settings.profile')}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('auth.email')}
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* テーマ設定 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('settings.theme')}
            </h2>
            <div className="space-y-2">
              {['system', 'light', 'dark'].map((themeOption) => (
                <label key={themeOption} className="flex items-center">
                  <input
                    type="radio"
                    name="theme"
                    value={themeOption}
                    checked={theme === themeOption}
                    onChange={(e) => handleThemeChange(e.target.value)}
                    className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300"
                  />
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {t(`settings.themes.${themeOption}`)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 言語設定 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('settings.language')}
            </h2>
            <div className="space-y-2">
              {['ja', 'en'].map((lang) => (
                <label key={lang} className="flex items-center">
                  <input
                    type="radio"
                    name="language"
                    value={lang}
                    checked={i18n.language === lang}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300"
                  />
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {t(`settings.languages.${lang}`)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* タスク設定 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              タスク設定
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.taskInsertPosition')}
                </label>
                <div className="space-y-2">
                  {['top', 'bottom'].map((position) => (
                    <label key={position} className="flex items-center">
                      <input
                        type="radio"
                        name="taskInsertPosition"
                        value={position}
                        checked={settings.taskInsertPosition === position}
                        onChange={(e) => handleSettingChange('taskInsertPosition', e.target.value)}
                        className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300"
                      />
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {t(`settings.insertPositions.${position}`)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.autoSort}
                    onChange={(e) => handleSettingChange('autoSort', e.target.checked)}
                    className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {t('settings.autoSort')}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* アカウント操作 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              アカウント
            </h2>
            <div className="space-y-4">
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                {t('auth.logoutButton')}
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                {t('settings.deleteAccount')}
              </button>
            </div>
          </div>
        </div>

        {/* アカウント削除確認モーダル */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                アカウント削除の確認
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                本当にアカウントを削除しますか？この操作は取り消すことができません。
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SettingsPage;