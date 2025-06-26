import React, { memo } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  isGenerating: boolean;
  shareLink: string | null;
  error: string | null;
  onCopyLink: () => void;
  onDeleteLink: () => void;
  onClose: () => void;
  onRetry: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = memo(({
  isOpen,
  isGenerating,
  shareLink,
  error,
  onCopyLink,
  onDeleteLink,
  onClose,
  onRetry,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      aria-describedby="share-modal-description"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 
          id="share-modal-title"
          className="text-lg font-semibold text-gray-900 dark:text-white mb-4"
        >
          タスクリストを共有
        </h2>
        
        {isGenerating ? (
          <div 
            className="flex items-center justify-center py-8"
            role="status"
            aria-live="polite"
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mr-4"></div>
            <span className="text-gray-600 dark:text-gray-400">共有リンクを生成中...</span>
          </div>
        ) : shareLink ? (
          <div 
            className="space-y-4"
            id="share-modal-description"
          >
            <div>
              <label 
                htmlFor="share-link-input"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                共有リンク
              </label>
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <input
                  id="share-link-input"
                  type="text"
                  value={shareLink}
                  readOnly
                  className="w-full bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none"
                  aria-describedby="share-link-description"
                />
              </div>
              <div id="share-link-description" className="sr-only">
                このリンクを共有することで、他のユーザーがタスクリストを閲覧できます
              </div>
            </div>
            
            <div className="space-y-2">
              <button 
                onClick={onCopyLink}
                className="w-full py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-describedby="copy-button-hint"
              >
                リンクをコピー
              </button>
              <div id="copy-button-hint" className="sr-only">
                共有リンクをクリップボードにコピーします
              </div>
              
              <button 
                onClick={onDeleteLink}
                className="w-full py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-describedby="delete-button-hint"
              >
                共有を解除
              </button>
              <div id="delete-button-hint" className="sr-only">
                共有リンクを削除し、共有を停止します
              </div>
            </div>
          </div>
        ) : (
          <div 
            className="py-8 text-center"
            id="share-modal-description"
            role="status"
          >
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error || '共有リンクの生成に失敗しました'}
            </p>
            <button 
              onClick={onRetry}
              className="py-2 px-4 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              再試行
            </button>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            aria-label="モーダルを閉じる"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
});

ShareModal.displayName = 'ShareModal';