import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 翻訳リソース
import ja from './locales/ja.json';
import en from './locales/en.json';

const LANGUAGE_STORAGE_KEY = 'user_language';

// AsyncStorageプラグイン
const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      // まずAsyncStorageから保存された言語を取得
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage) {
        callback(savedLanguage);
        return;
      }
      
      // 保存された言語がない場合はデバイスの言語を取得
      const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'ja';
      const supportedLanguage = ['ja', 'en'].includes(deviceLanguage) ? deviceLanguage : 'ja';
      callback(supportedLanguage);
    } catch (error) {
      console.error('Error detecting language:', error);
      callback('ja');
    }
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ja: {
        translation: ja,
      },
      en: {
        translation: en,
      },
    },
    fallbackLng: 'ja',
    debug: __DEV__,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;

// 言語変更用のヘルパー関数
export const changeLanguage = async (language: string) => {
  try {
    await i18n.changeLanguage(language);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.error('Error changing language:', error);
  }
};

// サポートされている言語
export const supportedLanguages = ['ja', 'en'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];