import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { Layout } from '../components/Layout';

const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSuccess(true);
    } catch (err) {
      setError(t('common.error'));
      console.error('Forgot password error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Layout title="Lightlist - パスワードリセット">
        <div className="min-h-96 flex items-center justify-center px-4">
          <div className="max-w-md w-full space-y-8 text-center">
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              メールを送信しました
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              パスワードリセットのリンクを {email} に送信しました。
              メールボックスをご確認ください。
            </p>
            <Link
              href="/login"
              className="inline-block px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
            >
              ログインページに戻る
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Lightlist - パスワード忘れ">
      <div className="min-h-96 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              パスワードを忘れた場合
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              メールアドレスを入力すると、パスワードリセットのリンクをお送りします
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-md">
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder={t('auth.emailPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? t('auth.resetingPassword') : t('auth.sendResetEmail')}
            </button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
              >
                ログインページに戻る
              </Link>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default ForgotPasswordPage;