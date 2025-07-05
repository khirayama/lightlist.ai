import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ja: {
    translation: {
      'register': {
        'title': 'ユーザー登録',
        'email': 'メールアドレス',
        'password': 'パスワード',
        'confirmPassword': 'パスワード確認',
        'submit': 'ユーザー登録',
        'submitting': '登録中...',
        'success': 'ユーザー登録が完了しました',
        'hasAccount': 'すでにアカウントをお持ちですか？',
        'loginLink': 'ログイン',
        'homeLink': 'ホームに戻る',
        'errors': {
          'emailRequired': 'メールアドレスを入力してください',
          'emailInvalid': '有効なメールアドレスを入力してください',
          'passwordRequired': 'パスワードを入力してください',
          'passwordTooShort': 'パスワードは8文字以上で入力してください',
          'confirmPasswordRequired': 'パスワード確認を入力してください',
          'passwordMismatch': 'パスワードが一致しません',
          'registrationFailed': 'ユーザー登録に失敗しました'
        }
      },
      'login': {
        'title': 'ログイン',
        'email': 'メールアドレス',
        'password': 'パスワード',
        'submit': 'ログイン',
        'submitting': 'ログイン中...',
        'success': 'ログインしました',
        'noAccount': 'アカウントをお持ちでないですか？',
        'registerLink': 'ユーザー登録',
        'forgotPasswordLink': 'パスワードを忘れた方',
        'homeLink': 'ホームに戻る',
        'errors': {
          'emailRequired': 'メールアドレスを入力してください',
          'emailInvalid': '有効なメールアドレスを入力してください',
          'passwordRequired': 'パスワードを入力してください',
          'loginFailed': 'ログインに失敗しました'
        }
      }
    }
  },
  en: {
    translation: {
      'register': {
        'title': 'User Registration',
        'email': 'Email Address',
        'password': 'Password',
        'confirmPassword': 'Confirm Password',
        'submit': 'Register',
        'submitting': 'Registering...',
        'success': 'User registration completed successfully',
        'hasAccount': 'Already have an account?',
        'loginLink': 'Login',
        'homeLink': 'Back to Home',
        'errors': {
          'emailRequired': 'Please enter your email address',
          'emailInvalid': 'Please enter a valid email address',
          'passwordRequired': 'Please enter your password',
          'passwordTooShort': 'Password must be at least 8 characters long',
          'confirmPasswordRequired': 'Please confirm your password',
          'passwordMismatch': 'Passwords do not match',
          'registrationFailed': 'User registration failed'
        }
      },
      'login': {
        'title': 'Login',
        'email': 'Email Address',
        'password': 'Password',
        'submit': 'Login',
        'submitting': 'Logging in...',
        'success': 'Login successful',
        'noAccount': 'Don\'t have an account?',
        'registerLink': 'Register',
        'forgotPasswordLink': 'Forgot password?',
        'homeLink': 'Back to Home',
        'errors': {
          'emailRequired': 'Please enter your email address',
          'emailInvalid': 'Please enter a valid email address',
          'passwordRequired': 'Please enter your password',
          'loginFailed': 'Login failed'
        }
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ja', // デフォルト言語
    fallbackLng: 'ja',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;