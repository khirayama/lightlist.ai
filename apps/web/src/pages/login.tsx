import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSafeTranslation } from '../hooks/useSafeTranslation';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from '../components';
import { 
  useFormValidation, 
  createLocalizedSchema
} from '@lightlist/sdk';

const LoginPage: React.FC = () => {
  const { t, i18n } = useSafeTranslation();
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // バリデーションスキーマ（現在の言語に対応）
  const currentLanguage = i18n.language === 'en' ? 'en' : 'ja';
  const schema = createLocalizedSchema('login', currentLanguage);
  
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // リアルタイムバリデーション
    validateField(name, value);
    
    // AuthContextのエラーをクリア
    if (error) {
      clearError();
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

    try {
      await login(formData.email, formData.password);
      router.push('/');
    } catch (err) {
      // エラーはAuthContextで管理される
      console.error('Login error:', err);
    }
  };

  if (isAuthenticated) {
    router.push('/');
    return null;
  }

  return (
    <Layout title="Lightlist - ログイン">
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm px-4 md:px-6" style={{ maxWidth: '400px' }}>
          {/* ロゴ */}
          <div className="text-center mt-8 mb-6">
            <div className="inline-block text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center" style={{ width: '100px', height: '32px' }}>
              Lightlist
            </div>
          </div>

          {/* ログインタイトル */}
          <div className="text-center mb-4">
            <h1 id="login-title" className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('auth.loginButton')}
            </h1>
          </div>

          {/* フォーム */}
          <form className="space-y-4" onSubmit={handleSubmit} role="form" aria-labelledby="login-title">
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

            <Input
              id="password"
              name="password"
              type="password"
              size="lg"
              label={t('auth.password')}
              required
              aria-required="true"
              aria-describedby={getFieldError('password') ? 'password-error' : undefined}
              value={formData.password}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder={t('auth.passwordPlaceholder')}
              state={getFieldError('password') ? 'error' : 'normal'}
              errorMessage={getFieldError('password') || undefined}
            />

            {/* パスワード忘れリンク */}
            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors text-sm"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading || !isFormValid}
              loading={isLoading}
              aria-describedby={!isFormValid ? 'form-validation-errors' : undefined}
            >
              {isLoading ? t('auth.loggingIn') : t('auth.loginButton')}
            </Button>

            <div className="text-center">
              <span className="text-gray-600 dark:text-gray-400">
                {t('auth.noAccount')}{' '}
              </span>
              {/* @ts-ignore - temporary fix for React/Next.js type incompatibility */}
              <Link
                href="/register"
                className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors"
              >
                {t('auth.registerButton')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default LoginPage;

