import { useTranslation } from 'react-i18next';
import { useState, useEffect, useMemo } from 'react';

export const useSafeTranslation = () => {
  const [isClientMounted, setIsClientMounted] = useState(false);
  
  // React Hooksの規則に従って、常にuseTranslationを呼び出す
  // エラーは内部的に処理し、外部に伝播させない
  const { t: originalT, i18n } = useTranslation('common', {
    useSuspense: false, // Suspenseを無効化してSSRエラーを回避
    bindI18n: 'languageChanged loaded',
  });

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  // 安全な翻訳関数をメモ化
  const safeT = useMemo(() => {
    return (key: string, options?: any): string => {
      try {
        // クライアント未マウントまたはi18n未初期化の場合はキーを返す
        if (!isClientMounted || !i18n?.isInitialized) {
          return key;
        }
        
        // 通常の翻訳を実行
        const result = originalT(key, options);
        return typeof result === 'string' ? result : key;
      } catch (error) {
        // エラー時はキーをそのまま返す（静かに失敗）
        return key;
      }
    };
  }, [isClientMounted, i18n?.isInitialized, originalT]);

  // 安全な言語変更関数をメモ化
  const safeChangeLanguage = useMemo(() => {
    return (lang: string): Promise<void> => {
      try {
        if (isClientMounted && i18n?.isInitialized && i18n?.changeLanguage) {
          return i18n.changeLanguage(lang).then(() => {});
        }
      } catch (error) {
        // エラーを静かに処理
      }
      return Promise.resolve();
    };
  }, [isClientMounted, i18n?.isInitialized, i18n?.changeLanguage]);

  // 安全なi18nオブジェクトをメモ化
  const safeI18n = useMemo(() => {
    return {
      // その他の必要なプロパティは元のi18nから継承
      ...i18n,
      language: i18n?.language || 'ja',
      isInitialized: i18n?.isInitialized || false,
      changeLanguage: safeChangeLanguage,
    };
  }, [i18n, safeChangeLanguage]);

  return {
    t: safeT,
    i18n: safeI18n,
    isClientMounted,
    isReady: isClientMounted && i18n?.isInitialized,
  };
};