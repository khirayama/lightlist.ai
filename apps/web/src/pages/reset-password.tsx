import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { Layout } from '../components/Layout';

const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { token } = router.query;
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmNewPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (formData.newPassword !== formData.confirmNewPassword) {
      setError('パスワードが一致しません');
      return false;
    }
    if (formData.newPassword.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    if (!token) {
      setError('無効なリセットトークンです');
      setIsLoading(false);
      return;
    }

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSuccess(true);
    } catch (err) {
      setError('パスワードのリセットに失敗しました');
      console.error('Reset password error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Layout title="Lightlist - パスワードリセット完了">
        <div className="min-h-96 flex items-center justify-center px-4">
          <div className="max-w-md w-full space-y-8 text-center">
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              パスワードをリセットしました
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              新しいパスワードでログインできます
            </p>
            <Link
              href="/login"
              className="inline-block px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
            >
              ログインページに移動
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Lightlist - パスワードリセット">
      <div className="min-h-96 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              新しいパスワードを設定
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              新しいパスワードを入力してください
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-md">
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.newPassword')}
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="新しいパスワードを入力"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.confirmNewPassword')}
              </label>
              <input
                id="confirmNewPassword"
                name="confirmNewPassword"
                type="password"
                required
                value={formData.confirmNewPassword}
                onChange={handleInputChange}
                placeholder="新しいパスワードを再入力"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? t('auth.resetingPassword') : 'パスワードをリセット'}
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

export default ResetPasswordPage;