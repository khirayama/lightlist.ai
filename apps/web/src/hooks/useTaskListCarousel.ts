import { useState, useCallback, useEffect } from 'react';
import type { TaskList } from '@lightlist/sdk';

interface UseTaskListCarouselProps {
  taskLists: TaskList[];
  selectedTaskListId: string | null;
  setSelectedTaskListId: (id: string | null) => void;
}

export const useTaskListCarousel = ({
  taskLists,
  selectedTaskListId,
  setSelectedTaskListId,
}: UseTaskListCarouselProps) => {
  const [currentTaskListIndex, setCurrentTaskListIndex] = useState(0);

  // タスクリストの変更に合わせてインデックスを更新
  useEffect(() => {
    if (taskLists.length > 0) {
      if (!selectedTaskListId) {
        // 初回ロード時は最初のタスクリストを選択
        setSelectedTaskListId(taskLists[0].id);
        setCurrentTaskListIndex(0);
      } else {
        // 現在選択されているタスクリストのインデックスを更新
        const currentIndex = taskLists.findIndex(list => list.id === selectedTaskListId);
        if (currentIndex !== -1) {
          setCurrentTaskListIndex(currentIndex);
        }
      }
    }
  }, [taskLists, selectedTaskListId, setSelectedTaskListId]);

  const goToTaskList = useCallback((index: number) => {
    if (index >= 0 && index < taskLists.length) {
      setCurrentTaskListIndex(index);
      setSelectedTaskListId(taskLists[index].id);
    }
  }, [taskLists, setSelectedTaskListId]);

  const goToPrevTaskList = useCallback(() => {
    const newIndex = currentTaskListIndex > 0 ? currentTaskListIndex - 1 : taskLists.length - 1;
    goToTaskList(newIndex);
  }, [currentTaskListIndex, taskLists.length, goToTaskList]);

  const goToNextTaskList = useCallback(() => {
    const newIndex = currentTaskListIndex < taskLists.length - 1 ? currentTaskListIndex + 1 : 0;
    goToTaskList(newIndex);
  }, [currentTaskListIndex, taskLists.length, goToTaskList]);

  const selectTaskList = useCallback((taskListId: string) => {
    setSelectedTaskListId(taskListId);
    const index = taskLists.findIndex(list => list.id === taskListId);
    if (index !== -1) {
      setCurrentTaskListIndex(index);
    }
  }, [taskLists, setSelectedTaskListId]);

  return {
    currentTaskListIndex,
    goToTaskList,
    goToPrevTaskList,
    goToNextTaskList,
    selectTaskList,
  };
};