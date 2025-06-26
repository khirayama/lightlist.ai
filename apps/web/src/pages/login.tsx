import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSafeTranslation } from '../hooks/useSafeTranslation';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Card, CardContent } from '../components';
// import { 
//   useFormValidation, 
//   createLocalizedSchema 
// } from '@lightlist/sdk';

const LoginPage: React.FC = () => {
  const { t } = useSafeTranslation();
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // バリデーションスキーマ（多言語対応）
  // const schema = createLocalizedSchema('login', 'ja');
  
  // バリデーションフック（一時的に無効化）
  // const {
  //   validateField,
  //   validateForm,
  //   getFieldError,
  //   isFieldValid,
  //   isFormValid,
  //   setFieldTouched,
  //   clearFieldError,
  // } = useFormValidation(schema);

  // 一時的なバリデーション関数
  const validateField = (name: string, value: any) => true;
  const validateForm = (data: any) => true;
  const getFieldError = (name: string) => null;
  const isFieldValid = (name: string) => true;
  const isFormValid = true;
  const setFieldTouched = (name: string, touched: boolean) => {};
  const clearFieldError = (name: string) => {};

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
      <div className="min-h-96 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <Card className="motion-safe:animate-fade-in">
            <CardContent>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {t('auth.loginButton')}
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  アカウントにサインインしてください
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-md motion-safe:animate-bounce-light">
                    <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                  </div>
                )}

                <Input
                  id="email"
                  name="email"
                  type="email"
                  label={t('auth.email')}
                  required
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
                  label={t('auth.password')}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder={t('auth.passwordPlaceholder')}
                  state={getFieldError('password') ? 'error' : 'normal'}
                  errorMessage={getFieldError('password') || undefined}
                />

                <div className="text-right">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
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
                >
                  {isLoading ? t('auth.loggingIn') : t('auth.loginButton')}
                </Button>

                <div className="text-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('auth.noAccount')}{' '}
                  </span>
                  <Link
                    href="/register"
                    className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors"
                  >
                    {t('auth.registerButton')}
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

export default LoginPage;

