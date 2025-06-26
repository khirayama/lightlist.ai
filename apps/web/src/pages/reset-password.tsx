import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSafeTranslation } from '../hooks/useSafeTranslation';
import { Layout } from '../components/Layout';
import { Card, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Icon } from '../components/Icon';

const ResetPasswordPage: React.FC = () => {
  const { t } = useSafeTranslation();
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
      const { sdkClient } = await import('../lib/sdk-client');
      await sdkClient.auth.resetPassword({
        token: token as string,
        newPassword: formData.newPassword,
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'パスワードのリセットに失敗しました');
      console.error('Reset password error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Layout title="Lightlist - パスワードリセット完了">
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md animate-fade-in">
            <Card className="shadow-xl">
              <CardContent className="p-8 text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <Icon
                      name="success"
                      className="w-8 h-8 text-green-600 dark:text-green-400"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    パスワードをリセットしました
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    新しいパスワードでログインできます
                  </p>
                </div>
                <Link
                  href="/login"
                  className="w-full inline-flex items-center justify-center px-6 py-3 bg-primary-500 text-white font-medium text-base rounded-lg hover:bg-primary-400 active:bg-primary-600 transition-all duration-150 ease-out motion-safe:hover:shadow-lg motion-safe:active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  ログインページに移動
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Lightlist - パスワードリセット">
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md animate-fade-in">
          <Card className="shadow-xl">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                    <Icon
                      name="key"
                      className="w-8 h-8 text-primary-600 dark:text-primary-400"
                    />
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  新しいパスワードを設定
                </h1>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  新しいパスワードを入力してください
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Icon
                        name="exclamation-triangle"
                        className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0"
                      />
                      <p className="text-red-700 dark:text-red-300 text-sm font-medium">
                        {error}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('auth.newPassword')}
                  </label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    required
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    placeholder="新しいパスワードを入力"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('auth.confirmNewPassword')}
                  </label>
                  <Input
                    id="confirmNewPassword"
                    name="confirmNewPassword"
                    type="password"
                    required
                    value={formData.confirmNewPassword}
                    onChange={handleInputChange}
                    placeholder="新しいパスワードを再入力"
                    className="w-full"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t('auth.resetingPassword')}</span>
                    </div>
                  ) : (
                    'パスワードをリセット'
                  )}
                </Button>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors"
                  >
                    ログインページに戻る
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ResetPasswordPage;

