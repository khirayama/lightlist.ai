import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/components/useColorScheme';
import { changeLanguage } from '../i18n';

// 設定の型定義
export type Theme = 'system' | 'light' | 'dark';
export type Language = 'ja' | 'en';
export type TaskInsertPosition = 'top' | 'bottom';

export interface UserSettings {
  theme: Theme;
  language: Language;
  taskInsertPosition: TaskInsertPosition;
  autoSort: boolean;
}

// デフォルト設定
const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  language: 'ja',
  taskInsertPosition: 'top',
  autoSort: false,
};

// ストレージキー
const SETTINGS_STORAGE_KEY = 'user_settings';

export const useSettings = () => {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const systemColorScheme = useColorScheme();

  // 設定をロード
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const savedSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      
      if (savedSettings) {
        const parsedSettings: UserSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
        
        // 言語設定を即座に反映
        await changeLanguage(parsedSettings.language);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 設定を保存
  const saveSettings = useCallback(async (newSettings: UserSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }, []);

  // 個別設定更新関数
  const updateTheme = useCallback(async (theme: Theme) => {
    const newSettings = { ...settings, theme };
    await saveSettings(newSettings);
  }, [settings, saveSettings]);

  const updateLanguage = useCallback(async (language: Language) => {
    const newSettings = { ...settings, language };
    await saveSettings(newSettings);
    // 言語設定を即座に反映
    await changeLanguage(language);
  }, [settings, saveSettings]);

  const updateTaskInsertPosition = useCallback(async (position: TaskInsertPosition) => {
    const newSettings = { ...settings, taskInsertPosition: position };
    await saveSettings(newSettings);
  }, [settings, saveSettings]);

  const updateAutoSort = useCallback(async (autoSort: boolean) => {
    const newSettings = { ...settings, autoSort };
    await saveSettings(newSettings);
  }, [settings, saveSettings]);

  // 初期化時に設定をロード
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 実際のテーマを計算（systemの場合はデバイステーマを返す）
  const effectiveTheme = settings.theme === 'system' ? systemColorScheme : settings.theme;

  return {
    settings,
    isLoading,
    effectiveTheme,
    updateTheme,
    updateLanguage,
    updateTaskInsertPosition,
    updateAutoSort,
    saveSettings,
    loadSettings,
  };
};