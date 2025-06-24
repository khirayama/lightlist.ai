import type { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes';
import { useEffect } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import '../styles/globals.css';
import '../lib/i18n';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // i18nextの初期化確認
    const checkI18n = () => {
      if (typeof window !== 'undefined') {
        console.log('i18next initialized');
      }
    };
    checkI18n();
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      disableTransitionOnChange={false}
    >
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </ThemeProvider>
  );
}