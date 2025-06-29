import React, { memo, useMemo } from 'react';
import type { TaskList, Task } from '@lightlist/sdk';
import { TaskListCard } from './TaskListCard';

interface TaskListCarouselProps {
  taskLists: TaskList[];
  tasks: Task[];
  currentTaskListIndex: number;
  selectedTaskListId: string | null;
  isLoadingTasks: boolean;
  newTaskText: string;
  setNewTaskText: (text: string) => void;
  onAddTask: () => void;
  onToggleTask: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteCompletedTasks: () => void;
  onSortTasks: () => void;
  editingTaskId: string | null;
  editingTaskText: string;
  setEditingTaskText: (text: string) => void;
  onStartEditTask: (taskId: string, currentText: string) => void;
  onUpdateTaskText: (taskId: string) => void;
  onCancelEditTask: () => void;
  onSetTaskDate: (taskId: string) => void;
  selectedTaskId: string | null;
  onTaskClick: (taskId: string) => void;
  onOpenShareModal: () => void;
  onGoToIndex: (index: number) => void;
}

export const TaskListCarousel: React.FC<TaskListCarouselProps> = memo(({
  taskLists,
  tasks,
  currentTaskListIndex,
  selectedTaskListId,
  isLoadingTasks,
  newTaskText,
  setNewTaskText,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onDeleteCompletedTasks,
  onSortTasks,
  editingTaskId,
  editingTaskText,
  setEditingTaskText,
  onStartEditTask,
  onUpdateTaskText,
  onCancelEditTask,
  onSetTaskDate,
  selectedTaskId,
  onTaskClick,
  onOpenShareModal,
  onGoToIndex,
}) => {
  // 選択されたタスクリストをメモ化
  const selectedTaskList = useMemo(() => 
    taskLists.find(list => list.id === selectedTaskListId),
    [taskLists, selectedTaskListId]
  );

  // カルーセルナビゲーションボタンの表示判定
  const showNavigation = useMemo(() => taskLists.length > 1, [taskLists.length]);

  if (taskLists.length === 0) {
    return (
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
    );
  }

  return (
    <section 
      className="relative"
      role="region"
      aria-label="タスクリストカルーセル"
      aria-describedby="carousel-description"
    >
      <div id="carousel-description" className="sr-only">
        タスクリストのカルーセル表示。ドットボタンまたはキーボードで切り替え可能
      </div>

      {/* カルーセルコンテンツ */}
      <div className="overflow-hidden">
        <div 
          className="flex transition-transform duration-300 ease-in-out" 
          style={{ transform: `translateX(-${currentTaskListIndex * 100}%)` }}
          role="tabpanel"
          aria-live="polite"
          aria-atomic="false"
        >
          {taskLists.map((taskList, index) => (
            <div key={taskList.id} className="w-full flex-shrink-0 px-2">
              <TaskListCard 
                taskList={taskList} 
                tasks={index === currentTaskListIndex ? tasks : []} 
                isActive={index === currentTaskListIndex} 
                isLoadingTasks={isLoadingTasks} 
                newTaskText={newTaskText} 
                setNewTaskText={setNewTaskText} 
                onAddTask={onAddTask} 
                onToggleTask={onToggleTask} 
                onDeleteTask={onDeleteTask} 
                onDeleteCompletedTasks={onDeleteCompletedTasks} 
                onSortTasks={onSortTasks}
                editingTaskId={editingTaskId}
                editingTaskText={editingTaskText}
                setEditingTaskText={setEditingTaskText}
                onStartEditTask={onStartEditTask}
                onUpdateTaskText={onUpdateTaskText}
                onCancelEditTask={onCancelEditTask}
                onSetTaskDate={onSetTaskDate}
                selectedTaskId={selectedTaskId}
                onTaskClick={onTaskClick}
                onOpenShareModal={onOpenShareModal}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ページネーションインジケーター */}
      {showNavigation && (
        <nav 
          className="flex justify-center mt-6 space-x-2"
          role="tablist"
          aria-label="タスクリスト選択"
        >
          {taskLists.map((taskList, index) => (
            <button 
              key={index} 
              onClick={() => onGoToIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                index === currentTaskListIndex 
                  ? 'bg-primary-500' 
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
              role="tab"
              aria-selected={index === currentTaskListIndex}
              aria-controls={`taskList-panel-${taskList.id}`}
              aria-label={`${taskList.name}を選択`}
              title={taskList.name}
            />
          ))}
        </nav>
      )}

      {/* 現在のタスクリスト情報（スクリーンリーダー用） */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
      >
        {selectedTaskList && `現在のタスクリスト: ${selectedTaskList.name} (${currentTaskListIndex + 1}/${taskLists.length})`}
      </div>
    </section>
  );
});

TaskListCarousel.displayName = 'TaskListCarousel';