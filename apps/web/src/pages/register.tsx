import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSafeTranslation } from '../hooks/useSafeTranslation';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from '../components';
import { 
  useFormValidation, 
  createRegisterSchemaWithConfirmation,
  usePasswordStrength 
} from '@lightlist/sdk';

const RegisterPage: React.FC = () => {
  const { t } = useSafeTranslation();
  const router = useRouter();
  const { register, isAuthenticated, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  // バリデーションスキーマ
  const schema = createRegisterSchemaWithConfirmation(formData.password);
  
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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm px-4 md:px-6" style={{ maxWidth: '400px' }}>
          {/* ロゴ */}
          <div className="text-center mt-8 mb-6">
            <div className="inline-block text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center" style={{ width: '100px', height: '32px' }}>
              Lightlist
            </div>
          </div>

          {/* ユーザー登録タイトル */}
          <div className="text-center mb-4">
            <h1 id="register-title" className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('auth.registerButton')}
            </h1>
          </div>

          {/* フォーム */}
          <form className="space-y-4" onSubmit={handleSubmit} role="form" aria-labelledby="register-title">
                {error && (
                  <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-md motion-safe:animate-bounce-light">
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

                <div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    size="lg"
                    label={t('auth.password')}
                    required
                    aria-required="true"
                    aria-describedby={getFieldError('password') ? 'password-error' : 'password-strength'}
                    value={formData.password}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder={t('auth.passwordPlaceholder')}
                    state={getFieldError('password') ? 'error' : 'normal'}
                    errorMessage={getFieldError('password') || undefined}
                  />
                  
                  {/* パスワード強度表示 */}
                  {formData.password && (
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
                  label={t('auth.passwordConfirm')}
                  required
                  aria-required="true"
                  aria-describedby={getFieldError('confirmPassword') ? 'confirm-password-error' : undefined}
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
                  aria-describedby={!isFormValid ? 'form-validation-errors' : undefined}
                >
                  {isLoading ? t('auth.registering') : t('auth.registerButton')}
                </Button>

                <div className="text-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('auth.alreadyHaveAccount')}{' '}
                  </span>
                  {/* @ts-ignore - temporary fix for React/Next.js type incompatibility */}
                  <Link
                    href="/login"
                    className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors"
                  >
                    {t('auth.loginButton')}
                  </Link>
                </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default RegisterPage;

