import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  Layout,
  FadeInDown,
  FadeOutLeft,
} from 'react-native-reanimated';
import type { TaskList, Task } from '@lightlist/sdk';
import { AnimatedTaskItem } from './AnimatedTaskItem';

// アニメーション対応のコンポーネント
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// アイコン用のシンプルなコンポーネント
const Icon = memo(({ name, size = 24, color = '#6B7280' }: { name: string; size?: number; color?: string }) => {
  const icons = {
    menu: '☰',
    settings: '⚙️',
    user: '👤',
    plus: '+',
    share: '🔗',
    sort: '↕️',
    trash: '🗑️',
    calendar: '📅',
    edit: '✏️',
    check: '✓',
    close: '✕',
  };
  
  return (
    <Text style={{ fontSize: size, color }}>
      {icons[name as keyof typeof icons] || '●'}
    </Text>
  );
});

Icon.displayName = 'Icon';

interface AnimatedTaskListCarouselProps {
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

export const AnimatedTaskListCarousel = memo<AnimatedTaskListCarouselProps>(({
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
  // アニメーション値
  const addButtonScale = useSharedValue(1);
  const inputScale = useSharedValue(1);

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

  const handleAddTaskWithAnimation = useCallback(() => {
    // ボタンのアニメーション
    addButtonScale.value = withSpring(1.1, { duration: 150 }, () => {
      addButtonScale.value = withSpring(1, { duration: 150 });
    });
    
    // 入力フィールドのアニメーション
    inputScale.value = withSpring(1.02, { duration: 150 }, () => {
      inputScale.value = withSpring(1, { duration: 150 });
    });
    
    onAddTask();
  }, [addButtonScale, inputScale, onAddTask]);

  const handleSortWithAnimation = useCallback(() => {
    onSortTasks();
  }, [onSortTasks]);

  const handleDeleteCompletedWithAnimation = useCallback(() => {
    onDeleteCompletedTasks();
  }, [onDeleteCompletedTasks]);

  // アニメーションスタイル
  const addButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addButtonScale.value }],
  }));

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inputScale.value }],
  }));

  const renderTaskItem = useCallback(({ item, index }: { item: Task; index: number }) => (
    <Animated.View
      key={item.id}
      entering={FadeInDown.delay(index * 50).springify()}
      exiting={FadeOutLeft.duration(300)}
      layout={Layout.springify()}
    >
      <AnimatedTaskItem
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
    </Animated.View>
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

  const ListEmptyComponent = useCallback(() => (
    <Animated.View 
      entering={FadeInDown.duration(400)}
      className="flex-1 items-center justify-center py-12"
    >
      <Text className="text-gray-500 dark:text-gray-400 text-lg text-center">
        タスクがありません
      </Text>
      <Text className="text-gray-400 dark:text-gray-500 text-sm text-center mt-2">
        上の入力欄から新しいタスクを追加してください
      </Text>
    </Animated.View>
  ), []);

  const ListHeaderComponent = useCallback(() => (
    <Animated.View 
      entering={FadeInDown.duration(300)}
      className="mb-6"
    >
      {/* タスク追加フォーム */}
      <Animated.View 
        style={[inputAnimatedStyle]}
        className="flex-row items-center bg-white dark:bg-gray-800 rounded-lg p-3 mb-4"
        accessible={true}
        accessibilityLabel="新しいタスク追加フォーム"
      >
        <AnimatedTextInput
          value={newTaskText}
          onChangeText={setNewTaskText}
          placeholder="タスクを入力..."
          className="flex-1 text-gray-900 dark:text-white"
          placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
          onSubmitEditing={handleAddTaskWithAnimation}
          accessible={true}
          accessibilityLabel="新しいタスクを入力"
          accessibilityHint="タスク名を入力してエンターキーで追加。「今日 タスク名」や「明日 タスク名」で期限も設定可能"
          returnKeyType="done"
        />
        <AnimatedTouchableOpacity 
          onPress={handleAddTaskWithAnimation}
          disabled={!newTaskText.trim()} 
          style={[addButtonAnimatedStyle]}
          className="ml-2 p-3 bg-primary-500 rounded-full disabled:opacity-50"
          accessible={true}
          accessibilityLabel="タスクを追加"
          accessibilityRole="button"
          accessibilityState={{ disabled: !newTaskText.trim() }}
        >
          <Icon name="plus" size={16} color="white" />
        </AnimatedTouchableOpacity>
      </Animated.View>

      {/* タスク操作ツールバー */}
      <Animated.View 
        entering={FadeInDown.delay(100).duration(300)}
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
          <AnimatedTouchableOpacity 
            onPress={handleSortWithAnimation}
            className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
            accessible={true}
            accessibilityLabel="タスクを並び替え"
            accessibilityHint="完了・未完了、日付順でタスクを自動整理"
            accessibilityRole="button"
          >
            <Icon name="sort" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
          </AnimatedTouchableOpacity>
          <AnimatedTouchableOpacity 
            onPress={handleDeleteCompletedWithAnimation}
            disabled={completedTasksCount === 0}
            className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-50"
            accessible={true}
            accessibilityLabel={`完了済みタスクを削除 (${completedTasksCount}件)`}
            accessibilityHint="完了したタスクを一括で削除"
            accessibilityRole="button"
            accessibilityState={{ disabled: completedTasksCount === 0 }}
          >
            <Icon name="trash" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
          </AnimatedTouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  ), [
    newTaskText,
    setNewTaskText,
    handleAddTaskWithAnimation,
    isDark,
    currentTasks.length,
    completedTasksCount,
    handleSortWithAnimation,
    handleDeleteCompletedWithAnimation,
    inputAnimatedStyle,
    addButtonAnimatedStyle,
  ]);

  if (!currentTaskList) {
    return (
      <Animated.View 
        entering={FadeInDown.duration(400)}
        className="flex-1 items-center justify-center"
      >
        <Text className="text-gray-500 dark:text-gray-400 text-lg">
          タスクリストがありません
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.ScrollView
      entering={FadeInDown.duration(400)}
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
          <Animated.View 
            entering={FadeInDown.duration(300)}
            className="flex-1 items-center justify-center py-12"
          >
            <Text className="text-gray-500 dark:text-gray-400">読み込み中...</Text>
          </Animated.View>
        ) : (
          <Animated.View layout={Layout.springify()}>
            {ListHeaderComponent()}
            
            {currentTasks.length === 0 ? (
              <ListEmptyComponent />
            ) : (
              <Animated.View layout={Layout.springify()}>
                {currentTasks.map((item, index) => 
                  renderTaskItem({ item, index })
                )}
              </Animated.View>
            )}
          </Animated.View>
        )}
      </View>
    </Animated.ScrollView>
  );
});

AnimatedTaskListCarousel.displayName = 'AnimatedTaskListCarousel';