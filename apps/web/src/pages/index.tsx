import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import type { TaskList, Task, AppSettings } from '@lightlist/sdk';
import { useAuth } from '../contexts/AuthContext';
import { useSafeTranslation } from '../hooks/useSafeTranslation';
import { useAuthGuard } from '../hooks/useAuthGuard';
import { useTaskListOperations } from '../hooks/useTaskListOperations';
import { useTaskOperations } from '../hooks/useTaskOperations';
import { useModalState } from '../hooks/useModalState';
import { useShareOperations } from '../hooks/useShareOperations';
import { useTaskListCarousel } from '../hooks/useTaskListCarousel';
import { TaskListDrawer } from '../components/TaskListDrawer';
import { TaskListCarousel } from '../components/TaskListCarousel';
import { ShareModal } from '../components/ShareModal';
import { ColorPicker } from '../components/ColorPicker';
import { sdkClient } from '../lib/sdk-client';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useSafeTranslation();
  
  // 認証ガード - 未認証時は自動でログインページへリダイレクト
  const { shouldRender, isLoading } = useAuthGuard(true);

  // 基本的な状態管理
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [isLoadingAppSettings, setIsLoadingAppSettings] = useState(false);

  // 基本的な状態（モーダル状態はuseModalStateで管理）
  const [newTaskText, setNewTaskText] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // カルーセル機能フック
  const {
    currentTaskListIndex,
    goToTaskList,
    selectTaskList,
    scrollContainerRef,
    scrollToIndex,
  } = useTaskListCarousel({
    taskLists,
    selectedTaskListId,
    setSelectedTaskListId,
  });

  // レスポンシブ判定
  const [isMobile, setIsMobile] = useState(false);

  // タスクリスト操作フック
  const {
    isLoadingTaskLists,
    fetchTaskLists,
    createTaskList,
    updateTaskListName,
    updateTaskListBackground,
    deleteTaskList,
  } = useTaskListOperations({ user, taskLists, setTaskLists, setError });

  // タスク操作フック
  const {
    isLoadingTasks,
    fetchTasks,
    addTask,
    toggleTask,
    deleteTask,
    deleteCompletedTasks,
    sortTasks,
    updateTaskText,
    setTaskDate,
    reorderTasks,
  } = useTaskOperations({ 
    tasks, 
    setTasks, 
    setError,
    autoSort: appSettings?.autoSort || false
  });

  // モーダル状態管理フック
  const {
    isAddTaskListModalOpen,
    newListName,
    setNewListName,
    openAddTaskListModal,
    closeAddTaskListModal,
    isShareModalOpen,
    openShareModal,
    closeShareModal,
    isColorPickerOpen,
    selectedColor,
    setSelectedColor,
    openColorPicker,
    closeColorPicker,
    selectedTaskForDate,
    openDatePicker,
    closeDatePicker,
    isShortcutHelpOpen,
    openShortcutHelp,
    closeShortcutHelp,
    // 編集状態もここから取得
    editingTaskListId,
    editingTaskListName,
    setEditingTaskListName,
    editingTaskId,
    editingTaskText,
    setEditingTaskText,
    startEditTaskList,
    cancelEditTaskList,
    startEditTask,
    cancelEditTask,
  } = useModalState();

  // 共有操作フック
  const {
    shareLink,
    isGeneratingShare,
    error: shareError,
    generateShareLink,
    copyShareLink,
    deleteShareLink,
    clearShareState,
  } = useShareOperations();
  
  // レスポンシブ判定の初期化
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // App設定の取得
  const fetchAppSettings = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoadingAppSettings(true);
      setError(null);
      const response = await sdkClient.user.getApp(user.id);
      if (response.data?.app) {
        setAppSettings(response.data.app);
      }
    } catch (err) {
      console.error('Failed to fetch app settings:', err);
      // App設定が存在しない場合はデフォルト値を設定
      const defaultAppSettings: AppSettings = {
        id: '',
        taskListOrder: [],
        taskInsertPosition: 'top',
        autoSort: false,
        createdAt: '',
        updatedAt: ''
      };
      setAppSettings(defaultAppSettings);
    } finally {
      setIsLoadingAppSettings(false);
    }
  }, [user, setError]);

  // 初期データの取得
  useEffect(() => {
    if (user) {
      fetchTaskLists();
      fetchAppSettings();
    }
  }, [user, fetchTaskLists, fetchAppSettings]);

  // 選択されたタスクリストのタスクを取得
  useEffect(() => {
    if (selectedTaskListId) {
      fetchTasks(selectedTaskListId);
    }
  }, [selectedTaskListId, fetchTasks]);

  // autoSort設定が変更された際の即座反映
  useEffect(() => {
    if (appSettings?.autoSort && tasks.length > 0) {
      // sortTasks関数を使用して並び替えを実行
      sortTasks();
    }
  }, [appSettings?.autoSort]); // tasksを依存配列から除外して無限ループを防ぐ

  // ページフォーカス時にApp設定を再取得（設定画面での変更を反映）
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchAppSettings();
      }
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, fetchAppSettings]);

  // タスクリスト関連のイベントハンドラー
  const handleSelectTaskList = useCallback((taskListId: string) => {
    selectTaskList(taskListId);
    setIsDrawerOpen(false); // モバイルでドロワーを閉じる
  }, [selectTaskList]);

  const handleCreateTaskList = useCallback(async () => {
    if (newListName.trim()) {
      try {
        await createTaskList(newListName.trim());
        closeAddTaskListModal();
      } catch (error) {
        // エラーハンドリングは createTaskList 内で実行済み
      }
    }
  }, [newListName, createTaskList, closeAddTaskListModal]);

  const handleUpdateTaskListName = useCallback(async (taskListId: string) => {
    if (editingTaskListName.trim()) {
      await updateTaskListName(taskListId, editingTaskListName.trim());
    }
    cancelEditTaskList();
  }, [editingTaskListName, updateTaskListName, cancelEditTaskList]);

  const handleColorPickerSelect = useCallback(async (color: string) => {
    if (editingTaskListId) {
      await updateTaskListBackground(editingTaskListId, color);
      closeColorPicker();
    }
  }, [editingTaskListId, updateTaskListBackground, closeColorPicker]);

  // タスク関連のイベントハンドラー
  const handleAddTask = useCallback(async () => {
    if (selectedTaskListId && newTaskText.trim()) {
      try {
        await addTask(selectedTaskListId, newTaskText.trim());
        setNewTaskText('');
      } catch (error) {
        // エラーハンドリングは addTask 内で実行済み
      }
    }
  }, [selectedTaskListId, newTaskText, addTask]);

  const handleToggleTask = useCallback(async (taskId: string, completed: boolean) => {
    await toggleTask(taskId, completed);
  }, [toggleTask]);

  const handleUpdateTaskText = useCallback(async (taskId: string) => {
    if (editingTaskText.trim()) {
      await updateTaskText(taskId, editingTaskText.trim());
    }
    cancelEditTask();
  }, [editingTaskText, updateTaskText, cancelEditTask]);

  // 共有関連のイベントハンドラー
  const handleOpenShareModal = useCallback(async () => {
    if (selectedTaskListId) {
      clearShareState();
      openShareModal();
      try {
        await generateShareLink(selectedTaskListId);
      } catch (error) {
        // エラーハンドリングはgenerateShareLink内で実行済み
      }
    }
  }, [selectedTaskListId, clearShareState, openShareModal, generateShareLink]);

  const handleCopyShareLink = useCallback(async () => {
    const success = await copyShareLink();
    if (success) {
      // TODO: トースト通知でコピー成功を表示
    }
  }, [copyShareLink]);

  const handleDeleteShareLink = useCallback(async () => {
    if (selectedTaskListId) {
      await deleteShareLink(selectedTaskListId);
    }
  }, [selectedTaskListId, deleteShareLink]);

  // 日付設定の処理
  const handleSetTaskDate = useCallback(async (date: string | null) => {
    if (selectedTaskForDate) {
      await setTaskDate(selectedTaskForDate, date);
      closeDatePicker();
    }
  }, [selectedTaskForDate, setTaskDate, closeDatePicker]);

  // カルーセルナビゲーション
  const handleGoToIndex = useCallback((index: number) => {
    goToTaskList(index);
  }, [goToTaskList]);

  // ドロワー操作
  const handleOpenDrawer = useCallback(() => {
    setIsDrawerOpen(true);
    // 履歴APIでドロワー状態を管理（モバイルのみ）
    if (isMobile && typeof window !== 'undefined') {
      window.history.pushState({ drawerOpen: true }, '');
    }
  }, [isMobile]);

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    // 履歴を戻す（モバイルのみ）
    if (isMobile && typeof window !== 'undefined') {
      // popstateイベントが発生しないよう、一時的にリスナーを無効化
      const currentUrl = window.location.href;
      if (window.history.state?.drawerOpen) {
        window.history.back();
      }
    }
  }, [isMobile]);

  // 履歴API対応（ブラウザの戻るボタンでドロワーを閉じる）
  useEffect(() => {
    if (!isMobile) return;

    const handlePopState = (event: PopStateEvent) => {
      if (isDrawerOpen && !event.state?.drawerOpen) {
        setIsDrawerOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isMobile, isDrawerOpen]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      
      // モーダルが開いている場合やinput/textareaにフォーカスがある場合はスキップ
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );

      if (isAddTaskListModalOpen || isShareModalOpen || isColorPickerOpen) {
        return; // モーダルが開いている場合は無効
      }
      
      switch (true) {
        // Ctrl/Cmd + N: 新しいタスク追加
        case isCtrlOrCmd && event.key === 'n' && !isInputFocused:
          event.preventDefault();
          if (selectedTaskListId) {
            // タスク入力フィールドにフォーカス
            const taskInput = document.querySelector('input[placeholder*="タスクを入力"]') as HTMLInputElement;
            if (taskInput) {
              taskInput.focus();
            }
          }
          break;

        // Ctrl/Cmd + Enter: タスク保存 (editingTaskIdがある場合)
        case isCtrlOrCmd && event.key === 'Enter':
          event.preventDefault();
          if (editingTaskId) {
            handleUpdateTaskText(editingTaskId);
          }
          break;

        // Delete: 選択したタスクの削除
        case event.key === 'Delete' && selectedTaskId && !isInputFocused:
          event.preventDefault();
          deleteTask(selectedTaskId);
          setSelectedTaskId(null);
          break;

        // Ctrl/Cmd + /: ショートカット一覧表示
        case isCtrlOrCmd && event.key === '/':
          event.preventDefault();
          openShortcutHelp();
          break;

        // 左矢印: 前のタスクリストに移動
        case event.key === 'ArrowLeft' && !isInputFocused:
          event.preventDefault();
          if (currentTaskListIndex > 0) {
            handleGoToIndex(currentTaskListIndex - 1);
          }
          break;

        // 右矢印: 次のタスクリストに移動
        case event.key === 'ArrowRight' && !isInputFocused:
          event.preventDefault();
          if (currentTaskListIndex < taskLists.length - 1) {
            handleGoToIndex(currentTaskListIndex + 1);
          }
          break;

        // Escape: モーダル・編集モードのキャンセル
        case event.key === 'Escape':
          if (editingTaskId) {
            cancelEditTask();
          } else if (editingTaskListId) {
            cancelEditTaskList();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    isAddTaskListModalOpen,
    isShareModalOpen,
    isColorPickerOpen,
    selectedTaskListId,
    editingTaskId,
    selectedTaskId,
    editingTaskListId,
    currentTaskListIndex,
    taskLists.length,
    handleUpdateTaskText,
    deleteTask,
    cancelEditTask,
    cancelEditTaskList,
    openShortcutHelp,
    handleGoToIndex,
  ]);
  
  // ローディング中の表示
  if (isLoading || !shouldRender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* モバイルヘッダー */}
      {isMobile && (
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-600">
          <div className="h-12 flex items-center justify-between px-2">
            <button
              onClick={handleOpenDrawer}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              aria-label="メニューを開く"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Lightlist
            </h1>
            <div className="w-10"></div> {/* スペーサー */}
          </div>
        </header>
      )}

      <div className="flex">
        {/* サイドバー（PC）/ ドロワー（モバイル） */}
        <TaskListDrawer
          user={user}
          taskLists={taskLists}
          selectedTaskListId={selectedTaskListId}
          isLoadingTaskLists={isLoadingTaskLists}
          isDrawerOpen={isDrawerOpen}
          isMobile={isMobile}
          editingTaskListId={editingTaskListId}
          editingTaskListName={editingTaskListName}
          onSelectTaskList={handleSelectTaskList}
          onAddTaskListModal={openAddTaskListModal}
          onDeleteTaskList={deleteTaskList}
          onEditTaskListName={startEditTaskList}
          onUpdateTaskListName={handleUpdateTaskListName}
          onOpenColorPicker={openColorPicker}
          onCloseDrawer={handleCloseDrawer}
          setEditingTaskListId={(id) => id && startEditTaskList(id, taskLists.find(list => list.id === id)?.name || '')}
          setEditingTaskListName={setEditingTaskListName}
        />

        {/* モバイル用オーバーレイ */}
        {isMobile && isDrawerOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black bg-opacity-50"
            onClick={handleCloseDrawer}
            aria-hidden="true"
          />
        )}

        {/* メインコンテンツ */}
        <main className={`flex-1 ${isMobile ? '' : 'ml-80'}`}>
          <div className="p-2">
            {taskLists.length > 0 ? (
              <TaskListCarousel
                taskLists={taskLists}
                tasks={tasks}
                currentTaskListIndex={currentTaskListIndex}
                selectedTaskListId={selectedTaskListId}
                isLoadingTasks={isLoadingTasks}
                newTaskText={newTaskText}
                setNewTaskText={setNewTaskText}
                onAddTask={handleAddTask}
                onToggleTask={handleToggleTask}
                onDeleteTask={deleteTask}
                onDeleteCompletedTasks={deleteCompletedTasks}
                onSortTasks={sortTasks}
                onReorderTasks={reorderTasks}
                editingTaskId={editingTaskId}
                editingTaskText={editingTaskText}
                setEditingTaskText={setEditingTaskText}
                onStartEditTask={startEditTask}
                onUpdateTaskText={handleUpdateTaskText}
                onCancelEditTask={cancelEditTask}
                onSetTaskDate={openDatePicker}
                selectedTaskId={selectedTaskId}
                onTaskClick={setSelectedTaskId}
                onOpenShareModal={handleOpenShareModal}
                onGoToIndex={handleGoToIndex}
                scrollContainerRef={scrollContainerRef}
                scrollToIndex={scrollToIndex}
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="text-center py-12">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    タスクリストがありません
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    左のサイドバーから新しいタスクリストを作成してください
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* エラー表示 */}
      {error && (
        <div 
          className="fixed top-4 right-4 z-50 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-white hover:text-gray-200 focus:outline-none"
              aria-label="エラーメッセージを閉じる"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* モーダル群 */}
      {/* タスクリスト作成モーダル */}
      {isAddTaskListModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-tasklist-modal-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 
              id="add-tasklist-modal-title"
              className="text-lg font-semibold text-gray-900 dark:text-white mb-4"
            >
              新しいタスクリスト
            </h2>
            
            <div className="space-y-4">
              <div>
                <label 
                  htmlFor="new-list-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  タスクリスト名
                </label>
                <input
                  id="new-list-name"
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateTaskList();
                    } else if (e.key === 'Escape') {
                      closeAddTaskListModal();
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="タスクリスト名を入力"
                  autoFocus
                  aria-required="true"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button 
                onClick={closeAddTaskListModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                キャンセル
              </button>
              <button 
                onClick={handleCreateTaskList}
                disabled={!newListName.trim()}
                className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 共有モーダル */}
      <ShareModal
        isOpen={isShareModalOpen}
        isGenerating={isGeneratingShare}
        shareLink={shareLink}
        error={shareError}
        onCopyLink={handleCopyShareLink}
        onDeleteLink={handleDeleteShareLink}
        onClose={closeShareModal}
        onRetry={() => selectedTaskListId && generateShareLink(selectedTaskListId)}
      />

      {/* カラーピッカーモーダル */}
      {isColorPickerOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="color-picker-modal-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 
              id="color-picker-modal-title"
              className="text-lg font-semibold text-gray-900 dark:text-white mb-4"
            >
              背景色を選択
            </h2>
            
            <ColorPicker
              color={selectedColor}
              onChangeComplete={handleColorPickerSelect}
            />

            <div className="mt-6 flex justify-end">
              <button 
                onClick={closeColorPicker}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ショートカットヘルプモーダル */}
      {isShortcutHelpOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-modal-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 
              id="shortcuts-modal-title"
              className="text-lg font-semibold text-gray-900 dark:text-white mb-4"
            >
              キーボードショートカット
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">新しいタスク追加</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded text-sm">
                  Ctrl + N
                </kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">タスク保存</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded text-sm">
                  Ctrl + Enter
                </kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">選択タスク削除</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded text-sm">
                  Delete
                </kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">前のタスクリスト</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded text-sm">
                  ←
                </kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">次のタスクリスト</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded text-sm">
                  →
                </kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">ショートカット一覧</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded text-sm">
                  Ctrl + /
                </kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">キャンセル</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded text-sm">
                  Escape
                </kbd>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={closeShortcutHelp}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 日付設定モーダル */}
      {selectedTaskForDate && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="date-picker-modal-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 
              id="date-picker-modal-title"
              className="text-lg font-semibold text-gray-900 dark:text-white mb-4"
            >
              期限を設定
            </h2>
            
            <div className="space-y-4">
              <div>
                <label 
                  htmlFor="task-date"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  日付
                </label>
                <input
                  id="task-date"
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  onChange={(e) => {
                    const date = e.target.value || null;
                    handleSetTaskDate(date);
                  }}
                  autoFocus
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button 
                onClick={closeDatePicker}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                キャンセル
              </button>
              <button 
                onClick={() => handleSetTaskDate(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                日付を削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}