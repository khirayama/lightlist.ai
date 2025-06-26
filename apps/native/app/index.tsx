import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Platform, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '../contexts/AuthContext';
import { LightlistSDK, type TaskList, type Task } from '@lightlist/sdk';
import { AnimatedTaskListCarousel } from '../components/AnimatedTaskListCarousel';

const sdkClient = new LightlistSDK(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080');

// アイコン用のシンプルなコンポーネント
const Icon = ({ name, size = 24, color = '#6B7280' }: { name: string; size?: number; color?: string }) => {
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
};

const DrawerContent = ({ 
  user, 
  taskLists, 
  selectedTaskListId, 
  isLoadingTaskLists, 
  isDark, 
  handleSelectTaskList, 
  handleOpenAddTaskListModal, 
  handleDeleteTaskList, 
  navigateToSettings, 
  navigateToAuth 
}: any) => (
  <View className="flex-1 bg-white dark:bg-gray-900">
    {/* ドロワーヘッダー */}
    <View className="p-6 border-b border-gray-200 dark:border-gray-700">
      <TouchableOpacity 
        className="flex-row items-center mb-4"
        onPress={navigateToSettings}
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
    <ScrollView className="flex-1 p-4">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        タスクリスト
      </Text>
      
      {isLoadingTaskLists ? (
        <Text className="text-gray-500 dark:text-gray-400">読み込み中...</Text>
      ) : (
        taskLists.map((taskList: TaskList) => (
          <TouchableOpacity
            key={taskList.id}
            className={`flex-row items-center p-3 rounded-lg mb-2 ${
              selectedTaskListId === taskList.id 
                ? 'bg-primary-100 dark:bg-primary-900' 
                : 'bg-gray-50 dark:bg-gray-800'
            }`}
            onPress={() => handleSelectTaskList(taskList.id)}
          >
            <View 
              className="w-4 h-4 rounded mr-3"
              style={{ backgroundColor: taskList.background || '#FFFFFF' }}
            />
            <Text className={`flex-1 font-medium ${
              selectedTaskListId === taskList.id
                ? 'text-primary-700 dark:text-primary-300'
                : 'text-gray-900 dark:text-white'
            }`}>
              {taskList.name}
            </Text>
            <TouchableOpacity onPress={() => handleDeleteTaskList(taskList.id)} className="p-2">
              <Icon name="trash" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      )}

      {/* タスクリスト追加ボタン */}
      <TouchableOpacity 
        onPress={handleOpenAddTaskListModal}
        className="flex-row items-center p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 mt-2"
      >
        <Icon name="plus" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
        <Text className="ml-3 text-gray-600 dark:text-gray-400">
          新しいタスクリスト
        </Text>
      </TouchableOpacity>
    </ScrollView>

    {/* ドロワーフッター */}
    <View className="p-4 border-t border-gray-200 dark:border-gray-700">
      <TouchableOpacity 
        className="py-3 px-4 bg-gray-100 dark:bg-gray-800 rounded-lg"
        onPress={navigateToAuth}
      >
        <Text className="text-center text-gray-700 dark:text-gray-300">
          ログイン / 新規登録
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function HomeScreen() {
  const { user, isLoading, isAuthenticated, accessToken, refreshToken, deviceId } = useAuth();
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(null);
  const [isLoadingTaskLists, setIsLoadingTaskLists] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [isAddTaskListModalOpen, setIsAddTaskListModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [selectedTaskForDate, setSelectedTaskForDate] = useState<string | null>(null);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const { isDark } = useColorScheme();

  // カルーセル機能用の状態
  const [currentTaskListIndex, setCurrentTaskListIndex] = useState(0);
  const [tasksByListId, setTasksByListId] = useState<Record<string, Task[]>>({});

  // 自然言語日付解析関数
  const parseDateFromText = (text: string): { text: string; date?: string } => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    interface PatternWithDate {
      regex: RegExp;
      date: string;
      dateFromText?: never;
    }

    interface PatternWithDateFromText {
      regex: RegExp;
      dateFromText: true;
      date?: never;
    }

    type DatePattern = PatternWithDate | PatternWithDateFromText;

    // 日本語パターン
    const patterns: DatePattern[] = [
      { regex: /^今日\s+(.+)/, date: formatDate(today) },
      { regex: /^明日\s+(.+)/, date: formatDate(tomorrow) },
      { regex: /^(\d{4}\/\d{1,2}\/\d{1,2})\s+(.+)/, dateFromText: true },
      { regex: /^(\d{4}-\d{1,2}-\d{1,2})\s+(.+)/, dateFromText: true },
    ];

    // 英語パターン
    const englishPatterns: DatePattern[] = [
      { regex: /^today\s+(.+)/i, date: formatDate(today) },
      { regex: /^tomorrow\s+(.+)/i, date: formatDate(tomorrow) },
    ];

    const allPatterns = [...patterns, ...englishPatterns];

    for (const pattern of allPatterns) {
      const match = text.match(pattern.regex);
      if (match) {
        if (pattern.dateFromText) {
          const dateStr = match[1];
          const parsedDate = new Date(dateStr.replace(/\//g, '-'));
          if (!isNaN(parsedDate.getTime())) {
            return {
              text: match[2].trim(),
              date: formatDate(parsedDate)
            };
          }
        } else {
          return {
            text: match[1].trim(),
            date: pattern.date
          };
        }
      }
    }

    return { text };
  };

  const fetchTaskLists = async () => {
    if (!user) return;
    try {
      setIsLoadingTaskLists(true);
      setError(null);
      const response = await sdkClient.taskList.getTaskLists();
      if (response.data?.taskLists) {
        setTaskLists(response.data.taskLists);
        if (response.data.taskLists.length > 0 && !selectedTaskListId) {
          setSelectedTaskListId(response.data.taskLists[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch task lists:', err);
      setError('タスクリストの取得に失敗しました');
    } finally {
      setIsLoadingTaskLists(false);
    }
  };

  const fetchTasks = async (taskListId: string) => {
    try {
      setIsLoadingTasks(true);
      setError(null);
      const response = await sdkClient.task.getTasks(taskListId);
      if (response.data?.tasks) {
        setTasks(response.data.tasks);
        setTasksByListId(prev => ({
          ...prev,
          [taskListId]: response.data!.tasks
        }));
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError('タスクの取得に失敗しました');
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // カルーセル関連の関数
  const goToTaskList = (index: number) => {
    if (index >= 0 && index < taskLists.length) {
      setCurrentTaskListIndex(index);
      const taskList = taskLists[index];
      setSelectedTaskListId(taskList.id);
      
      // そのタスクリストのタスクをロード
      if (tasksByListId[taskList.id]) {
        setTasks(tasksByListId[taskList.id]);
      } else {
        fetchTasks(taskList.id);
      }
    }
  };

  const goToPrevTaskList = () => {
    const newIndex = currentTaskListIndex > 0 ? currentTaskListIndex - 1 : taskLists.length - 1;
    goToTaskList(newIndex);
  };

  const goToNextTaskList = () => {
    const newIndex = currentTaskListIndex < taskLists.length - 1 ? currentTaskListIndex + 1 : 0;
    goToTaskList(newIndex);
  };

  const handleCreateTaskList = async () => {
    if (!newListName.trim()) return;
    try {
      setError(null);
      const response = await sdkClient.taskList.createTaskList({ name: newListName.trim() });
      if (response.data?.taskList) {
        fetchTaskLists();
        setNewListName('');
        setIsAddTaskListModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to create task list:', err);
      setError('タスクリストの作成に失敗しました');
    }
  };

  const handleAddTask = async () => {
    if (!selectedTaskListId || !newTaskText.trim()) return;
    try {
      setError(null);
      const parsed = parseDateFromText(newTaskText.trim());
      const response = await sdkClient.task.createTask(selectedTaskListId, { 
        text: parsed.text,
        date: parsed.date || null
      });
      if (response.data?.task) {
        const newTasks = [response.data.task, ...tasks];
        setTasks(newTasks);
        setTasksByListId(prev => ({
          ...prev,
          [selectedTaskListId]: newTasks
        }));
        setNewTaskText('');
      }
    } catch (err) {
      console.error('Failed to add task:', err);
      setError('タスクの追加に失敗しました');
    }
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      setError(null);
      const response = await sdkClient.task.updateTask(taskId, { completed });
      if (response.data?.task && selectedTaskListId) {
        const updatedTasks = tasks.map(task => 
          task.id === taskId ? response.data!.task : task
        );
        setTasks(updatedTasks);
        setTasksByListId(prev => ({
          ...prev,
          [selectedTaskListId]: updatedTasks
        }));
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      setError('タスクの更新に失敗しました');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      setError(null);
      await sdkClient.task.deleteTask(taskId);
      const filteredTasks = tasks.filter(task => task.id !== taskId);
      setTasks(filteredTasks);
      if (selectedTaskListId) {
        setTasksByListId(prev => ({
          ...prev,
          [selectedTaskListId]: filteredTasks
        }));
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('タスクの削除に失敗しました');
    }
  };

  const handleSortTasks = () => {
    const sortedTasks = [...tasks].sort((a, b) => {
      // 1. 完了・未完了で分類（未完了が上）
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      
      // 2. 日付有無で分類（日付ありが上）
      const aHasDate = !!a.date;
      const bHasDate = !!b.date;
      if (aHasDate !== bHasDate) {
        return aHasDate ? -1 : 1;
      }
      
      // 3. 日付順（古い順）
      if (aHasDate && bHasDate) {
        return new Date(a.date!).getTime() - new Date(b.date!).getTime();
      }
      
      // 4. その他は作成日順を維持（新しい順）
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    setTasks(sortedTasks);
    if (selectedTaskListId) {
      setTasksByListId(prev => ({
        ...prev,
        [selectedTaskListId]: sortedTasks
      }));
    }
  };

  const handleUpdateTaskText = async (taskId: string) => {
    if (!editingTaskText.trim()) {
      setEditingTaskId(null);
      return;
    }

    try {
      setError(null);
      const response = await sdkClient.task.updateTask(taskId, { text: editingTaskText.trim() });
      if (response.data?.task && selectedTaskListId) {
        const updatedTasks = tasks.map(task => 
          task.id === taskId ? response.data!.task : task
        );
        setTasks(updatedTasks);
        setTasksByListId(prev => ({
          ...prev,
          [selectedTaskListId]: updatedTasks
        }));
      }
      setEditingTaskId(null);
    } catch (err) {
      console.error('Failed to update task text:', err);
      setError('タスクの更新に失敗しました');
    }
  };

  const handleSetTaskDate = async (taskId: string, date: string | null) => {
    try {
      setError(null);
      const response = await sdkClient.task.updateTask(taskId, { date });
      if (response.data?.task && selectedTaskListId) {
        const updatedTasks = tasks.map(task => 
          task.id === taskId ? response.data!.task : task
        );
        setTasks(updatedTasks);
        setTasksByListId(prev => ({
          ...prev,
          [selectedTaskListId]: updatedTasks
        }));
      }
      setIsDatePickerVisible(false);
      setSelectedTaskForDate(null);
    } catch (err) {
      console.error('Failed to update task date:', err);
      setError('タスクの日付更新に失敗しました');
    }
  };

  const handleDeleteCompletedTasks = async () => {
    const completedTasks = tasks.filter(task => task.completed);
    if (completedTasks.length === 0) return;

    Alert.alert(
      '完了済みタスクの削除',
      '完了済みタスクを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除', 
          style: 'destructive',
          onPress: async () => {
            try {
              setError(null);
              await Promise.all(
                completedTasks.map(task => sdkClient.task.deleteTask(task.id))
              );
              const filteredTasks = tasks.filter(task => !task.completed);
              setTasks(filteredTasks);
              if (selectedTaskListId) {
                setTasksByListId(prev => ({
                  ...prev,
                  [selectedTaskListId]: filteredTasks
                }));
              }
            } catch (err) {
              console.error('Failed to delete completed tasks:', err);
              setError('完了済みタスクの削除に失敗しました');
            }
          }
        }
      ]
    );
  };

  const handleDeleteTaskList = async (taskListId: string) => {
    Alert.alert(
      'タスクリストの削除',
      '本当にこのタスクリストを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除', 
          style: 'destructive',
          onPress: async () => {
            try {
              setError(null);
              await sdkClient.taskList.deleteTaskList(taskListId);
              fetchTaskLists();
            } catch (err) {
              console.error('Failed to delete task list:', err);
              setError('タスクリストの削除に失敗しました');
            }
          }
        }
      ]
    );
  };

  // 共有機能関連の関数
  const handleOpenShareModal = async () => {
    if (!selectedTaskListId) return;
    
    setIsShareModalVisible(true);
    setIsGeneratingShare(true);
    setError(null);
    
    try {
      const response = await sdkClient.share.createShareLink(selectedTaskListId);
      if (response.data) {
        setShareLink(response.data.shareUrl);
      }
    } catch (err) {
      console.error('Failed to create share link:', err);
      setError('共有リンクの生成に失敗しました');
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareLink) return;
    
    try {
      await Clipboard.setStringAsync(shareLink);
      Alert.alert('コピー完了', '共有リンクがクリップボードにコピーされました');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      Alert.alert('エラー', 'リンクのコピーに失敗しました');
    }
  };

  const handleDeleteShareLink = async () => {
    if (!selectedTaskListId) return;
    
    Alert.alert(
      '共有解除',
      '共有リンクを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              setError(null);
              await sdkClient.share.deleteShareLink(selectedTaskListId);
              setShareLink(null);
              setIsShareModalVisible(false);
              Alert.alert('完了', '共有リンクが削除されました');
            } catch (err) {
              console.error('Failed to delete share link:', err);
              setError('共有リンクの削除に失敗しました');
            }
          }
        }
      ]
    );
  };

  const handleCloseShareModal = () => {
    setIsShareModalVisible(false);
    setShareLink(null);
    setIsGeneratingShare(false);
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login' as any);
    } else if (isAuthenticated && accessToken && refreshToken && deviceId) {
      sdkClient.setAuth(accessToken, refreshToken, deviceId);
      fetchTaskLists();
    }
  }, [isLoading, isAuthenticated, accessToken, refreshToken, deviceId]);

  useEffect(() => {
    if (selectedTaskListId) {
      fetchTasks(selectedTaskListId);
    }
  }, [selectedTaskListId]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  // タスクリストが変更されたときにカルーセルの状態を更新
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
  }, [taskLists]);

  const selectedTaskList = taskLists.find(list => list.id === selectedTaskListId);

  if (isLoading) {
    return <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center"><Text className="text-gray-600 dark:text-gray-400">読み込み中...</Text></SafeAreaView>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {isAddTaskListModalOpen && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={isAddTaskListModalOpen}
          onRequestClose={() => setIsAddTaskListModalOpen(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-11/12">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">新しいタスクリストを作成</Text>
              <TextInput
                value={newListName}
                onChangeText={setNewListName}
                placeholder="タスクリスト名"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <View className="mt-4 flex-row justify-end space-x-2">
                <TouchableOpacity onPress={() => setIsAddTaskListModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md">
                  <Text className="text-gray-700 dark:text-gray-300">キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreateTaskList} disabled={!newListName.trim()} className="px-4 py-2 bg-primary-500 rounded-md disabled:opacity-50">
                  <Text className="text-white">作成</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {isDatePickerVisible && selectedTaskForDate && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={isDatePickerVisible}
          onRequestClose={() => setIsDatePickerVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-11/12">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">期限を設定</Text>
              
              <View className="space-y-3 mb-6">
                <TouchableOpacity 
                  onPress={() => handleSetTaskDate(selectedTaskForDate, new Date().toISOString().split('T')[0])}
                  className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
                >
                  <Text className="text-gray-900 dark:text-white text-center">今日</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    handleSetTaskDate(selectedTaskForDate, tomorrow.toISOString().split('T')[0]);
                  }}
                  className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
                >
                  <Text className="text-gray-900 dark:text-white text-center">明日</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => handleSetTaskDate(selectedTaskForDate, null)}
                  className="p-3 bg-red-100 dark:bg-red-900 rounded-lg"
                >
                  <Text className="text-red-700 dark:text-red-300 text-center">期限を削除</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row justify-end space-x-2">
                <TouchableOpacity 
                  onPress={() => setIsDatePickerVisible(false)} 
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                >
                  <Text className="text-gray-700 dark:text-gray-300">キャンセル</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* 共有モーダル */}
      {isShareModalVisible && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={isShareModalVisible}
          onRequestClose={handleCloseShareModal}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-11/12 max-w-md">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                タスクリストを共有
              </Text>
              
              {isGeneratingShare ? (
                <View className="flex items-center justify-center py-8">
                  <View className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"></View>
                  <Text className="text-gray-600 dark:text-gray-400">共有リンクを生成中...</Text>
                </View>
              ) : shareLink ? (
                <View className="space-y-4">
                  <View>
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      共有リンク
                    </Text>
                    <View className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Text className="text-sm text-gray-900 dark:text-white" numberOfLines={2}>
                        {shareLink}
                      </Text>
                    </View>
                  </View>
                  
                  <View className="space-y-3">
                    <TouchableOpacity 
                      onPress={handleCopyShareLink}
                      className="w-full py-3 bg-primary-500 rounded-lg"
                    >
                      <Text className="text-white text-center font-medium">
                        リンクをコピー
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={handleDeleteShareLink}
                      className="w-full py-3 bg-red-500 rounded-lg"
                    >
                      <Text className="text-white text-center font-medium">
                        共有を解除
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View className="py-8 text-center">
                  <Text className="text-gray-600 dark:text-gray-400 mb-4">
                    共有リンクの生成に失敗しました
                  </Text>
                  <TouchableOpacity 
                    onPress={handleOpenShareModal}
                    className="py-2 px-4 bg-primary-500 rounded-lg"
                  >
                    <Text className="text-white text-center">再試行</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View className="mt-6 flex-row justify-end">
                <TouchableOpacity 
                  onPress={handleCloseShareModal} 
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                >
                  <Text className="text-gray-700 dark:text-gray-300">閉じる</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      
      <View className="flex-1 flex-row">
        {(screenWidth >= 768 || isDrawerOpen) && (
          <>
            {screenWidth < 768 && isDrawerOpen && (
              <TouchableOpacity
                className="absolute inset-0 bg-black/50 z-10"
                onPress={() => setIsDrawerOpen(false)}
                activeOpacity={1}
              />
            )}
            <View 
              className={`${
                screenWidth >= 768 
                  ? 'w-80 border-r border-gray-200 dark:border-gray-700' 
                  : 'absolute left-0 top-0 bottom-0 w-80 z-20'
              }`}
            >
              <DrawerContent 
                user={user} 
                taskLists={taskLists} 
                selectedTaskListId={selectedTaskListId} 
                isLoadingTaskLists={isLoadingTaskLists} 
                isDark={isDark} 
                handleSelectTaskList={(id: string) => setSelectedTaskListId(id)} 
                handleOpenAddTaskListModal={() => setIsAddTaskListModalOpen(true)} 
                handleDeleteTaskList={handleDeleteTaskList} 
                navigateToSettings={() => router.push('/settings' as any)} 
                navigateToAuth={() => router.push('/(auth)/login' as any)} 
              />
            </View>
          </>
        )}
        <View className="flex-1">
          {/* ヘッダー部分（ナビゲーションボタン付き） */}
          <View className="flex-row items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <View className="flex-row items-center">
              {screenWidth < 768 && (
                <TouchableOpacity onPress={() => setIsDrawerOpen(true)} className="p-2 mr-2">
                  <Icon name="menu" size={24} color={isDark ? '#fff' : '#1f2937'} />
                </TouchableOpacity>
              )}
              {/* 左矢印ボタン（複数のタスクリストがある場合のみ表示） */}
              {taskLists.length > 1 && (
                <TouchableOpacity 
                  onPress={goToPrevTaskList} 
                  className="p-2 mr-2"
                  accessibilityLabel="前のタスクリスト"
                  accessibilityHint="前のタスクリストに移動"
                  accessibilityRole="button"
                >
                  <Text className="text-gray-600 dark:text-gray-300 text-lg">←</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <Text className="text-xl font-bold text-gray-900 dark:text-white flex-1 text-center">
              {selectedTaskList?.name || 'タスクリスト'}
            </Text>
            
            <View className="flex-row items-center">
              {/* 右矢印ボタン（複数のタスクリストがある場合のみ表示） */}
              {taskLists.length > 1 && (
                <TouchableOpacity 
                  onPress={goToNextTaskList} 
                  className="p-2 ml-2"
                  accessibilityLabel="次のタスクリスト"
                  accessibilityHint="次のタスクリストに移動"
                  accessibilityRole="button"
                >
                  <Text className="text-gray-600 dark:text-gray-300 text-lg">→</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                onPress={handleOpenShareModal} 
                className="p-2 ml-2"
                accessibilityLabel="タスクリストを共有"
                accessibilityHint="現在のタスクリストの共有リンクを生成"
                accessibilityRole="button"
              >
                <Icon name="share" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* AnimatedTaskListCarousel */}
          <AnimatedTaskListCarousel
            taskLists={taskLists}
            tasksByListId={tasksByListId}
            currentTaskListIndex={currentTaskListIndex}
            selectedTaskListId={selectedTaskListId}
            isLoadingTasks={isLoadingTasks}
            newTaskText={newTaskText}
            editingTaskId={editingTaskId}
            editingTaskText={editingTaskText}
            isDark={isDark}
            screenWidth={screenWidth}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onDeleteCompletedTasks={handleDeleteCompletedTasks}
            onSortTasks={handleSortTasks}
            onStartEditTask={(taskId: string, text: string) => {
              setEditingTaskId(taskId);
              setEditingTaskText(text);
            }}
            onUpdateTaskText={handleUpdateTaskText}
            onCancelEditTask={() => setEditingTaskId(null)}
            onSetTaskDate={(taskId: string) => {
              setSelectedTaskForDate(taskId);
              setIsDatePickerVisible(true);
            }}
            onOpenShareModal={handleOpenShareModal}
            onGoToIndex={goToTaskList}
            setNewTaskText={setNewTaskText}
            setEditingTaskText={setEditingTaskText}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}