import { useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { useSDK } from './_app';
import type { AuthCredential, AppError } from '@lightlist/sdk';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { actions } = useSDK();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // メールアドレスの検証
    if (!formData.email) {
      newErrors.email = t('register.errors.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('register.errors.emailInvalid');
    }

    // パスワードの検証
    if (!formData.password) {
      newErrors.password = t('register.errors.passwordRequired');
    } else if (formData.password.length < 8) {
      newErrors.password = t('register.errors.passwordTooShort');
    }

    // パスワード確認の検証
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('register.errors.confirmPasswordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('register.errors.passwordMismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // SDK経由でユーザー登録
      const credential: AuthCredential = {
        email: formData.email,
        password: formData.password,
        deviceId: `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      const result = await actions.auth.register(credential);

      if (!result.success) {
        throw new Error(result.error?.message || t('register.errors.registrationFailed'));
      }

      // 登録成功時の処理（result.dataはApiResponseなので、result.data.dataでAuthSessionを取得）
      const authSession = (result.data as any)?.data;
      if (authSession?.accessToken) {
        localStorage.setItem('accessToken', authSession.accessToken);
        localStorage.setItem('refreshToken', authSession.refreshToken);
      }
      
      alert(t('register.success'));
      router.push('/login');
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : t('register.errors.registrationFailed')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // エラーをクリア
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <h1>{t('register.title')}</h1>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {errors.general && (
          <div style={{ 
            color: 'red', 
            padding: '10px', 
            backgroundColor: '#fee', 
            border: '1px solid #fcc',
            borderRadius: '4px'
          }}>
            {errors.general}
          </div>
        )}

        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            {t('register.email')}
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '10px',
              border: `1px solid ${errors.email ? 'red' : '#ccc'}`,
              borderRadius: '4px',
              fontSize: '16px'
            }}
            disabled={isLoading}
          />
          {errors.email && <div style={{ color: 'red', fontSize: '14px', marginTop: '5px' }}>{errors.email}</div>}
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            {t('register.password')}
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '10px',
              border: `1px solid ${errors.password ? 'red' : '#ccc'}`,
              borderRadius: '4px',
              fontSize: '16px'
            }}
            disabled={isLoading}
          />
          {errors.password && <div style={{ color: 'red', fontSize: '14px', marginTop: '5px' }}>{errors.password}</div>}
        </div>

        <div>
          <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            {t('register.confirmPassword')}
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '10px',
              border: `1px solid ${errors.confirmPassword ? 'red' : '#ccc'}`,
              borderRadius: '4px',
              fontSize: '16px'
            }}
            disabled={isLoading}
          />
          {errors.confirmPassword && <div style={{ color: 'red', fontSize: '14px', marginTop: '5px' }}>{errors.confirmPassword}</div>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: '12px',
            backgroundColor: isLoading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? t('register.submitting') : t('register.submit')}
        </button>
      </form>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <p>
          {t('register.hasAccount')}{' '}
          <a href="/login" style={{ color: '#007bff', textDecoration: 'none' }}>
            {t('register.loginLink')}
          </a>
        </p>
        <p>
          <a href="/" style={{ color: '#007bff', textDecoration: 'none' }}>
            {t('register.homeLink')}
          </a>
        </p>
      </div>
    </div>
  );
}