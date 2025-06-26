import React from 'react';
import { useOffline } from '../contexts/OfflineContext';
// import { useSafeTranslation } from '../hooks/useSafeTranslation'; // 一時的にコメントアウト

interface OfflineIndicatorProps {
  className?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className = '' }) => {
  const { isOnline, hasQueuedOperations, getQueuedOperationsCount, syncQueuedOperations } = useOffline();
  // const { t } = useSafeTranslation(); // 一時的にコメントアウト

  if (isOnline && !hasQueuedOperations) {
    return null;
  }

  const queuedCount = getQueuedOperationsCount();

  return (
    <div 
      className={`fixed top-4 right-4 z-50 ${className}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {!isOnline ? (
        <div 
          className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2"
          role="alert"
          aria-label="接続状態"
        >
          <div 
            className="w-2 h-2 bg-white rounded-full"
            aria-hidden="true"
          ></div>
          <span className="text-sm font-medium">オフライン</span>
          {queuedCount > 0 && (
            <span 
              className="bg-red-600 text-xs px-2 py-1 rounded-full"
              aria-label={`${queuedCount}件の操作が待機中`}
            >
              {queuedCount}件待機中
            </span>
          )}
          <span className="sr-only">
            インターネット接続がありません。
            {queuedCount > 0 && `${queuedCount}件の操作がオンライン復帰時に実行されます。`}
          </span>
        </div>
      ) : hasQueuedOperations ? (
        <div 
          className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2"
          role="status"
          aria-label="同期状態"
        >
          <div 
            className="w-2 h-2 bg-white rounded-full animate-pulse"
            aria-hidden="true"
          ></div>
          <span className="text-sm font-medium">同期中</span>
          <span 
            className="bg-yellow-600 text-xs px-2 py-1 rounded-full"
            aria-label={`${queuedCount}件を同期中`}
          >
            {queuedCount}件
          </span>
          <button
            onClick={syncQueuedOperations}
            className="text-xs bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-yellow-500"
            aria-label={`${queuedCount}件の待機中操作を再試行`}
            title="同期を再試行"
          >
            再試行
          </button>
          <span className="sr-only">
            {queuedCount}件の操作を同期中です。問題がある場合は再試行ボタンを押してください。
          </span>
        </div>
      ) : null}
    </div>
  );
};