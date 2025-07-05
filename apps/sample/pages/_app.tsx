import type { AppProps } from 'next/app';
import { createContext, useContext, useMemo } from 'react';
import { createSDK } from '@lightlist/sdk';
import '../lib/i18n';

// SDK Context
const SDKContext = createContext<ReturnType<typeof createSDK> | null>(null);

export function useSDK() {
  const sdk = useContext(SDKContext);
  if (!sdk) {
    throw new Error('useSDK must be used within SDKProvider');
  }
  return sdk;
}

export default function App({ Component, pageProps }: AppProps) {
  const sdk = useMemo(() => {
    return createSDK({
      apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      apiTimeout: 10000
    });
  }, []);

  return (
    <SDKContext.Provider value={sdk}>
      <Component {...pageProps} />
    </SDKContext.Provider>
  );
}