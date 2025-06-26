import React, { useEffect, useState } from 'react';
import { useUndo } from '../contexts/UndoContext';

export const UndoToast: React.FC = () => {
  const { pendingUndo, executeUndo, dismissUndo } = useUndo();
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    if (!pendingUndo) {
      setTimeLeft(5);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 初期値を設定
    setTimeLeft(5);

    return () => clearInterval(interval);
  }, [pendingUndo]);

  if (!pendingUndo) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-gray-900 text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-4 min-w-80">
        <div className="flex-1">
          <p className="text-sm font-medium">{pendingUndo.description}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={executeUndo}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
          >
            元に戻す
          </button>
          
          <button
            onClick={dismissUndo}
            className="px-2 py-2 text-gray-400 hover:text-white transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="text-xs text-gray-400 min-w-0">
          {timeLeft}秒
        </div>
      </div>
    </div>
  );
};