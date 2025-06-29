import { useState, useCallback, useEffect, useRef } from 'react';
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingProgrammatically = useRef(false);

  // throttle関数の実装
  const throttle = useCallback((func: Function, limit: number) => {
    let inThrottle: boolean;
    return function(this: any, ...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }, []);

  // スクロール位置を指定のインデックスに移動
  const scrollToIndex = useCallback((index: number) => {
    if (scrollContainerRef.current && taskLists[index]) {
      isScrollingProgrammatically.current = true;
      const container = scrollContainerRef.current;
      const targetScrollLeft = index * container.clientWidth;
      container.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
      });
      setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 500); // スムーズスクロールの時間を考慮
    }
  }, [taskLists]);

  // スクロール位置からインデックスを計算
  const calculateIndexFromScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    const newIndex = Math.round(scrollLeft / containerWidth);
    
    if (newIndex !== currentTaskListIndex && newIndex >= 0 && newIndex < taskLists.length) {
      setCurrentTaskListIndex(newIndex);
      setSelectedTaskListId(taskLists[newIndex].id);
    }
  }, [currentTaskListIndex, taskLists, setSelectedTaskListId]);

  // スクロールイベントハンドラー（throttled）
  const handleScroll = useCallback(
    throttle(() => {
      if (!isScrollingProgrammatically.current) {
        calculateIndexFromScroll();
      }
    }, 100),
    [calculateIndexFromScroll]
  );

  // スクロールイベントリスナーの設定
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

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
      scrollToIndex(index);
    }
  }, [taskLists, setSelectedTaskListId, scrollToIndex]);

  const selectTaskList = useCallback((taskListId: string) => {
    setSelectedTaskListId(taskListId);
    const index = taskLists.findIndex(list => list.id === taskListId);
    if (index !== -1) {
      setCurrentTaskListIndex(index);
      scrollToIndex(index);
    }
  }, [taskLists, setSelectedTaskListId, scrollToIndex]);

  return {
    currentTaskListIndex,
    goToTaskList,
    selectTaskList,
    scrollContainerRef,
    scrollToIndex,
  };
};