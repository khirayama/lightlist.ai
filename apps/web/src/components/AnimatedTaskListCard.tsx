import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TaskList, Task } from '@lightlist/sdk';

interface AnimatedTaskListCardProps {
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

// アニメーション設定
const taskItemVariants = {
  hidden: { 
    opacity: 0, 
    y: -20, 
    scale: 0.95,
    transition: { duration: 0.2 }
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut' as const }
  },
  exit: { 
    opacity: 0, 
    x: -300, 
    scale: 0.95,
    transition: { duration: 0.2, ease: 'easeIn' as const }
  }
};

const checkboxVariants = {
  unchecked: { scale: 1, rotate: 0 },
  checked: { 
    scale: [1, 1.2, 1], 
    rotate: [0, 10, 0],
    transition: { duration: 0.3, ease: 'easeOut' as const }
  }
};

const formVariants = {
  idle: { scale: 1 },
  submitting: { 
    scale: [1, 1.02, 1],
    transition: { duration: 0.2 }
  }
};

const loadingVariants = {
  animate: {
    rotate: 360,
    transition: { duration: 1, repeat: Infinity, ease: 'linear' as const }
  }
};

export const AnimatedTaskListCard: React.FC<AnimatedTaskListCardProps> = ({
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

  const completedCount = tasks.filter(task => task.completed).length;
  const totalCount = tasks.length;

  const handleAddTaskWithAnimation = async () => {
    // フォームのアニメーション効果を追加
    onAddTask();
  };

  const handleToggleTaskWithAnimation = (taskId: string, completed: boolean) => {
    onToggleTask(taskId, completed);
  };

  const handleDeleteTaskWithAnimation = (taskId: string, taskText: string) => {
    if (window.confirm(`タスク「${taskText}」を削除しますか？`)) {
      onDeleteTask(taskId);
    }
  };

  return (
    <motion.section 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
      role="region"
      aria-labelledby={`tasklist-title-${taskList.id}`}
      aria-describedby={`tasklist-description-${taskList.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <header className="flex items-center justify-between mb-6">
        <motion.h1 
          id={`tasklist-title-${taskList.id}`}
          className="text-2xl font-bold text-gray-900 dark:text-white"
          layout
        >
          {taskList.name}
        </motion.h1>
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
          <motion.button 
            onClick={onSortTasks}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            aria-label="タスクを並び替え"
            title="完了・未完了、日付順でタスクを自動整理"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {t('tasks.sortTasks')}
          </motion.button>
          <motion.button 
            onClick={() => {
              if (window.confirm(t('tasks.deleteCompletedConfirm'))) {
                onDeleteCompletedTasks();
              }
            }}
            disabled={completedCount === 0}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            aria-label={`完了済みタスクを削除 (${completedCount}件)`}
            title="完了したタスクを一括で削除"
            aria-describedby={completedCount === 0 ? "no-completed-tasks" : undefined}
            whileHover={completedCount > 0 ? { scale: 1.05 } : {}}
            whileTap={completedCount > 0 ? { scale: 0.95 } : {}}
          >
            {t('tasks.deleteCompleted')} ({completedCount})
          </motion.button>
          {completedCount === 0 && (
            <div id="no-completed-tasks" className="sr-only">
              完了済みタスクがありません
            </div>
          )}
          <motion.button 
            onClick={onOpenShareModal}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            aria-label="タスクリストを共有"
            title="現在のタスクリストの共有リンクを生成"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {t('taskList.shareTaskList')}
          </motion.button>
        </div>
      </header>

      {isActive && (
        <motion.div 
          className="mb-4"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.form 
            onSubmit={(e) => { 
              e.preventDefault(); 
              handleAddTaskWithAnimation(); 
            }}
            role="form"
            aria-labelledby="task-form-label"
            variants={formVariants}
            animate={newTaskText.trim() ? 'submitting' : 'idle'}
          >
            <div id="task-form-label" className="sr-only">新しいタスク追加フォーム</div>
            <div className="flex space-x-2">
              <motion.input 
                type="text" 
                value={newTaskText} 
                onChange={(e) => setNewTaskText(e.target.value)} 
                placeholder={t('tasks.taskPlaceholder')} 
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                aria-label="新しいタスクを入力"
                aria-describedby="task-input-hint"
                aria-required="true"
                whileFocus={{ scale: 1.01 }}
              />
              <div id="task-input-hint" className="sr-only">
                タスク名を入力してエンターキーまたは追加ボタンで追加。「今日 タスク名」や「明日 タスク名」で期限も設定可能
              </div>
              <motion.button 
                type="submit"
                disabled={!newTaskText.trim()} 
                className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label="タスクを追加"
                aria-describedby={!newTaskText.trim() ? "add-task-disabled-hint" : undefined}
                whileHover={newTaskText.trim() ? { scale: 1.05 } : {}}
                whileTap={newTaskText.trim() ? { scale: 0.95 } : {}}
              >
                {t('tasks.addTask')}
              </motion.button>
              {!newTaskText.trim() && (
                <div id="add-task-disabled-hint" className="sr-only">
                  タスク名を入力してください
                </div>
              )}
            </div>
          </motion.form>
        </motion.div>
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
        <motion.div 
          role="status" 
          aria-live="polite"
          className="text-center py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"
            variants={loadingVariants}
            animate="animate"
          />
          <span className="sr-only">タスクを読み込み中</span>
        </motion.div>
      )}

      {/* タスクリスト */}
      {!isLoadingTasks && (
        <main role="main">
          {tasks.length === 0 ? (
            <motion.div 
              className="text-center py-8"
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-gray-500 dark:text-gray-400">
                タスクがありません
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                上の入力欄から新しいタスクを追加してください
              </p>
            </motion.div>
          ) : (
            <motion.ul 
              className="space-y-2"
              role="list"
              aria-label={`${taskList.name}のタスク一覧`}
              aria-describedby={`task-status-${taskList.id}`}
              layout
            >
              <AnimatePresence mode="popLayout">
                {tasks.map((task) => (
                  <motion.li 
                    key={task.id}
                    variants={taskItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                  >
                    <motion.article 
                      className={`flex items-center space-x-3 p-3 border rounded-md transition-colors ${
                        selectedTaskId === task.id 
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                          : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      aria-labelledby={`task-${task.id}-content`}
                      aria-describedby={`task-${task.id}-status`}
                      role="article"
                      whileHover={{ scale: 1.01 }}
                      layout
                    >
                      {/* タスクの状態 */}
                      <div id={`task-${task.id}-status`} className="sr-only">
                        {task.completed ? '完了済み' : '未完了'}
                        {task.date && `, 期限: ${task.date}`}
                      </div>

                      {/* チェックボックス */}
                      <div className="flex-shrink-0">
                        <motion.div
                          variants={checkboxVariants}
                          animate={task.completed ? 'checked' : 'unchecked'}
                        >
                          <input 
                            type="checkbox" 
                            id={`task-checkbox-${task.id}`}
                            checked={task.completed} 
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleTaskWithAnimation(task.id, e.target.checked);
                            }} 
                            className="h-4 w-4 text-primary-500 focus:ring-primary-500 focus:ring-offset-2 border-gray-300 rounded" 
                            aria-label={task.completed ? "タスクを未完了にする" : "タスクを完了にする"}
                            aria-describedby={`task-${task.id}-content`}
                          />
                        </motion.div>
                      </div>

                      {/* タスク内容 */}
                      <div className="flex-1 min-w-0">
                        {editingTaskId === task.id ? (
                          <div className="flex items-center">
                            <motion.input 
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
                              initial={{ scale: 0.98 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.2 }}
                            />
                            <div id={`task-edit-hint-${task.id}`} className="sr-only">
                              タスク名を編集してエンターキーで保存、エスケープキーでキャンセル
                            </div>
                          </div>
                        ) : (
                          <motion.button 
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
                            animate={task.completed ? { opacity: 0.7 } : { opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <span className="break-words">{task.text}</span>
                          </motion.button>
                        )}
                        
                        {/* 期限表示 */}
                        {task.date && (
                          <motion.div 
                            className="mt-1"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <span 
                              className="text-sm text-gray-500 dark:text-gray-400"
                              aria-label={`期限: ${task.date}`}
                            >
                              📅 {task.date}
                            </span>
                          </motion.div>
                        )}
                      </div>

                      {/* アクションボタン */}
                      <div 
                        className="flex items-center space-x-2 flex-shrink-0"
                        role="group"
                        aria-label="タスク操作"
                      >
                        <motion.button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetTaskDate(task.id);
                          }} 
                          className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded" 
                          title={t('tasks.setDueDate')}
                          aria-label={`期限を設定: ${task.text}`}
                          aria-describedby={`task-date-hint-${task.id}`}
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          📅
                        </motion.button>
                        <div id={`task-date-hint-${task.id}`} className="sr-only">
                          タスク「{task.text}」の期限を設定または変更
                        </div>
                        
                        <motion.button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTaskWithAnimation(task.id, task.text);
                          }} 
                          className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
                          aria-label={`タスクを削除: ${task.text}`}
                          title="タスクを削除"
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          🗑️
                        </motion.button>
                      </div>
                    </motion.article>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </main>
      )}

      {/* 完了済みタスク削除ボタン */}
      {isActive && tasks.length > 0 && (
        <motion.footer 
          className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <motion.button 
            onClick={() => {
              if (window.confirm(t('tasks.deleteCompletedConfirm'))) {
                onDeleteCompletedTasks();
              }
            }} 
            disabled={completedCount === 0} 
            className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded px-2 py-1"
            aria-label={`完了済みタスクを一括削除 (${completedCount}件)`}
            aria-describedby={completedCount === 0 ? "no-completed-tasks-footer" : undefined}
            whileHover={completedCount > 0 ? { scale: 1.05 } : {}}
            whileTap={completedCount > 0 ? { scale: 0.95 } : {}}
          >
            {t('tasks.deleteCompleted')} ({completedCount})
          </motion.button>
          {completedCount === 0 && (
            <div id="no-completed-tasks-footer" className="sr-only">
              削除できる完了済みタスクがありません
            </div>
          )}
        </motion.footer>
      )}
    </motion.section>
  );
};