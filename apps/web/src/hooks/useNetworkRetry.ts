import { useCallback, useRef } from 'react';

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number; // ベース遅延時間（ミリ秒）
  backoffFactor?: number; // 指数バックオフの係数
  onRetry?: (attempt: number, error: Error) => void;
  onMaxRetriesReached?: (error: Error) => void;
}

interface RetryState {
  attempt: number;
  isRetrying: boolean;
}

export const useNetworkRetry = (options: RetryOptions = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    backoffFactor = 2,
    onRetry,
    onMaxRetriesReached,
  } = options;

  const retryStateRef = useRef<Map<string, RetryState>>(new Map());

  // 指数バックオフによる遅延時間計算
  const calculateDelay = useCallback((attempt: number): number => {
    return baseDelay * Math.pow(backoffFactor, attempt - 1);
  }, [baseDelay, backoffFactor]);

  // ネットワークエラーかどうかを判定
  const isNetworkError = useCallback((error: any): boolean => {
    // 一般的なネットワークエラーの判定
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true;
    }
    
    // APIクライアントエラーの場合
    if (error.statusCode === 0) {
      return true;
    }
    
    // 5xx系エラーもリトライ対象とする
    if (error.statusCode >= 500) {
      return true;
    }
    
    return false;
  }, []);

  // リトライ実行
  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    operationId?: string
  ): Promise<T> => {
    const id = operationId || `operation-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // リトライ状態を初期化
    retryStateRef.current.set(id, { attempt: 0, isRetrying: false });

    const attempt = async (): Promise<T> => {
      const state = retryStateRef.current.get(id)!;
      state.attempt += 1;

      try {
        const result = await operation();
        // 成功した場合はリトライ状態をクリア
        retryStateRef.current.delete(id);
        return result;
      } catch (error) {
        console.error(`Operation failed (attempt ${state.attempt}):`, error);

        // ネットワークエラーでない場合はリトライしない
        if (!isNetworkError(error)) {
          retryStateRef.current.delete(id);
          throw error;
        }

        // 最大リトライ回数に達した場合
        if (state.attempt >= maxRetries) {
          retryStateRef.current.delete(id);
          if (onMaxRetriesReached) {
            onMaxRetriesReached(error as Error);
          }
          throw error;
        }

        // リトライ実行
        state.isRetrying = true;
        const delay = calculateDelay(state.attempt);
        
        if (onRetry) {
          onRetry(state.attempt, error as Error);
        }

        console.log(`Retrying in ${delay}ms... (attempt ${state.attempt + 1}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        state.isRetrying = false;
        return attempt();
      }
    };

    return attempt();
  }, [maxRetries, calculateDelay, isNetworkError, onRetry, onMaxRetriesReached]);

  // リトライ状態を取得
  const getRetryState = useCallback((operationId: string): RetryState | null => {
    return retryStateRef.current.get(operationId) || null;
  }, []);

  // リトライをキャンセル
  const cancelRetry = useCallback((operationId: string): void => {
    retryStateRef.current.delete(operationId);
  }, []);

  // 全てのリトライをクリア
  const clearAllRetries = useCallback((): void => {
    retryStateRef.current.clear();
  }, []);

  return {
    executeWithRetry,
    getRetryState,
    cancelRetry,
    clearAllRetries,
  };
};