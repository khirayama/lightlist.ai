import { useState, useCallback } from 'react';

export const useModalState = () => {
  // 各種モーダルの状態
  const [isAddTaskListModalOpen, setIsAddTaskListModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);
  const [selectedTaskForDate, setSelectedTaskForDate] = useState<string | null>(null);

  // タスクリスト追加モーダル
  const [newListName, setNewListName] = useState('');
  
  const openAddTaskListModal = useCallback(() => {
    setIsAddTaskListModalOpen(true);
    setNewListName('');
  }, []);

  const closeAddTaskListModal = useCallback(() => {
    setIsAddTaskListModalOpen(false);
    setNewListName('');
  }, []);

  // 共有モーダル
  const openShareModal = useCallback(() => {
    setIsShareModalOpen(true);
  }, []);

  const closeShareModal = useCallback(() => {
    setIsShareModalOpen(false);
  }, []);

  // カラーピッカーモーダル
  const [editingTaskListId, setEditingTaskListId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');

  const openColorPicker = useCallback((taskListId: string, currentColor: string) => {
    setEditingTaskListId(taskListId);
    setSelectedColor(currentColor);
    setIsColorPickerOpen(true);
  }, []);

  const closeColorPicker = useCallback(() => {
    setIsColorPickerOpen(false);
    setEditingTaskListId(null);
    setSelectedColor('#FFFFFF');
  }, []);

  // 日付選択モーダル
  const openDatePicker = useCallback((taskId: string) => {
    setSelectedTaskForDate(taskId);
  }, []);

  const closeDatePicker = useCallback(() => {
    setSelectedTaskForDate(null);
  }, []);

  // ショートカットヘルプモーダル
  const openShortcutHelp = useCallback(() => {
    setIsShortcutHelpOpen(true);
  }, []);

  const closeShortcutHelp = useCallback(() => {
    setIsShortcutHelpOpen(false);
  }, []);

  // 編集状態
  const [editingTaskListName, setEditingTaskListName] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');

  const startEditTaskList = useCallback((taskListId: string, currentName: string) => {
    setEditingTaskListId(taskListId);
    setEditingTaskListName(currentName);
  }, []);

  const cancelEditTaskList = useCallback(() => {
    setEditingTaskListId(null);
    setEditingTaskListName('');
  }, []);

  const startEditTask = useCallback((taskId: string, currentText: string) => {
    setEditingTaskId(taskId);
    setEditingTaskText(currentText);
  }, []);

  const cancelEditTask = useCallback(() => {
    setEditingTaskId(null);
    setEditingTaskText('');
  }, []);

  return {
    // タスクリスト追加モーダル
    isAddTaskListModalOpen,
    newListName,
    setNewListName,
    openAddTaskListModal,
    closeAddTaskListModal,

    // 共有モーダル
    isShareModalOpen,
    openShareModal,
    closeShareModal,

    // カラーピッカーモーダル
    isColorPickerOpen,
    editingTaskListId,
    selectedColor,
    setSelectedColor,
    openColorPicker,
    closeColorPicker,

    // 日付選択モーダル
    selectedTaskForDate,
    openDatePicker,
    closeDatePicker,

    // ショートカットヘルプモーダル
    isShortcutHelpOpen,
    openShortcutHelp,
    closeShortcutHelp,

    // 編集状態
    editingTaskListName,
    setEditingTaskListName,
    editingTaskId,
    editingTaskText,
    setEditingTaskText,
    startEditTaskList,
    cancelEditTaskList,
    startEditTask,
    cancelEditTask,
  };
};