import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSafeTranslation } from '../hooks/useSafeTranslation';
import { useTheme } from 'next-themes';
import { Layout } from '../components/Layout';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, CardFooter, Icon } from '../components';
import { useAuth } from '../contexts/AuthContext';
import { sdkClient } from '../lib/sdk-client';
import type { UserSettings, AppSettings } from '@lightlist/sdk';

const SettingsPage: React.FC = () => {
  const { t, i18n } = useSafeTranslation();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  
  // 設定データ
  const [userSettings, setUserSettings] = useState<UserSettings>({
    theme: 'system',
    language: 'ja',
  });
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  
  // ユーザー名編集
  const [userName, setUserName] = useState<string>('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
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

  const handleUserNameUpdate = async () => {
    if (!user?.id || !userName.trim()) return;
    
    try {
      setIsUpdatingProfile(true);
      setError(null);
      // TODO: SDKにユーザー名更新機能を追加したら実装
      // const response = await sdkClient.user.updateProfile(user.id, { name: userName.trim() });
      // if (response.data) {
      //   updateUser(response.data.user);
      // }
      console.log('ユーザー名更新:', userName.trim());
    } catch (err) {
      console.error('Failed to update user name:', err);
      setError('ユーザー名の更新に失敗しました');
    } finally {
      setIsUpdatingProfile(false);
    }
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

  // ユーザー名の初期値設定
  useEffect(() => {
    if (user?.email) {
      // TODO: ユーザー名フィールドがAPIで利用可能になったら user.name を使用
      setUserName(user.email.split('@')[0]);
    }
  }, [user?.email]);

  return (
    <Layout title="Lightlist - 設定" requireAuth>
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* ヘッダー - CLIENT.md仕様準拠 */}
        <div className="flex items-center h-12 mb-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            aria-label="ホームに戻る"
          >
            <Icon name="arrow-left" size={20} />
          </button>
          <h1 className="ml-4 text-lg font-semibold text-gray-900 dark:text-white">
            {t('settings.title')}
          </h1>
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

        <div className="space-y-8">
          {/* プロフィール設定 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {t('settings.profile')}
            </h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <label 
                  htmlFor="userName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 w-24 flex-shrink-0"
                >
                  {t('settings.userName')}
                </label>
                <Input
                  id="userName"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onBlur={handleUserNameUpdate}
                  disabled={isUpdatingProfile}
                  placeholder={t('settings.userNamePlaceholder')}
                  className="flex-1 ml-4"
                  aria-describedby="userName-description"
                />
              </div>
              <p id="userName-description" className="text-xs text-gray-500 dark:text-gray-400 ml-28">
                フォーカスを外すと自動的に保存されます
              </p>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>
          </section>

          {/* 表示設定 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {t('settings.displaySettings')}
            </h2>
            {isLoadingSettings ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 w-24 flex-shrink-0">
                    テーマ
                  </label>
                  <div className="flex-1 ml-4">
                    <select
                      id="theme-select"
                      value={userSettings.theme}
                      onChange={(e) => handleThemeChange(e.target.value)}
                      disabled={isSaving}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                      aria-label="テーマを選択"
                    >
                      <option value="system">{t('settings.themes.system')}</option>
                      <option value="light">{t('settings.themes.light')}</option>
                      <option value="dark">{t('settings.themes.dark')}</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 w-24 flex-shrink-0">
                    言語
                  </label>
                  <div className="flex-1 ml-4">
                    <select
                      id="language-select"
                      value={userSettings.language}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      disabled={isSaving}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                      aria-label="言語を選択"
                    >
                      <option value="ja">{t('settings.languages.ja')}</option>
                      <option value="en">{t('settings.languages.en')}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>
          </section>

          {/* タスク設定 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {t('settings.taskSettings')}
            </h2>
            {isLoadingApp ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
              </div>
            ) : appSettings ? (
              <div className="space-y-4">
                <div className="flex items-center">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 w-24 flex-shrink-0">
                    挿入位置
                  </label>
                  <div className="flex-1 ml-4">
                    <select
                      id="insert-position-select"
                      value={appSettings.taskInsertPosition}
                      onChange={(e) => handleTaskInsertPositionChange(e.target.value)}
                      disabled={isSaving}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                      aria-label="タスクの挿入位置を選択"
                    >
                      <option value="top">{t('settings.insertPositions.top')}</option>
                      <option value="bottom">{t('settings.insertPositions.bottom')}</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appSettings.autoSort}
                      onChange={(e) => handleAutoSortChange(e.target.checked)}
                      disabled={isSaving}
                      className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    <span className="ml-3 text-sm text-gray-900 dark:text-white">
                      {t('settings.autoSort')}
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                アプリ設定を読み込めませんでした
              </p>
            )}
            <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>
          </section>

          {/* アカウント */}
          <section>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {t('settings.account')}
            </h2>
            <div className="space-y-4">
              <Button
                variant="secondary"
                onClick={handleLogout}
                disabled={isSaving}
                icon="arrow-right-on-rectangle"
                iconPosition="left"
                className="w-full sm:w-auto"
              >
                {t('auth.logoutButton')}
              </Button>

              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving}
                icon="trash"
                iconPosition="left"
                className="w-full sm:w-auto text-red-600 border-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-900"
              >
                {t('settings.deleteAccount')}
              </Button>
            </div>
          </section>
        </div>

        {/* アカウント削除確認モーダル */}
        {showDeleteConfirm && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in"
            onClick={() => setShowDeleteConfirm(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowDeleteConfirm(false);
              }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
          >
            <div 
              className="max-w-md w-full mx-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-4">
                  <Icon name="exclamation-triangle" size={20} />
                  <h3 id="delete-confirm-title" className="text-lg font-semibold">{t('settings.deleteAccountConfirm')}</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {t('settings.deleteAccountDescription')}
                </p>
                <div className="flex space-x-4">
                  <Button
                    variant="secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1"
                    icon="x-mark"
                    iconPosition="left"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    className="flex-1"
                    icon="trash"
                    iconPosition="left"
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SettingsPage;

