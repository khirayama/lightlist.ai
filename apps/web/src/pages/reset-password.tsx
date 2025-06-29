import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSafeTranslation } from '../hooks/useSafeTranslation';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from '../components';
import { 
  useFormValidation, 
  createResetPasswordSchemaWithConfirmation,
  usePasswordStrength 
} from '@lightlist/sdk';

const ResetPasswordPage: React.FC = () => {
  const { t } = useSafeTranslation();
  const router = useRouter();
  const { login } = useAuth();
  const { token } = router.query;
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  // バリデーションスキーマ
  const schema = createResetPasswordSchemaWithConfirmation(formData.newPassword);
  
  // バリデーションフック
  const {
    validateField,
    validateForm,
    getFieldError,
    isFieldValid,
    isFormValid,
    setFieldTouched,
    clearFieldError,
  } = useFormValidation(schema);

  // パスワード強度フック
  const { strength, checkStrength } = usePasswordStrength();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // リアルタイムバリデーション
    validateField(name, value);
    
    // パスワード強度チェック
    if (name === 'newPassword') {
      checkStrength(value);
    }
    
    setError(null);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFieldTouched(name, true);
    validateField(name, value);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // フォーム全体のバリデーション
    const isValid = validateForm(formData);
    
    if (!isValid) {
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
      const response = await sdkClient.auth.resetPassword({
        token: token as string,
        newPassword: formData.newPassword,
      });
      
      // リセット成功後、自動ログインを実行
      if (response.data?.user?.email) {
        setUserEmail(response.data.user.email);
        await login(response.data.user.email, formData.newPassword);
        router.push('/');
      } else {
        // ユーザー情報が取得できない場合はログインページにリダイレクト
        router.push('/login?message=password-reset-success');
      }
    } catch (err: any) {
      setError(err?.message || 'パスワードのリセットに失敗しました');
      console.error('Reset password error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 無効なトークンの場合はパスワード忘れページにリダイレクト
  React.useEffect(() => {
    // ルーターが準備完了するまで待つ
    if (!router.isReady) {
      return;
    }
    
    // デバッグ情報
    console.log('Router ready, token:', token);
    
    // トークンが存在しない場合のみリダイレクト
    if (!token) {
      console.log('No token found, redirecting to forgot-password');
      router.replace('/forgot-password?error=invalid-token');
    }
  }, [router.isReady, token, router]);

  return (
    <Layout title="Lightlist - パスワードリセット">
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm px-4 md:px-6" style={{ maxWidth: '400px' }}>
          {/* ロゴ */}
          <div className="text-center mt-8 mb-6">
            <div className="inline-block text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center" style={{ width: '100px', height: '32px' }}>
              Lightlist
            </div>
          </div>

          {/* パスワードリセットタイトル */}
          <div className="text-center mb-4">
            <h1 id="reset-password-title" className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('auth.setNewPassword')}
            </h1>
          </div>

          {/* フォーム */}
          <form className="space-y-4" onSubmit={handleSubmit} role="form" aria-labelledby="reset-password-title">
            {error && (
              <div 
                className="p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-md motion-safe:animate-bounce-light"
                role="alert"
                aria-live="polite"
                aria-atomic="true"
              >
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                size="lg"
                label={t('auth.newPassword')}
                required
                aria-required="true"
                aria-describedby={getFieldError('newPassword') ? 'newPassword-error' : 'password-strength'}
                value={formData.newPassword}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder={t('auth.newPasswordPlaceholder')}
                state={getFieldError('newPassword') ? 'error' : 'normal'}
                errorMessage={getFieldError('newPassword') || undefined}
              />
                  
                  {/* パスワード強度表示 */}
                  {formData.newPassword && (
                    <div id="password-strength" className="mt-1" aria-live="polite">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              strength.level === 'weak'
                                ? 'bg-red-500 w-1/3'
                                : strength.level === 'medium'
                                ? 'bg-yellow-500 w-2/3'
                                : 'bg-green-500 w-full'
                            }`}
                          />
                        </div>
                        <span
                          className={`text-xs font-medium min-w-fit ${
                            strength.level === 'weak'
                              ? 'text-red-600 dark:text-red-400'
                              : strength.level === 'medium'
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-green-600 dark:text-green-400'
                          }`}
                        >
                          {strength.level === 'weak' ? t('auth.passwordStrengthWeak') : strength.level === 'medium' ? t('auth.passwordStrengthMedium') : t('auth.passwordStrengthStrong')}
                        </span>
                      </div>
                      {strength.suggestions && strength.suggestions.length > 0 && (
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          {strength.suggestions.join('、')}
                        </p>
                      )}
                    </div>
                  )}
            </div>

            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              size="lg"
              label={t('auth.confirmNewPassword')}
              required
              aria-required="true"
              aria-describedby={getFieldError('confirmPassword') ? 'confirmPassword-error' : undefined}
              value={formData.confirmPassword}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder={t('auth.confirmNewPasswordPlaceholder')}
              state={getFieldError('confirmPassword') ? 'error' : 'normal'}
              errorMessage={getFieldError('confirmPassword') || undefined}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading || !isFormValid}
              loading={isLoading}
              aria-describedby={!isFormValid ? 'form-validation-errors' : undefined}
            >
              {isLoading ? t('auth.resetingPassword') : t('auth.resetPasswordButton')}
            </Button>

            <div className="text-center">
              {/* @ts-ignore - temporary fix for React/Next.js type incompatibility */}
              <Link
                href="/login"
                className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors"
              >
                {t('auth.backToLogin')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default ResetPasswordPage;

