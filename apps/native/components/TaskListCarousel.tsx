import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, TextInput } from 'react-native';
import type { TaskList, Task } from '@lightlist/sdk';
import { TaskItem } from './TaskItem';
import { Icon } from './Icon';

interface TaskListCarouselProps {
  taskLists: TaskList[];
  tasksByListId: Record<string, Task[]>;
  currentTaskListIndex: number;
  selectedTaskListId: string | null;
  isLoadingTasks: boolean;
  newTaskText: string;
  editingTaskId: string | null;
  editingTaskText: string;
  isDark: boolean;
  screenWidth: number;
  onAddTask: () => void;
  onToggleTask: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteCompletedTasks: () => void;
  onSortTasks: () => void;
  onStartEditTask: (taskId: string, text: string) => void;
  onUpdateTaskText: (taskId: string) => void;
  onCancelEditTask: () => void;
  onSetTaskDate: (taskId: string) => void;
  onOpenShareModal: () => void;
  onGoToIndex: (index: number) => void;
  setNewTaskText: (text: string) => void;
  setEditingTaskText: (text: string) => void;
}

export const TaskListCarousel = memo<TaskListCarouselProps>(({
  taskLists,
  tasksByListId,
  currentTaskListIndex,
  selectedTaskListId,
  isLoadingTasks,
  newTaskText,
  editingTaskId,
  editingTaskText,
  isDark,
  screenWidth,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onDeleteCompletedTasks,
  onSortTasks,
  onStartEditTask,
  onUpdateTaskText,
  onCancelEditTask,
  onSetTaskDate,
  onOpenShareModal,
  onGoToIndex,
  setNewTaskText,
  setEditingTaskText,
}) => {
  const currentTaskList = useMemo(() => 
    taskLists[currentTaskListIndex], 
    [taskLists, currentTaskListIndex]
  );

  const currentTasks = useMemo(() => 
    currentTaskList ? (tasksByListId[currentTaskList.id] || []) : [],
    [tasksByListId, currentTaskList]
  );

  const completedTasksCount = useMemo(() => 
    currentTasks.filter(task => task.completed).length,
    [currentTasks]
  );

  const renderTaskItem = useCallback(({ item, index }: { item: Task; index: number }) => (
    <TaskItem
      task={item}
      isActive={true}
      editingTaskId={editingTaskId}
      editingTaskText={editingTaskText}
      onToggleTask={onToggleTask}
      onDeleteTask={onDeleteTask}
      onStartEditTask={onStartEditTask}
      onUpdateTaskText={onUpdateTaskText}
      onCancelEditTask={onCancelEditTask}
      onSetTaskDate={onSetTaskDate}
      setEditingTaskText={setEditingTaskText}
    />
  ), [
    editingTaskId,
    editingTaskText,
    onToggleTask,
    onDeleteTask,
    onStartEditTask,
    onUpdateTaskText,
    onCancelEditTask,
    onSetTaskDate,
    setEditingTaskText,
  ]);

  const keyExtractor = useCallback((item: Task, index: number) => item.id, []);

  const ListEmptyComponent = useCallback(() => (
    <View className="flex-1 items-center justify-center py-12">
      <Text className="text-gray-500 dark:text-gray-400 text-lg text-center">
        タスクがありません
      </Text>
      <Text className="text-gray-400 dark:text-gray-500 text-sm text-center mt-2">
        上の入力欄から新しいタスクを追加してください
      </Text>
    </View>
  ), []);

  const ListHeaderComponent = useCallback(() => (
    <View className="mb-6">
      {/* タスク追加フォーム */}
      <View 
        className="flex-row items-center bg-white dark:bg-gray-800 rounded-lg p-3 mb-4"
        accessible={true}
        accessibilityLabel="新しいタスク追加フォーム"
      >
        <TextInput
          value={newTaskText}
          onChangeText={setNewTaskText}
          placeholder="タスクを入力..."
          className="flex-1 text-gray-900 dark:text-white"
          placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
          onSubmitEditing={onAddTask}
          accessible={true}
          accessibilityLabel="新しいタスクを入力"
          accessibilityHint="タスク名を入力してエンターキーで追加。「今日 タスク名」や「明日 タスク名」で期限も設定可能"
          returnKeyType="done"
        />
        <TouchableOpacity 
          onPress={onAddTask}
          disabled={!newTaskText.trim()} 
          className="ml-2 p-3 bg-primary-500 rounded-full disabled:opacity-50"
          accessible={true}
          accessibilityLabel="タスクを追加"
          accessibilityRole="button"
          accessibilityState={{ disabled: !newTaskText.trim() }}
        >
          <Icon name="plus" size={16} color="white" />
        </TouchableOpacity>
      </View>

      {/* タスク操作ツールバー */}
      <View 
        className="flex-row justify-between items-center mb-4"
        accessible={true}
        accessibilityRole="toolbar"
        accessibilityLabel="タスク操作"
      >
        <Text 
          className="text-lg font-semibold text-gray-900 dark:text-white"
          accessible={true}
          accessibilityLabel={`タスク一覧: 全${currentTasks.length}件中${completedTasksCount}件完了`}
        >
          タスク ({currentTasks.length})
        </Text>
        <View className="flex-row space-x-2">
          <TouchableOpacity 
            onPress={onSortTasks}
            className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
            accessible={true}
            accessibilityLabel="タスクを並び替え"
            accessibilityHint="完了・未完了、日付順でタスクを自動整理"
            accessibilityRole="button"
          >
            <Icon name="sort" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={onDeleteCompletedTasks}
            disabled={completedTasksCount === 0}
            className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-50"
            accessible={true}
            accessibilityLabel={`完了済みタスクを削除 (${completedTasksCount}件)`}
            accessibilityHint="完了したタスクを一括で削除"
            accessibilityRole="button"
            accessibilityState={{ disabled: completedTasksCount === 0 }}
          >
            <Icon name="trash" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ), [
    newTaskText,
    setNewTaskText,
    onAddTask,
    isDark,
    currentTasks.length,
    completedTasksCount,
    onSortTasks,
    onDeleteCompletedTasks,
  ]);

  if (!currentTaskList) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-500 dark:text-gray-400 text-lg">
          タスクリストがありません
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ 
        backgroundColor: currentTaskList.background 
          ? currentTaskList.background + '20' 
          : (isDark ? '#111827' : '#F9FAFB') 
      }}
      accessible={true}
      accessibilityLabel={`${currentTaskList.name}のタスク一覧`}
      showsVerticalScrollIndicator={false}
    >
      <View className="p-4">
        {isLoadingTasks ? (
          <View className="flex-1 items-center justify-center py-12">
            <Text className="text-gray-500 dark:text-gray-400">読み込み中...</Text>
          </View>
        ) : (
          <FlatList
            data={currentTasks}
            renderItem={renderTaskItem}
            keyExtractor={keyExtractor}
            ListEmptyComponent={ListEmptyComponent}
            ListHeaderComponent={ListHeaderComponent}
            scrollEnabled={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            windowSize={10}
            initialNumToRender={8}
            getItemLayout={(data, index) => ({
              length: 80, // タスクアイテムの推定高さ
              offset: 80 * index,
              index,
            })}
          />
        )}
      </View>
    </ScrollView>
  );
});

TaskListCarousel.displayName = 'TaskListCarousel';