import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { sdkClient } from '../lib/sdk-client';
import type { UserSettings, AppSettings } from '@lightlist/sdk';

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  
  // 設定データ
  const [userSettings, setUserSettings] = useState<UserSettings>({
    theme: 'system',
    language: 'ja',
  });
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  
  // UI状態
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isLoadingApp, setIsLoadingApp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // データ取得関数
  const fetchUserSettings = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoadingSettings(true);
      setError(null);
      const response = await sdkClient.user.getSettings(user.id);
      if (response.data) {
        setUserSettings(response.data.settings);
        
        // テーマと言語をローカル状態に反映
        setTheme(response.data.settings.theme);
        i18n.changeLanguage(response.data.settings.language);
      }
    } catch (err) {
      console.error('Failed to fetch user settings:', err);
      setError('設定の取得に失敗しました');
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const fetchAppSettings = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoadingApp(true);
      setError(null);
      const response = await sdkClient.user.getApp(user.id);
      if (response.data) {
        setAppSettings(response.data.app);
      }
    } catch (err) {
      console.error('Failed to fetch app settings:', err);
      setError('アプリ設定の取得に失敗しました');
    } finally {
      setIsLoadingApp(false);
    }
  };

  // 設定更新関数
  const updateUserSettings = async (updates: Partial<UserSettings>) => {
    if (!user?.id) return;
    
    try {
      setIsSaving(true);
      setError(null);
      const response = await sdkClient.user.updateSettings(user.id, updates);
      if (response.data) {
        setUserSettings(response.data.settings);
      }
    } catch (err) {
      console.error('Failed to update user settings:', err);
      setError('設定の更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const updateAppSettings = async (updates: Partial<AppSettings>) => {
    if (!user?.id) return;
    
    try {
      setIsSaving(true);
      setError(null);
      const response = await sdkClient.user.updateApp(user.id, updates);
      if (response.data) {
        setAppSettings(response.data.app);
      }
    } catch (err) {
      console.error('Failed to update app settings:', err);
      setError('アプリ設定の更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // イベントハンドラー
  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    await updateUserSettings({ theme: newTheme as UserSettings['theme'] });
  };

  const handleLanguageChange = async (language: string) => {
    i18n.changeLanguage(language);
    await updateUserSettings({ language: language as UserSettings['language'] });
  };

  const handleTaskInsertPositionChange = async (position: string) => {
    await updateAppSettings({ taskInsertPosition: position as AppSettings['taskInsertPosition'] });
  };

  const handleAutoSortChange = async (autoSort: boolean) => {
    await updateAppSettings({ autoSort });
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (err) {
      console.error('Logout failed:', err);
      // ログアウトに失敗してもページを移動
      router.push('/');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    
    try {
      setError(null);
      await sdkClient.user.deleteAccount(user.id);
      setShowDeleteConfirm(false);
      await logout();
      router.push('/');
    } catch (err) {
      console.error('Account deletion failed:', err);
      setError('アカウントの削除に失敗しました');
      setShowDeleteConfirm(false);
    }
  };

  // データ初期化
  useEffect(() => {
    if (user?.id) {
      fetchUserSettings();
      fetchAppSettings();
    }
  }, [user?.id]);

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

        {error && (
          <div className="mb-6 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-md">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {isSaving && (
          <div className="mb-6 p-3 bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded-md">
            <p className="text-blue-700 dark:text-blue-300 text-sm">設定を保存中...</p>
          </div>
        )}

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
            {isLoadingSettings ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {['system', 'light', 'dark'].map((themeOption) => (
                  <label key={themeOption} className="flex items-center">
                    <input
                      type="radio"
                      name="theme"
                      value={themeOption}
                      checked={userSettings.theme === themeOption}
                      onChange={(e) => handleThemeChange(e.target.value)}
                      disabled={isSaving}
                      className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 disabled:opacity-50"
                    />
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {t(`settings.themes.${themeOption}`)}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 言語設定 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('settings.language')}
            </h2>
            {isLoadingSettings ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {['ja', 'en'].map((lang) => (
                  <label key={lang} className="flex items-center">
                    <input
                      type="radio"
                      name="language"
                      value={lang}
                      checked={userSettings.language === lang}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      disabled={isSaving}
                      className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 disabled:opacity-50"
                    />
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {t(`settings.languages.${lang}`)}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* タスク設定 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              タスク設定
            </h2>
            {isLoadingApp ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
              </div>
            ) : appSettings ? (
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
                          checked={appSettings.taskInsertPosition === position}
                          onChange={(e) => handleTaskInsertPositionChange(e.target.value)}
                          disabled={isSaving}
                          className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 disabled:opacity-50"
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
                      checked={appSettings.autoSort}
                      onChange={(e) => handleAutoSortChange(e.target.checked)}
                      disabled={isSaving}
                      className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {t('settings.autoSort')}
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                アプリ設定を読み込めませんでした
              </p>
            )}
          </div>

          {/* アカウント操作 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              アカウント
            </h2>
            <div className="space-y-4">
              <button
                onClick={handleLogout}
                disabled={isSaving}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('auth.logoutButton')}
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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