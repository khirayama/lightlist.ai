import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import type { TaskList, User } from '@lightlist/sdk';
import { Icon } from './Icon';

interface TaskListItemProps {
  item: TaskList;
  selectedTaskListId: string | null;
  isDark: boolean;
  onSelectTaskList: (taskListId: string) => void;
  onDeleteTaskList: (taskListId: string) => void;
}

const TaskListItem = memo<TaskListItemProps>(({ 
  item, 
  selectedTaskListId, 
  isDark, 
  onSelectTaskList, 
  onDeleteTaskList 
}) => {
  const handleSelect = useCallback(() => {
    onSelectTaskList(item.id);
  }, [item.id, onSelectTaskList]);

  const handleDelete = useCallback(() => {
    onDeleteTaskList(item.id);
  }, [item.id, onDeleteTaskList]);

  const isSelected = selectedTaskListId === item.id;

  return (
    <TouchableOpacity
      className={`flex-row items-center p-3 rounded-lg mb-2 ${
        isSelected
          ? 'bg-primary-100 dark:bg-primary-900' 
          : 'bg-gray-50 dark:bg-gray-800'
      }`}
      onPress={handleSelect}
      accessible={true}
      accessibilityLabel={`タスクリスト: ${item.name}${isSelected ? ' (選択中)' : ''}`}
      accessibilityRole="button"
    >
      <View 
        className="w-4 h-4 rounded mr-3"
        style={{ backgroundColor: item.background || '#FFFFFF' }}
      />
      <Text className={`flex-1 font-medium ${
        isSelected
          ? 'text-primary-700 dark:text-primary-300'
          : 'text-gray-900 dark:text-white'
      }`}>
        {item.name}
      </Text>
      <TouchableOpacity 
        onPress={handleDelete} 
        className="p-2"
        accessible={true}
        accessibilityLabel={`タスクリストを削除: ${item.name}`}
        accessibilityRole="button"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name="trash" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

TaskListItem.displayName = 'TaskListItem';

interface DrawerContentProps {
  user: User | null;
  taskLists: TaskList[];
  selectedTaskListId: string | null;
  isLoadingTaskLists: boolean;
  isDark: boolean;
  onSelectTaskList: (taskListId: string) => void;
  onOpenAddTaskListModal: () => void;
  onDeleteTaskList: (taskListId: string) => void;
  onNavigateToSettings: () => void;
  onNavigateToAuth: () => void;
}

export const DrawerContent = memo<DrawerContentProps>(({
  user,
  taskLists,
  selectedTaskListId,
  isLoadingTaskLists,
  isDark,
  onSelectTaskList,
  onOpenAddTaskListModal,
  onDeleteTaskList,
  onNavigateToSettings,
  onNavigateToAuth,
}) => {
  const renderTaskListItem = useCallback(({ item }: { item: TaskList }) => (
    <TaskListItem
      item={item}
      selectedTaskListId={selectedTaskListId}
      isDark={isDark}
      onSelectTaskList={onSelectTaskList}
      onDeleteTaskList={onDeleteTaskList}
    />
  ), [selectedTaskListId, isDark, onSelectTaskList, onDeleteTaskList]);

  const keyExtractor = useCallback((item: TaskList) => item.id, []);

  const ListEmptyComponent = useCallback(() => (
    <Text className="text-gray-500 dark:text-gray-400 text-center py-4">
      タスクリストがありません
    </Text>
  ), []);

  const ListHeaderComponent = useCallback(() => (
    <>
      <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        タスクリスト
      </Text>
      {isLoadingTaskLists && (
        <Text className="text-gray-500 dark:text-gray-400 text-center py-4">
          読み込み中...
        </Text>
      )}
    </>
  ), [isLoadingTaskLists]);

  const ListFooterComponent = useCallback(() => (
    <TouchableOpacity 
      onPress={onOpenAddTaskListModal}
      className="flex-row items-center p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 mt-2"
      accessible={true}
      accessibilityLabel="新しいタスクリストを追加"
      accessibilityRole="button"
    >
      <Icon name="plus" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
      <Text className="ml-3 text-gray-600 dark:text-gray-400">
        新しいタスクリスト
      </Text>
    </TouchableOpacity>
  ), [onOpenAddTaskListModal, isDark]);

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      {/* ドロワーヘッダー */}
      <View className="p-6 border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity 
          className="flex-row items-center mb-4"
          onPress={onNavigateToSettings}
          accessible={true}
          accessibilityLabel="設定画面に移動"
          accessibilityRole="button"
        >
          <Icon name="user" size={24} color={isDark ? '#fff' : '#1f2937'} />
          <Text className="ml-3 text-lg font-semibold text-gray-900 dark:text-white">
            {user?.email || 'ユーザー'}
          </Text>
          <View className="ml-auto">
            <Icon name="settings" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
          </View>
        </TouchableOpacity>
      </View>

      {/* タスクリスト一覧 */}
      <View className="flex-1 p-4">
        <FlatList
          data={taskLists}
          renderItem={renderTaskListItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={ListEmptyComponent}
          ListHeaderComponent={ListHeaderComponent}
          ListFooterComponent={ListFooterComponent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          windowSize={10}
          initialNumToRender={8}
          getItemLayout={(data, index) => ({
            length: 56, // 固定の高さ（推定値）
            offset: 56 * index,
            index,
          })}
        />
      </View>

      {/* ドロワーフッター */}
      <View className="p-4 border-t border-gray-200 dark:border-gray-700">
        <TouchableOpacity 
          className="py-3 px-4 bg-gray-100 dark:bg-gray-800 rounded-lg"
          onPress={onNavigateToAuth}
          accessible={true}
          accessibilityLabel="ログインまたは新規登録画面に移動"
          accessibilityRole="button"
        >
          <Text className="text-center text-gray-700 dark:text-gray-300">
            ログイン / 新規登録
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

DrawerContent.displayName = 'DrawerContent';