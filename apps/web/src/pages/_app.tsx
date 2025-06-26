import type { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes';
import { I18nextProvider } from 'react-i18next';
import { AuthProvider } from '../contexts/AuthContext';
import { CollaborativeProvider } from '../contexts/CollaborativeContext';
import { OfflineProvider } from '../contexts/OfflineContext';
import { UndoProvider } from '../contexts/UndoContext';
import { UndoToast } from '../components/UndoToast';
import i18n from '../lib/i18n';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      disableTransitionOnChange={false}
    >
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <OfflineProvider>
            <UndoProvider>
              <CollaborativeProvider>
                <Component {...pageProps} />
                <UndoToast />
              </CollaborativeProvider>
            </UndoProvider>
          </OfflineProvider>
        </AuthProvider>
      </I18nextProvider>
    </ThemeProvider>
  );
}