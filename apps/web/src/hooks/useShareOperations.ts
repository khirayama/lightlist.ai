import { useState, useCallback } from 'react';
import { sdkClient } from '../lib/sdk-client';

export const useShareOperations = () => {
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateShareLink = useCallback(async (taskListId: string) => {
    setIsGeneratingShare(true);
    setError(null);
    
    try {
      const response = await sdkClient.share.createShareLink(taskListId);
      if (response.data) {
        setShareLink(response.data.shareUrl);
        return response.data.shareUrl;
      }
    } catch (err) {
      console.error('Failed to create share link:', err);
      setError('共有リンクの生成に失敗しました');
      throw err;
    } finally {
      setIsGeneratingShare(false);
    }
  }, []);

  const copyShareLink = useCallback(async (link?: string) => {
    const linkToCopy = link || shareLink;
    if (!linkToCopy) return;
    
    try {
      await navigator.clipboard.writeText(linkToCopy);
      return true;
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setError('リンクのコピーに失敗しました');
      return false;
    }
  }, [shareLink]);

  const deleteShareLink = useCallback(async (taskListId: string) => {
    if (window.confirm('共有リンクを削除しますか？')) {
      try {
        setError(null);
        await sdkClient.share.deleteShareLink(taskListId);
        setShareLink(null);
        return true;
      } catch (err) {
        console.error('Failed to delete share link:', err);
        setError('共有リンクの削除に失敗しました');
        return false;
      }
    }
    return false;
  }, []);

  const clearShareState = useCallback(() => {
    setShareLink(null);
    setIsGeneratingShare(false);
    setError(null);
  }, []);

  return {
    shareLink,
    isGeneratingShare,
    error,
    generateShareLink,
    copyShareLink,
    deleteShareLink,
    clearShareState,
  };
};