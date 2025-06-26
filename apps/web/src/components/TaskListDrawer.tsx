import React, { memo } from 'react';
import { useRouter } from 'next/router';
import type { TaskList, User } from '@lightlist/sdk';
import { useSafeTranslation } from '../hooks/useSafeTranslation';

interface TaskListDrawerProps {
  user: User | null;
  taskLists: TaskList[];
  selectedTaskListId: string | null;
  isLoadingTaskLists: boolean;
  isDrawerOpen: boolean;
  isMobile: boolean;
  editingTaskListId: string | null;
  editingTaskListName: string;
  onSelectTaskList: (taskListId: string) => void;
  onAddTaskListModal: () => void;
  onDeleteTaskList: (taskListId: string) => void;
  onEditTaskListName: (taskListId: string, name: string) => void;
  onUpdateTaskListName: (taskListId: string) => void;
  onOpenColorPicker: (taskListId: string, currentColor: string) => void;
  onCloseDrawer: () => void;
  setEditingTaskListId: (id: string | null) => void;
  setEditingTaskListName: (name: string) => void;
}

export const TaskListDrawer: React.FC<TaskListDrawerProps> = memo(({
  user,
  taskLists,
  selectedTaskListId,
  isLoadingTaskLists,
  isDrawerOpen,
  isMobile,
  editingTaskListId,
  editingTaskListName,
  onSelectTaskList,
  onAddTaskListModal,
  onDeleteTaskList,
  onEditTaskListName,
  onUpdateTaskListName,
  onOpenColorPicker,
  onCloseDrawer,
  setEditingTaskListId,
  setEditingTaskListName,
}) => {
  const router = useRouter();
  const { t } = useSafeTranslation();

  return (
    <div className={`transform transition-transform duration-300 ease-in-out flex flex-col w-80 bg-white dark:bg-gray-800 shadow-sm ${
      isMobile 
        ? (isDrawerOpen ? 'translate-x-0 fixed inset-y-0 left-0 z-50' : '-translate-x-full fixed inset-y-0 left-0 z-50') 
        : 'static'
    }`}>
      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">タスクリスト</h2>
          <button 
            onClick={onCloseDrawer} 
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="ドロワーを閉じる"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6">
          <h2 className="hidden md:block text-lg font-semibold text-gray-900 dark:text-white mb-4">
            タスクリスト
          </h2>
          <button 
            onClick={onAddTaskListModal} 
            className="w-full px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            aria-label="新しいタスクリストを追加"
          >
            {t('taskList.addTaskList')}
          </button>
        </div>

        <div className="space-y-2" role="list" aria-label="タスクリスト一覧">
          {isLoadingTaskLists ? (
            <div className="text-center py-4" role="status" aria-live="polite">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div>
              <span className="sr-only">タスクリストを読み込み中</span>
            </div>
          ) : taskLists.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm" role="status">
              タスクリストがありません
            </p>
          ) : (
            taskLists.map((list) => (
              <div 
                key={list.id} 
                role="listitem"
                className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${
                  selectedTaskListId === list.id 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900' 
                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`} 
                style={list.background && selectedTaskListId !== list.id ? { backgroundColor: list.background + '20' } : {}}
                onClick={() => onSelectTaskList(list.id)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectTaskList(list.id);
                  }
                }}
                aria-label={`タスクリスト: ${list.name}${selectedTaskListId === list.id ? ' (現在選択中)' : ''}`}
              >
                {editingTaskListId === list.id ? (
                  <input 
                    type="text" 
                    value={editingTaskListName} 
                    onChange={(e) => setEditingTaskListName(e.target.value)} 
                    onBlur={() => onUpdateTaskListName(list.id)} 
                    onKeyDown={(e) => { 
                      if (e.key === 'Enter') { 
                        onUpdateTaskListName(list.id); 
                      } else if (e.key === 'Escape') { 
                        setEditingTaskListId(null); 
                      } 
                    }} 
                    className="w-full bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 border-b border-primary-500" 
                    autoFocus 
                    aria-label="タスクリスト名を編集"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span 
                    onDoubleClick={(e) => { 
                      e.stopPropagation();
                      onEditTaskListName(list.id, list.name); 
                    }} 
                    className="text-gray-900 dark:text-white cursor-pointer flex-1"
                    title="ダブルクリックで編集"
                  >
                    {list.name}
                  </span>
                )}
                
                <div className="flex space-x-2 ml-2" role="group" aria-label="タスクリスト操作">
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onOpenColorPicker(list.id, list.background || '#FFFFFF'); 
                    }} 
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2" 
                    aria-label={`背景色を変更: ${list.name}`}
                    title="背景色を設定"
                  >
                    🎨
                  </button>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onDeleteTaskList(list.id); 
                    }} 
                    className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2" 
                    aria-label={`タスクリストを削除: ${list.name}`}
                    title="タスクリストを削除"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-8">
          <button 
            onClick={() => router.push('/settings')} 
            className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            aria-label="設定ページに移動"
          >
            {t('settings.title')}
          </button>
        </div>
      </div>
    </div>
  );
});

TaskListDrawer.displayName = 'TaskListDrawer';