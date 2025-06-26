import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSafeTranslation } from '../hooks/useSafeTranslation';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Card, CardContent } from '../components';
// import { 
//   useFormValidation, 
//   createRegisterSchemaWithConfirmation,
//   createLocalizedSchema,
//   usePasswordStrength 
// } from '@lightlist/sdk';

const RegisterPage: React.FC = () => {
  const { t } = useSafeTranslation();
  const router = useRouter();
  const { register, isAuthenticated, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  // バリデーションスキーマ（多言語対応）
  // const baseSchema = createLocalizedSchema('register', 'ja');
  // const schema = createRegisterSchemaWithConfirmation(formData.password);
  
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

  // パスワード強度フック（一時的に無効化）
  // const { strength, checkStrength } = usePasswordStrength();
  const strength = { score: 0, level: 'weak' as const, suggestions: [] };
  const checkStrength = (password: string) => strength;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // リアルタイムバリデーション
    validateField(name, value);
    
    // パスワード強度チェック
    if (name === 'password') {
      checkStrength(value);
    }
    
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
      await register(formData.email, formData.password);
      router.push('/');
    } catch (err) {
      // エラーはAuthContextで管理される
      console.error('Registration error:', err);
    }
  };

  if (isAuthenticated) {
    router.push('/');
    return null;
  }

  return (
    <Layout title="Lightlist - ユーザー登録">
      <div className="min-h-96 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <Card className="motion-safe:animate-fade-in">
            <CardContent>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {t('auth.registerButton')}
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  新しいアカウントを作成してください
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

                <div>
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
                  
                  {/* パスワード強度表示 */}
                  {formData.password && (
                    <div className="mt-2">
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
                          className={`text-xs font-medium ${
                            strength.level === 'weak'
                              ? 'text-red-600 dark:text-red-400'
                              : strength.level === 'medium'
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-green-600 dark:text-green-400'
                          }`}
                        >
                          {strength.level === 'weak' ? '弱い' : strength.level === 'medium' ? '普通' : '強い'}
                        </span>
                      </div>
                      {strength.suggestions.length > 0 && (
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
                  label={t('auth.passwordConfirm')}
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder={t('auth.passwordConfirmPlaceholder')}
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
                >
                  {isLoading ? t('auth.registering') : t('auth.registerButton')}
                </Button>

                <div className="text-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('auth.alreadyHaveAccount')}{' '}
                  </span>
                  <Link
                    href="/login"
                    className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors"
                  >
                    {t('auth.loginButton')}
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

export default RegisterPage;

