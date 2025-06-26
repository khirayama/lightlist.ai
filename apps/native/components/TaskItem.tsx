import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import type { Task } from '@lightlist/sdk';
import { Icon } from './Icon';

interface TaskItemProps {
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

export const TaskItem = memo<TaskItemProps>(({
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

  const handleToggle = useCallback(() => {
    onToggleTask(task.id, !task.completed);
  }, [task.id, task.completed, onToggleTask]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'タスクの削除',
      `タスク「${task.text}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除', 
          style: 'destructive',
          onPress: () => onDeleteTask(task.id)
        }
      ]
    );
  }, [task.id, task.text, onDeleteTask]);

  const handleStartEdit = useCallback(() => {
    onStartEditTask(task.id, task.text);
  }, [task.id, task.text, onStartEditTask]);

  const handleUpdateText = useCallback(() => {
    onUpdateTaskText(task.id);
  }, [task.id, onUpdateTaskText]);

  const handleSetDate = useCallback(() => {
    onSetTaskDate(task.id);
  }, [task.id, onSetTaskDate]);

  const handleTextChange = useCallback((text: string) => {
    setEditingTaskText(text);
  }, [setEditingTaskText]);

  // アクティブでない場合はレンダリングを簡略化
  if (!isActive) {
    return (
      <View 
        className="flex-row items-center p-4 bg-white dark:bg-gray-800 rounded-lg mb-2 opacity-50"
      >
        <View 
          className={`w-8 h-8 rounded-full border-2 mr-3 items-center justify-center ${
            task.completed 
              ? 'bg-green-500 border-green-500' 
              : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          {task.completed && (
            <Text className="text-white text-xs">✓</Text>
          )}
        </View>
        <View className="flex-1 min-w-0">
          <Text 
            className={`text-base ${
              task.completed 
                ? 'text-gray-500 dark:text-gray-400 line-through' 
                : 'text-gray-900 dark:text-white'
            }`}
            numberOfLines={2}
          >
            {task.text}
          </Text>
          {task.date && (
            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              📅 {task.date}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View 
      className="flex-row items-center p-4 bg-white dark:bg-gray-800 rounded-lg mb-2"
      accessible={true}
      accessibilityLabel={`タスク: ${task.text}${task.completed ? ' (完了済み)' : ''}${task.date ? `, 期限: ${task.date}` : ''}`}
      accessibilityRole="button"
    >
      {/* チェックボックス */}
      <TouchableOpacity 
        onPress={handleToggle}
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
          <Text className="text-white text-xs">✓</Text>
        )}
      </TouchableOpacity>

      {/* タスク内容 */}
      <View className="flex-1 min-w-0">
        {isEditing ? (
          <View className="flex-row items-center">
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
            <TouchableOpacity 
              onPress={onCancelEditTask}
              className="ml-2 p-3"
              accessible={true}
              accessibilityLabel="編集をキャンセル"
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            onPress={handleStartEdit}
            className="p-2 rounded"
            accessible={true}
            accessibilityLabel={`タスクを編集: ${task.text}`}
            accessibilityHint="タップしてタスクを編集"
            accessibilityRole="button"
          >
            <Text 
              className={`text-base ${
                task.completed 
                  ? 'text-gray-500 dark:text-gray-400 line-through' 
                  : 'text-gray-900 dark:text-white'
              }`}
              numberOfLines={0}
            >
              {task.text}
            </Text>
          </TouchableOpacity>
        )}
        
        {/* 期限表示 */}
        {task.date && (
          <View className="mt-1 ml-2">
            <Text 
              className="text-sm text-gray-500 dark:text-gray-400"
              accessible={true}
              accessibilityLabel={`期限: ${task.date}`}
            >
              📅 {task.date}
            </Text>
          </View>
        )}
      </View>

      {/* アクションボタン */}
      <View 
        className="flex-row space-x-1"
        accessible={true}
        accessibilityLabel="タスク操作"
        accessibilityRole="toolbar"
      >
        <TouchableOpacity 
          onPress={handleSetDate}
          className="p-3 rounded"
          accessible={true}
          accessibilityLabel={`期限を設定: ${task.text}`}
          accessibilityHint="タスクの期限を設定または変更"
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="calendar" size={16} color="#9CA3AF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={handleDelete}
          className="p-3 rounded"
          accessible={true}
          accessibilityLabel={`タスクを削除: ${task.text}`}
          accessibilityHint="タスクを削除（確認ダイアログが表示されます）"
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="trash" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

TaskItem.displayName = 'TaskItem';