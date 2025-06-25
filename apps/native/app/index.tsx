import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '../contexts/AuthContext';

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
  };
  
  return (
    <Text style={{ fontSize: size, color }}>
      {icons[name as keyof typeof icons] || '●'}
    </Text>
  );
};

// ダミーデータ
const taskLists = [
  {
    id: '1',
    name: '📝個人',
    background: '#FFE4E1',
    tasks: [
      { id: '1', text: '買い物リスト作成', completed: false, date: null },
      { id: '2', text: 'ミーティング資料準備', completed: true, date: '2025-06-25' },
      { id: '3', text: 'プロジェクト企画書レビュー', completed: false, date: '2025-06-26' },
    ]
  },
  {
    id: '2', 
    name: '💼仕事',
    background: '#E6E6FA',
    tasks: [
      { id: '4', text: 'クライアント打ち合わせ', completed: false, date: '2025-06-24' },
      { id: '5', text: '月次レポート作成', completed: false, date: '2025-06-28' },
    ]
  }
];

export default function HomeScreen() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTaskListIndex, setSelectedTaskListIndex] = useState(0);
  const [newTaskText, setNewTaskText] = useState('');
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const colorScheme = useColorScheme();

  // 認証チェック
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login' as any);
    }
  }, [isLoading, isAuthenticated]);

  // Web環境でのウィンドウリサイズ対応
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleResize = () => {
        setScreenWidth(window.innerWidth);
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    } else {
      const subscription = Dimensions.addEventListener('change', ({ window }) => {
        setScreenWidth(window.width);
      });
      
      return () => subscription?.remove();
    }
  }, []);

  // Web環境用のshadowスタイル
  const getShadowStyle = () => {
    if (Platform.OS === 'web') {
      return {
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      };
    }
    return {};
  };

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const navigateToSettings = () => {
    setIsDrawerOpen(false);
    router.push('/settings' as any);
  };

  const navigateToAuth = () => {
    setIsDrawerOpen(false);
    router.push('/(auth)/login' as any);
  };

  // ローディング中は空の画面を表示
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center">
        <Text className="text-gray-600 dark:text-gray-400">読み込み中...</Text>
      </SafeAreaView>
    );
  }

  // 未認証の場合は何も表示しない（useEffectでリダイレクト）
  if (!isAuthenticated) {
    return null;
  }

  const selectedTaskList = taskLists[selectedTaskListIndex];

  // ドロワーコンテンツ
  const DrawerContent = () => (
    <View className="flex-1 bg-white dark:bg-gray-900">
      {/* ドロワーヘッダー */}
      <View className="p-6 border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity 
          className="flex-row items-center mb-4"
          onPress={navigateToSettings}
        >
          <Icon name="user" size={24} color={colorScheme === 'dark' ? '#fff' : '#1f2937'} />
          <Text className="ml-3 text-lg font-semibold text-gray-900 dark:text-white">
            {user?.email || 'ユーザー'}
          </Text>
          <View className="ml-auto">
            <Icon name="settings" size={20} color={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'} />
          </View>
        </TouchableOpacity>
      </View>

      {/* タスクリスト一覧 */}
      <ScrollView className="flex-1 p-4">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          タスクリスト
        </Text>
        
        {taskLists.map((taskList, index) => (
          <TouchableOpacity
            key={taskList.id}
            className={`flex-row items-center p-3 rounded-lg mb-2 ${
              selectedTaskListIndex === index 
                ? 'bg-primary-100 dark:bg-primary-900' 
                : 'bg-gray-50 dark:bg-gray-800'
            }`}
            onPress={() => {
              setSelectedTaskListIndex(index);
              setIsDrawerOpen(false);
            }}
          >
            <View 
              className="w-4 h-4 rounded mr-3"
              style={{ backgroundColor: taskList.background }}
            />
            <Text className={`flex-1 font-medium ${
              selectedTaskListIndex === index
                ? 'text-primary-700 dark:text-primary-300'
                : 'text-gray-900 dark:text-white'
            }`}>
              {taskList.name}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {taskList.tasks.length}
            </Text>
          </TouchableOpacity>
        ))}

        {/* タスクリスト追加ボタン */}
        <TouchableOpacity 
          className="flex-row items-center p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 mt-2"
        >
          <Icon name="plus" size={20} color={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'} />
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

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-1 flex-row">
        {/* ドロワー（PC・タブレット：サイドバー、モバイル：オーバーレイ） */}
        {(screenWidth >= 768 || isDrawerOpen) && (
          <>
            {/* オーバーレイ（モバイルのみ） */}
            {screenWidth < 768 && isDrawerOpen && (
              <TouchableOpacity
                className="absolute inset-0 bg-black/50 z-10"
                onPress={toggleDrawer}
                activeOpacity={1}
              />
            )}
            
            {/* ドロワーコンテンツ */}
            <View 
              className={`${
                screenWidth >= 768 
                  ? 'w-80 border-r border-gray-200 dark:border-gray-700' 
                  : 'absolute left-0 top-0 bottom-0 w-80 z-20'
              }`}
            >
              <DrawerContent />
            </View>
          </>
        )}

        {/* メインコンテンツ */}
        <View className="flex-1">
          {/* ヘッダー */}
          <View className="flex-row items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            {screenWidth < 768 && (
              <TouchableOpacity onPress={toggleDrawer} className="p-2">
                <Icon name="menu" size={24} color={colorScheme === 'dark' ? '#fff' : '#1f2937'} />
              </TouchableOpacity>
            )}
            
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              {selectedTaskList.name}
            </Text>
            
            <TouchableOpacity className="p-2">
              <Icon name="share" size={20} color={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
          </View>

          {/* タスクリストコンテンツ */}
          <ScrollView 
            className="flex-1"
            style={{ backgroundColor: selectedTaskList.background + '20' }}
          >
            <View className="p-4">
              {/* タスク追加フィールド */}
              <View className="mb-6">
                <View 
                  className={`flex-row items-center bg-white dark:bg-gray-800 rounded-lg p-3 ${Platform.OS !== 'web' ? 'shadow-sm' : ''}`}
                  style={getShadowStyle()}
                >
                  <Text className="flex-1 text-gray-600 dark:text-gray-400">
                    タスクを入力...
                  </Text>
                  <TouchableOpacity className="ml-2 p-2 bg-primary-500 rounded-full">
                    <Icon name="plus" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ツールバー */}
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                  タスク ({selectedTaskList.tasks.length})
                </Text>
                
                <View className="flex-row space-x-2">
                  <TouchableOpacity 
                    className={`p-2 bg-white dark:bg-gray-800 rounded-lg ${Platform.OS !== 'web' ? 'shadow-sm' : ''}`}
                    style={getShadowStyle()}
                  >
                    <Icon name="sort" size={20} color={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    className={`p-2 bg-white dark:bg-gray-800 rounded-lg ${Platform.OS !== 'web' ? 'shadow-sm' : ''}`}
                    style={getShadowStyle()}
                  >
                    <Icon name="trash" size={20} color={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* タスクリスト */}
              <View className="space-y-2">
                {selectedTaskList.tasks.map((task) => (
                  <View 
                    key={task.id}
                    className={`flex-row items-center p-4 bg-white dark:bg-gray-800 rounded-lg ${Platform.OS !== 'web' ? 'shadow-sm' : ''}`}
                    style={getShadowStyle()}
                  >
                    <TouchableOpacity 
                      className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
                        task.completed 
                          ? 'bg-success-500 border-success-500' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {task.completed && (
                        <Text className="text-white text-xs">✓</Text>
                      )}
                    </TouchableOpacity>
                    
                    <View className="flex-1">
                      <Text className={`text-base ${
                        task.completed 
                          ? 'text-gray-500 dark:text-gray-400 line-through' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {task.text}
                      </Text>
                      {task.date && (
                        <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          期限: {task.date}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}