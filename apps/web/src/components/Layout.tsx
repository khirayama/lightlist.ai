import React, { ReactNode, useEffect } from 'react';
import Head from 'next/head';
import { useTheme } from 'next-themes';
import { useAuth } from '../contexts/AuthContext';
import { useSafeTranslation } from '../hooks/useSafeTranslation';
import { useAuthGuard } from '../hooks/useAuthGuard';
import { OfflineIndicator } from './OfflineIndicator';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  requireAuth?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title = 'Lightlist',
  requireAuth = false 
}) => {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const { t, i18n, isClientMounted } = useSafeTranslation();
  const { shouldRender, isLoading, isRedirecting } = useAuthGuard(requireAuth);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ja' ? 'en' : 'ja';
    i18n.changeLanguage(newLang);
  };

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('dark');
    } else {
      setTheme('system');
    }
  };

  // 認証確認中のローディング表示
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // 認証が必要だが未認証の場合（リダイレクト中）
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">ログインページに移動中...</p>
        </div>
      </div>
    );
  }

  // 認証ガードで表示が許可されていない場合
  if (!shouldRender) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Head>
        <title>{title}</title>
        <meta name="description" content="Lightlist - タスク管理アプリケーション" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* スキップリンク - アクセシビリティ対応 */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-primary-500 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
      >
        メインコンテンツにスキップ
      </a>

      <header 
        className="bg-white dark:bg-gray-800 shadow-sm"
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                <a 
                  href="/"
                  className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
                  aria-label="Lightlist ホーム"
                >
                  Lightlist
                </a>
              </h1>
            </div>

            <nav 
              className="flex items-center space-x-4"
              role="navigation"
              aria-label="ユーザー設定とアカウント"
            >
              {isClientMounted && (
                <>
                  <button
                    onClick={toggleLanguage}
                    className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    aria-label={`言語を切り替え (現在: ${i18n.language === 'ja' ? '日本語' : 'English'})`}
                    title="言語を切り替え"
                  >
                    {i18n.language === 'ja' ? 'EN' : 'JA'}
                  </button>

                  <button
                    onClick={toggleTheme}
                    className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    aria-label={`テーマを切り替え (現在: ${
                      theme === 'system' ? 'システム' : theme === 'light' ? 'ライト' : 'ダーク'
                    })`}
                    title="テーマを切り替え"
                  >
                    <span role="img" aria-hidden="true">
                      {theme === 'system' ? '🖥️' : theme === 'light' ? '☀️' : '🌙'}
                    </span>
                  </button>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main 
        id="main-content"
        className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8"
        role="main"
        tabIndex={-1}
      >
        {children}
      </main>

      {/* <OfflineIndicator /> */}
    </div>
  );
};