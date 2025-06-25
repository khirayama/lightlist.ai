import React, { ReactNode, useState, useEffect } from 'react';
import Head from 'next/head';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { useAuth } from '../contexts/AuthContext';

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
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, logout } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  // TODO: Implement proper auth guard
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">認証が必要です</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Head>
        <title>{title}</title>
        <meta name="description" content="Lightlist - タスク管理アプリケーション" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Lightlist
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {isMounted && (
                <>
                  <button
                    onClick={toggleLanguage}
                    className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {i18n.language === 'ja' ? 'EN' : 'JA'}
                  </button>

                  <button
                    onClick={toggleTheme}
                    className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {theme === 'system' ? '🖥️' : theme === 'light' ? '☀️' : '🌙'}
                  </button>

                  {isAuthenticated && (
                    <button
                      onClick={logout}
                      className="px-3 py-1 rounded-md bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                    >
                      {t('auth.logoutButton')}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};