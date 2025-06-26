import { useCallback, useEffect, useRef } from 'react';

interface AutoSaveOptions {
  key: string;
  delay?: number; // デバウンス遅延（ミリ秒）
  onSave?: (data: any) => Promise<void>;
  onRestore?: (data: any) => void;
}

export const useAutoSave = <T>(
  data: T,
  options: AutoSaveOptions
) => {
  const { key, delay = 1000, onSave, onRestore } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataRef = useRef<T>(data);

  // データをローカルストレージに保存
  const saveToStorage = useCallback((saveData: T) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(key, JSON.stringify(saveData));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, [key]);

  // ローカルストレージからデータを復元
  const restoreFromStorage = useCallback((): T | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored) as T;
      }
    } catch (error) {
      console.error('Failed to restore from localStorage:', error);
    }
    return null;
  }, [key]);

  // 保存されたデータをクリア
  const clearSavedData = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear saved data:', error);
    }
  }, [key]);

  // 自動保存の実行
  const executeAutoSave = useCallback(async (saveData: T) => {
    saveToStorage(saveData);
    
    if (onSave) {
      try {
        await onSave(saveData);
        // 保存が成功したらローカルストレージからクリア
        clearSavedData();
      } catch (error) {
        console.error('Auto-save failed:', error);
        // 保存が失敗した場合はローカルストレージに残す
      }
    }
  }, [saveToStorage, clearSavedData, onSave]);

  // データが変更されたときの自動保存
  useEffect(() => {
    // 初回は除外
    if (previousDataRef.current === data) {
      return;
    }

    // 既存のタイマーをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // デバウンス付きで自動保存を実行
    timeoutRef.current = setTimeout(() => {
      executeAutoSave(data);
    }, delay);

    previousDataRef.current = data;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, executeAutoSave]);

  // 初期化時にデータを復元
  useEffect(() => {
    const restored = restoreFromStorage();
    if (restored && onRestore) {
      onRestore(restored);
    }
  }, [restoreFromStorage, onRestore]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    saveToStorage,
    restoreFromStorage,
    clearSavedData,
    executeSave: () => executeAutoSave(data),
  };
};