import React, { useState } from 'react';
import Link from 'next/link';
import { useSafeTranslation } from '../hooks/useSafeTranslation';
import { Layout } from '../components/Layout';
import { Button, Input } from '../components';
import { sdkClient } from '../lib/sdk-client';
import { 
  useFormValidation, 
  createLocalizedSchema
} from '@lightlist/sdk';

const ForgotPasswordPage: React.FC = () => {
  const { t, i18n } = useSafeTranslation();
  const [formData, setFormData] = useState({
    email: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSentTime, setLastSentTime] = useState<number | null>(null);

  // バリデーションスキーマ（現在の言語に対応）
  const currentLanguage = i18n.language === 'en' ? 'en' : 'ja';
  const schema = createLocalizedSchema('forgotPassword', currentLanguage);
  
  // バリデーションフック
  const {
    validateField,
    validateForm,
    getFieldError,
    isFormValid,
    setFieldTouched,
  } = useFormValidation(schema);

  // 連続送信制限チェック（5分間）
  const canSendEmail = (): boolean => {
    if (!lastSentTime) return true;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return lastSentTime < fiveMinutesAgo;
  };

  // 残り時間を計算（秒）
  const getRemainingTime = (): number => {
    if (!lastSentTime) return 0;
    const elapsed = Date.now() - lastSentTime;
    const fiveMinutes = 5 * 60 * 1000;
    return Math.max(0, Math.ceil((fiveMinutes - elapsed) / 1000));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // リアルタイムバリデーション
    validateField(name, value);
    
    // エラーをクリア
    if (error) {
      setError(null);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFieldTouched(name, true);
    validateField(name, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // フォーム全体のバリデーション
    const isValid = validateForm(formData);
    
    if (!isValid) {
      return;
    }

    // 連続送信制限チェック
    if (!canSendEmail()) {
      const remainingTime = getRemainingTime();
      const minutes = Math.floor(remainingTime / 60);
      const seconds = remainingTime % 60;
      setError(t('auth.forgotPasswordRateLimit', { 
        time: minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒` 
      }));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      await sdkClient.auth.forgotPassword({
        email: formData.email,
      });

      // 成功メッセージを表示（セキュリティ上、未登録でも成功として表示）
      setSuccessMessage(t('auth.forgotPasswordSuccess'));
      setLastSentTime(Date.now());
      
      // フォームをリセット
      setFormData({ email: '' });
    } catch (err) {
      console.error('Forgot password error:', err);
      const errorMessage = err instanceof Error ? err.message : t('auth.forgotPasswordError');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
            <h1 id="forgot-password-title" className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('auth.passwordReset')}
            </h1>
          </div>

          {/* 説明文 */}
          <div className="text-center mb-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {t('auth.forgotPasswordDescription')}
            </p>
          </div>

          {/* フォーム */}
          <form className="space-y-4" onSubmit={handleSubmit} role="form" aria-labelledby="forgot-password-title">
            {/* 成功メッセージ */}
            {successMessage && (
              <div 
                className="p-3 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-md"
                role="alert"
                aria-live="polite"
                aria-atomic="true"
              >
                <p className="text-green-700 dark:text-green-300 text-sm">{successMessage}</p>
              </div>
            )}

            {/* エラーメッセージ */}
            {error && (
              <div 
                className="p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-md"
                role="alert"
                aria-live="polite"
                aria-atomic="true"
              >
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            <Input
              id="email"
              name="email"
              type="email"
              size="lg"
              label={t('auth.email')}
              required
              aria-required="true"
              aria-describedby={getFieldError('email') ? 'email-error' : undefined}
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder={t('auth.emailPlaceholder')}
              state={getFieldError('email') ? 'error' : 'normal'}
              errorMessage={getFieldError('email') || undefined}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading || !isFormValid || !canSendEmail()}
              loading={isLoading}
              aria-describedby={!isFormValid ? 'form-validation-errors' : undefined}
            >
              {isLoading ? t('auth.sending') : t('auth.sendButton')}
            </Button>

            {/* 連続送信制限の表示 */}
            {!canSendEmail() && (
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {t('auth.forgotPasswordWait', { 
                    time: Math.floor(getRemainingTime() / 60) > 0 
                      ? `${Math.floor(getRemainingTime() / 60)}分${getRemainingTime() % 60}秒`
                      : `${getRemainingTime()}秒`
                  })}
                </p>
              </div>
            )}

            <div className="text-center">
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

export default ForgotPasswordPage;

