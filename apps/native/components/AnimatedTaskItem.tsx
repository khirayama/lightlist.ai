import React, { memo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import type { Task } from '@lightlist/sdk';

// アニメーション対応のTouchableOpacity
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

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

interface AnimatedTaskItemProps {
  task: Task;
  isActive: boolean;
  editingTaskId: string | null;
  editingTaskText: string;
  onToggleTask: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  onStartEditTask: (taskId: string, text: string) => void;
  onUpdateTaskText: (taskId: string) => void;
  onCancelEditTask: () => void;
  onSetTaskDate: (taskId: string) => void;
  setEditingTaskText: (text: string) => void;
}

export const AnimatedTaskItem = memo<AnimatedTaskItemProps>(({
  task,
  isActive,
  editingTaskId,
  editingTaskText,
  onToggleTask,
  onDeleteTask,
  onStartEditTask,
  onUpdateTaskText,
  onCancelEditTask,
  onSetTaskDate,
  setEditingTaskText,
}) => {
  const isEditing = editingTaskId === task.id;

  // アニメーション値
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);
  const checkboxScale = useSharedValue(task.completed ? 1 : 0.8);
  const completedOpacity = useSharedValue(task.completed ? 0.7 : 1);

  // タスク完了状態の変更時のアニメーション
  useEffect(() => {
    checkboxScale.value = withSpring(task.completed ? 1.2 : 0.8, {
      duration: 300,
      dampingRatio: 0.8,
    });
    
    completedOpacity.value = withTiming(task.completed ? 0.7 : 1, {
      duration: 300,
    });
  }, [task.completed, checkboxScale, completedOpacity]);

  // エントリーアニメーション
  useEffect(() => {
    scale.value = withSpring(1, { duration: 300, dampingRatio: 0.8 });
    opacity.value = withTiming(1, { duration: 300 });
  }, [scale, opacity]);

  const handleToggle = useCallback(() => {
    // アニメーション付きでタスクを切り替え
    checkboxScale.value = withSpring(1.3, { duration: 150 }, () => {
      checkboxScale.value = withSpring(task.completed ? 0.8 : 1.2, { duration: 200 });
    });
    
    onToggleTask(task.id, !task.completed);
  }, [task.id, task.completed, onToggleTask, checkboxScale]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'タスクの削除',
      `タスク「${task.text}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除', 
          style: 'destructive',
          onPress: () => {
            // 削除アニメーション
            translateX.value = withTiming(-300, { duration: 300 }, () => {
              runOnJS(onDeleteTask)(task.id);
            });
            opacity.value = withTiming(0, { duration: 300 });
            scale.value = withTiming(0.8, { duration: 300 });
          }
        }
      ]
    );
  }, [task.id, task.text, onDeleteTask, translateX, opacity, scale]);

  const handleStartEdit = useCallback(() => {
    scale.value = withSpring(1.02, { duration: 200 });
    onStartEditTask(task.id, task.text);
  }, [task.id, task.text, onStartEditTask, scale]);

  const handleUpdateText = useCallback(() => {
    scale.value = withSpring(1, { duration: 200 });
    onUpdateTaskText(task.id);
  }, [task.id, onUpdateTaskText, scale]);

  const handleSetDate = useCallback(() => {
    scale.value = withSpring(1.05, { duration: 150 }, () => {
      scale.value = withSpring(1, { duration: 150 });
    });
    onSetTaskDate(task.id);
  }, [task.id, onSetTaskDate, scale]);

  const handleTextChange = useCallback((text: string) => {
    setEditingTaskText(text);
  }, [setEditingTaskText]);

  // アニメーションスタイル
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value }
    ],
    opacity: opacity.value,
  }));

  const checkboxAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkboxScale.value }],
  }));

  const completedAnimatedStyle = useAnimatedStyle(() => ({
    opacity: completedOpacity.value,
  }));

  const buttonPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // アクティブでない場合はレンダリングを簡略化
  if (!isActive) {
    return (
      <Animated.View 
        style={[containerAnimatedStyle]}
        className="flex-row items-center p-4 bg-white dark:bg-gray-800 rounded-lg mb-2 opacity-50"
      >
        <Animated.View 
          style={[checkboxAnimatedStyle]}
          className={`w-8 h-8 rounded-full border-2 mr-3 items-center justify-center ${
            task.completed 
              ? 'bg-green-500 border-green-500' 
              : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          {task.completed && (
            <Animated.Text 
              style={[completedAnimatedStyle]}
              className="text-white text-xs"
            >
              ✓
            </Animated.Text>
          )}
        </Animated.View>
        <View className="flex-1 min-w-0">
          <Animated.Text 
            style={[completedAnimatedStyle]}
            className={`text-base ${
              task.completed 
                ? 'text-gray-500 dark:text-gray-400 line-through' 
                : 'text-gray-900 dark:text-white'
            }`}
            numberOfLines={2}
          >
            {task.text}
          </Animated.Text>
          {task.date && (
            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              📅 {task.date}
            </Text>
          )}
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View 
      style={[containerAnimatedStyle]}
      className="flex-row items-center p-4 bg-white dark:bg-gray-800 rounded-lg mb-2"
      accessible={true}
      accessibilityLabel={`タスク: ${task.text}${task.completed ? ' (完了済み)' : ''}${task.date ? `, 期限: ${task.date}` : ''}`}
      accessibilityRole="button"
    >
      {/* チェックボックス */}
      <AnimatedTouchableOpacity 
        onPress={handleToggle}
        style={[checkboxAnimatedStyle]}
        className={`w-8 h-8 rounded-full border-2 mr-3 items-center justify-center ${
          task.completed 
            ? 'bg-green-500 border-green-500' 
            : 'border-gray-300 dark:border-gray-600'
        }`}
        accessible={true}
        accessibilityLabel={task.completed ? "タスクを未完了にする" : "タスクを完了にする"}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {task.completed && (
          <Animated.Text 
            style={[
              completedAnimatedStyle,
              {
                transform: [{ scale: checkboxScale.value }]
              }
            ]}
            className="text-white text-xs"
          >
            ✓
          </Animated.Text>
        )}
      </AnimatedTouchableOpacity>

      {/* タスク内容 */}
      <View className="flex-1 min-w-0">
        {isEditing ? (
          <Animated.View 
            style={[buttonPressStyle]}
            className="flex-row items-center"
          >
            <TextInput
              value={editingTaskText}
              onChangeText={handleTextChange}
              onBlur={handleUpdateText}
              onSubmitEditing={handleUpdateText}
              className="flex-1 text-base text-gray-900 dark:text-white border-b border-primary-500 p-2"
              autoFocus
              accessible={true}
              accessibilityLabel="タスクを編集"
              accessibilityHint="タスク名を編集してエンターキーで保存"
              returnKeyType="done"
              multiline={false}
            />
            <AnimatedTouchableOpacity 
              onPress={onCancelEditTask}
              style={[buttonPressStyle]}
              className="ml-2 p-3"
              accessible={true}
              accessibilityLabel="編集をキャンセル"
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close" size={16} color="#9CA3AF" />
            </AnimatedTouchableOpacity>
          </Animated.View>
        ) : (
          <AnimatedTouchableOpacity 
            onPress={handleStartEdit}
            style={[buttonPressStyle]}
            className="p-2 rounded"
            accessible={true}
            accessibilityLabel={`タスクを編集: ${task.text}`}
            accessibilityHint="タップしてタスクを編集"
            accessibilityRole="button"
          >
            <Animated.Text 
              style={[completedAnimatedStyle]}
              className={`text-base ${
                task.completed 
                  ? 'text-gray-500 dark:text-gray-400 line-through' 
                  : 'text-gray-900 dark:text-white'
              }`}
              numberOfLines={0}
            >
              {task.text}
            </Animated.Text>
          </AnimatedTouchableOpacity>
        )}
        
        {/* 期限表示 */}
        {task.date && (
          <Animated.View 
            style={[
              completedAnimatedStyle,
              {
                transform: [{ scale: scale.value }]
              }
            ]}
            className="mt-1 ml-2"
          >
            <Text 
              className="text-sm text-gray-500 dark:text-gray-400"
              accessible={true}
              accessibilityLabel={`期限: ${task.date}`}
            >
              📅 {task.date}
            </Text>
          </Animated.View>
        )}
      </View>

      {/* アクションボタン */}
      <View 
        className="flex-row space-x-1"
        accessible={true}
        accessibilityLabel="タスク操作"
        accessibilityRole="toolbar"
      >
        <AnimatedTouchableOpacity 
          onPress={handleSetDate}
          style={[buttonPressStyle]}
          className="p-3 rounded"
          accessible={true}
          accessibilityLabel={`期限を設定: ${task.text}`}
          accessibilityHint="タスクの期限を設定または変更"
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="calendar" size={16} color="#9CA3AF" />
        </AnimatedTouchableOpacity>
        
        <AnimatedTouchableOpacity 
          onPress={handleDelete}
          style={[buttonPressStyle]}
          className="p-3 rounded"
          accessible={true}
          accessibilityLabel={`タスクを削除: ${task.text}`}
          accessibilityHint="タスクを削除（確認ダイアログが表示されます）"
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="trash" size={16} color="#9CA3AF" />
        </AnimatedTouchableOpacity>
      </View>
    </Animated.View>
  );
});

AnimatedTaskItem.displayName = 'AnimatedTaskItem';