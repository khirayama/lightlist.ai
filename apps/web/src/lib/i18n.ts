import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from '../locales/en/common.json';
import jaCommon from '../locales/ja/common.json';

const resources = {
  en: {
    common: enCommon,
  },
  ja: {
    common: jaCommon,
  },
};

const isServer = typeof window === 'undefined';

// サーバー側では固定の言語を使用、クライアント側では検出機能を使用
if (!isServer) {
  i18n.use(LanguageDetector);
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ja',
    lng: isServer ? 'ja' : undefined, // サーバー側では明示的に日本語を設定
    defaultNS: 'common',
    
    interpolation: {
      escapeValue: false,
    },
    
    // クライアント側でのみ言語検出を有効化
    detection: isServer ? undefined : {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    
    // SSRでのhydrationエラーを防ぐ
    react: {
      useSuspense: false,
    },
  });

export default i18n;