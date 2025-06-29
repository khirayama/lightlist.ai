import React from 'react';
import type { TaskList, Task } from '@lightlist/sdk';
import { Button, Input, Card, CardHeader, CardContent, CardFooter, Icon } from './index';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableTaskItemProps {
  task: Task;
  selectedTaskId: string | null;
  editingTaskId: string | null;
  editingTaskText: string;
  setEditingTaskText: (text: string) => void;
  onToggleTask: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  onStartEditTask: (taskId: string, currentText: string) => void;
  onUpdateTaskText: (taskId: string) => void;
  onCancelEditTask: () => void;
  onSetTaskDate: (taskId: string) => void;
  t: (key: string) => string;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  selectedTaskId,
  editingTaskId,
  editingTaskText,
  setEditingTaskText,
  onToggleTask,
  onDeleteTask,
  onStartEditTask,
  onUpdateTaskText,
  onCancelEditTask,
  onSetTaskDate,
  t,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <article 
        className={`flex items-center space-x-3 p-3 border rounded-md transition-colors ${
          selectedTaskId === task.id 
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
            : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
        } ${isDragging ? 'opacity-50' : ''}`}
        aria-labelledby={`task-${task.id}-content`}
        aria-describedby={`task-${task.id}-status`}
        role="article"
      >
        {/* タスクの状態 */}
        <div id={`task-${task.id}-status`} className="sr-only">
          {task.completed ? '完了済み' : '未完了'}
          {task.date && `, 期限: ${task.date}`}
        </div>

        {/* ドラッグハンドル */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
          aria-label="タスクを移動"
          title="ドラッグしてタスクを移動"
        >
          <Icon name="menu" size={16} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" />
        </div>

        {/* チェックボックス */}
        <div className="flex-shrink-0">
          <input 
            type="checkbox" 
            id={`task-checkbox-${task.id}`}
            checked={task.completed} 
            onChange={(e) => {
              e.stopPropagation();
              onToggleTask(task.id, e.target.checked);
            }} 
            className="h-4 w-4 text-primary-500 focus:ring-primary-500 focus:ring-offset-2 border-gray-300 rounded" 
            aria-label={task.completed ? "タスクを未完了にする" : "タスクを完了にする"}
            aria-describedby={`task-${task.id}-content`}
          />
        </div>

        {/* タスク内容 */}
        <div className="flex-1 min-w-0">
          {editingTaskId === task.id ? (
            <div className="flex items-center">
              <input 
                type="text" 
                value={editingTaskText} 
                onChange={(e) => setEditingTaskText(e.target.value)}
                onBlur={() => onUpdateTaskText(task.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onUpdateTaskText(task.id);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    onCancelEditTask();
                  }
                }}
                className="flex-1 bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 border-b border-primary-500 rounded-none"
                autoFocus
                aria-label="タスクを編集"
                aria-describedby={`task-edit-hint-${task.id}`}
              />
              <div id={`task-edit-hint-${task.id}`} className="sr-only">
                タスク名を編集してエンターキーで保存、エスケープキーでキャンセル
              </div>
            </div>
          ) : (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onStartEditTask(task.id, task.text);
              }}
              className={`w-full text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded px-1 py-1 ${
                task.completed 
                  ? 'text-gray-500 dark:text-gray-400 line-through' 
                  : 'text-gray-900 dark:text-white'
              }`}
              id={`task-${task.id}-content`}
              aria-label={`タスクを編集: ${task.text}`}
              title="クリックしてタスクを編集"
            >
              <span className="break-words">{task.text}</span>
            </button>
          )}
          
          {/* 期限表示 */}
          {task.date && (
            <div className="mt-1 flex items-center">
              <Icon 
                name="calendar" 
                size={16} 
                className="mr-1 text-gray-500 dark:text-gray-400" 
              />
              <span 
                className="text-sm text-gray-500 dark:text-gray-400"
                aria-label={`期限: ${task.date}`}
              >
                {task.date}
              </span>
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <div 
          className="flex items-center space-x-2 flex-shrink-0"
          role="group"
          aria-label="タスク操作"
        >
          <Button
            variant="secondary"
            size="sm"
            icon="calendar"
            onClick={(e) => {
              e.stopPropagation();
              onSetTaskDate(task.id);
            }} 
            title={t('tasks.setDueDate')}
            aria-label={`期限を設定: ${task.text}`}
            aria-describedby={`task-date-hint-${task.id}`}
            className="p-1 min-w-0 w-8 h-8"
          />
          <div id={`task-date-hint-${task.id}`} className="sr-only">
            タスク「{task.text}」の期限を設定または変更
          </div>
          
          <Button
            variant="destructive"
            size="sm"
            icon="trash"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`タスク「${task.text}」を削除しますか？`)) {
                onDeleteTask(task.id);
              }
            }} 
            aria-label={`タスクを削除: ${task.text}`}
            title="タスクを削除"
            className="p-1 min-w-0 w-8 h-8"
          />
        </div>
      </article>
    </li>
  );
};

interface TaskListCardProps {
  taskList: TaskList;
  tasks: Task[];
  isActive: boolean;
  isLoadingTasks: boolean;
  newTaskText: string;
  setNewTaskText: (text: string) => void;
  onAddTask: () => void;
  onToggleTask: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteCompletedTasks: () => void;
  onSortTasks: () => void;
  onReorderTasks: (taskIds: string[]) => void;
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
}

export const TaskListCard: React.FC<TaskListCardProps> = ({
  taskList,
  tasks,
  isActive,
  isLoadingTasks,
  newTaskText,
  setNewTaskText,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onDeleteCompletedTasks,
  onSortTasks,
  onReorderTasks,
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
}) => {
  // 翻訳関数のフォールバック（SSR対応）
  const t = (key: string) => {
    // 基本的な翻訳マッピング
    const translations: { [key: string]: string } = {
      'auth.loginButton': 'ログイン',
      'auth.registerButton': 'ユーザー登録',
      'auth.logoutButton': 'ログアウト',
      'taskList.addTaskList': '新しいタスクリスト',
      'taskList.shareTaskList': '共有',
      'tasks.taskPlaceholder': 'タスクを入力...',
      'tasks.addTask': '追加',
      'tasks.sortTasks': '並び替え',
      'tasks.deleteCompleted': '完了済み削除',
      'tasks.deleteCompletedConfirm': '完了済みタスクを削除しますか？',
      'tasks.setDueDate': '期限を設定',
      'common.cancel': 'キャンセル',
      'common.delete': '削除',
      'settings.title': '設定'
    };
    return translations[key] || key;
  };

  // ドラッグ&ドロップセンサーの設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px移動後にドラッグ開始（誤操作防止）
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ドラッグ終了時の処理
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = tasks.findIndex((task) => task.id === active.id);
    const newIndex = tasks.findIndex((task) => task.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      // 新しい順序でタスクIDの配列を作成
      const newTaskIds = [...tasks];
      const [movedTask] = newTaskIds.splice(oldIndex, 1);
      newTaskIds.splice(newIndex, 0, movedTask);
      
      onReorderTasks(newTaskIds.map(task => task.id));
    }
  };

  const completedCount = tasks.filter(task => task.completed).length;
  const totalCount = tasks.length;

  return (
    <Card
      className="motion-safe:animate-fade-in"
      role="region"
      aria-labelledby={`tasklist-title-${taskList.id}`}
      aria-describedby={`tasklist-description-${taskList.id}`}
    >
      <CardHeader>
        <h1 
          id={`tasklist-title-${taskList.id}`}
          className="text-2xl font-bold text-gray-900 dark:text-white"
        >
          {taskList.name}
        </h1>
        <div 
          id={`tasklist-description-${taskList.id}`}
          className="sr-only"
        >
          タスクリスト: {taskList.name}、{totalCount}件中{completedCount}件完了
        </div>
        <div 
          className="flex space-x-2"
          role="toolbar"
          aria-label="タスクリスト操作"
        >
          <Button
            variant="secondary"
            size="sm"
            icon="sort"
            onClick={onSortTasks}
            aria-label="タスクを並び替え"
            title="完了・未完了、日付順でタスクを自動整理"
          >
            {t('tasks.sortTasks')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon="trash"
            onClick={() => {
              if (window.confirm(t('tasks.deleteCompletedConfirm'))) {
                onDeleteCompletedTasks();
              }
            }}
            disabled={completedCount === 0}
            aria-label={`完了済みタスクを削除 (${completedCount}件)`}
            title="完了したタスクを一括で削除"
            aria-describedby={completedCount === 0 ? "no-completed-tasks" : undefined}
          >
            {t('tasks.deleteCompleted')} ({completedCount})
          </Button>
          {completedCount === 0 && (
            <div id="no-completed-tasks" className="sr-only">
              完了済みタスクがありません
            </div>
          )}
          <Button
            variant="secondary"
            size="sm"
            icon="share"
            onClick={onOpenShareModal}
            aria-label="タスクリストを共有"
            title="現在のタスクリストの共有リンクを生成"
          >
            {t('taskList.shareTaskList')}
          </Button>
        </div>
      </CardHeader>

      {isActive && (
        <CardContent className="mb-4 px-0">
          <form 
            onSubmit={(e) => { 
              e.preventDefault(); 
              onAddTask(); 
            }}
            role="form"
            aria-labelledby="task-form-label"
          >
            <div id="task-form-label" className="sr-only">新しいタスク追加フォーム</div>
            <div className="flex space-x-2">
              <Input
                value={newTaskText} 
                onChange={(e) => setNewTaskText(e.target.value)} 
                placeholder={t('tasks.taskPlaceholder')} 
                className="flex-1"
                aria-label="新しいタスクを入力"
                aria-describedby="task-input-hint"
                aria-required="true"
              />
              <div id="task-input-hint" className="sr-only">
                タスク名を入力してエンターキーまたは追加ボタンで追加。「今日 タスク名」や「明日 タスク名」で期限も設定可能
              </div>
              <Button
                type="submit"
                variant="primary"
                icon="plus"
                disabled={!newTaskText.trim()} 
                aria-label="タスクを追加"
                aria-describedby={!newTaskText.trim() ? "add-task-disabled-hint" : undefined}
              >
                {t('tasks.addTask')}
              </Button>
              {!newTaskText.trim() && (
                <div id="add-task-disabled-hint" className="sr-only">
                  タスク名を入力してください
                </div>
              )}
            </div>
          </form>
        </CardContent>
      )}

      {/* ライブリージョン - タスク状態の変更を通知 */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
        id={`task-status-${taskList.id}`}
      >
        {totalCount}件のタスク、{completedCount}件完了
      </div>

      {/* ローディング状態の通知 */}
      {isLoadingTasks && isActive && (
        <CardContent>
          <div 
            role="status" 
            aria-live="polite"
            className="text-center py-8"
          >
            <Icon 
              name="loading" 
              size={24} 
              className="animate-spin motion-reduce:animate-none mx-auto text-primary-500" 
            />
            <span className="sr-only">タスクを読み込み中</span>
          </div>
        </CardContent>
      )}

      {/* タスクリスト */}
      {!isLoadingTasks && (
        <CardContent>
          <main role="main">
            {tasks.length === 0 ? (
              <div 
                className="text-center py-8"
                role="status"
                aria-live="polite"
              >
                <p className="text-gray-500 dark:text-gray-400">
                  タスクがありません
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  上の入力欄から新しいタスクを追加してください
                </p>
              </div>
            ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            >
              <SortableContext
                items={tasks.map(task => task.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul 
                  className="space-y-2"
                  role="list"
                  aria-label={`${taskList.name}のタスク一覧`}
                  aria-describedby={`task-status-${taskList.id}`}
                >
                  {tasks.map((task) => (
                    <SortableTaskItem
                      key={task.id}
                      task={task}
                      selectedTaskId={selectedTaskId}
                      editingTaskId={editingTaskId}
                      editingTaskText={editingTaskText}
                      setEditingTaskText={setEditingTaskText}
                      onToggleTask={onToggleTask}
                      onDeleteTask={onDeleteTask}
                      onStartEditTask={onStartEditTask}
                      onUpdateTaskText={onUpdateTaskText}
                      onCancelEditTask={onCancelEditTask}
                      onSetTaskDate={onSetTaskDate}
                      t={t}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
            )}
          </main>
        </CardContent>
      )}

      {/* 完了済みタスク削除ボタン */}
      {isActive && tasks.length > 0 && (
        <CardFooter className="justify-start">
          <Button
            variant="destructive"
            size="sm"
            icon="trash"
            onClick={() => {
              if (window.confirm(t('tasks.deleteCompletedConfirm'))) {
                onDeleteCompletedTasks();
              }
            }} 
            disabled={completedCount === 0} 
            aria-label={`完了済みタスクを一括削除 (${completedCount}件)`}
            aria-describedby={completedCount === 0 ? "no-completed-tasks-footer" : undefined}
          >
            {t('tasks.deleteCompleted')} ({completedCount})
          </Button>
          {completedCount === 0 && (
            <div id="no-completed-tasks-footer" className="sr-only">
              削除できる完了済みタスクがありません
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
};