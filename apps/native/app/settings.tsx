import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';

// アイコン用のシンプルなコンポーネント
const Icon = ({ name, size = 24, color = '#6B7280' }: { name: string; size?: number; color?: string }) => {
  const icons = {
    back: '←',
    user: '👤',
    palette: '🎨',
    language: '🌐',
    settings: '⚙️',
    logout: '🚪',
    trash: '🗑️',
    check: '✓',
  };
  
  return (
    <Text style={{ fontSize: size, color }}>
      {icons[name as keyof typeof icons] || '●'}
    </Text>
  );
};

type Theme = 'system' | 'light' | 'dark';
type Language = 'ja' | 'en';
type TaskInsertPosition = 'top' | 'bottom';

export default function SettingsScreen() {
  const [userName, setUserName] = useState('');
  const [email] = useState('user@example.com');
  const [theme, setTheme] = useState<Theme>('system');
  const [language, setLanguage] = useState<Language>('ja');
  const [taskInsertPosition, setTaskInsertPosition] = useState<TaskInsertPosition>('top');
  const [autoSort, setAutoSort] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const colorScheme = useColorScheme();

  const handleBack = () => {
    router.back();
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      // TODO: 実際のAPI呼び出しを実装
      await new Promise(resolve => setTimeout(resolve, 500));
      Alert.alert('成功', 'プロフィールを更新しました');
    } catch (error) {
      Alert.alert('エラー', 'プロフィールの更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: 'ログアウト', 
          style: 'destructive',
          onPress: () => {
            // TODO: ログアウト処理を実装
            router.replace('/(auth)/login' as any);
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'アカウント削除',
      '本当にアカウントを削除しますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除', 
          style: 'destructive',
          onPress: () => {
            // 二段階確認
            Alert.prompt(
              'アカウント削除の確認',
              'メールアドレスを入力してください',
              [
                { text: 'キャンセル', style: 'cancel' },
                { 
                  text: '削除実行', 
                  style: 'destructive',
                  onPress: (inputEmail) => {
                    if (inputEmail === email) {
                      // TODO: アカウント削除処理を実装
                      Alert.alert('削除完了', 'アカウントを削除しました');
                      router.replace('/(auth)/login' as any);
                    } else {
                      Alert.alert('エラー', 'メールアドレスが正しくありません');
                    }
                  }
                }
              ],
              'plain-text'
            );
          }
        }
      ]
    );
  };

  const SettingSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View className="mb-6">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
        {title}
      </Text>
      <View className="bg-white dark:bg-gray-800 rounded-lg">
        {children}
      </View>
    </View>
  );

  const SettingItem = ({ 
    icon, 
    label, 
    children, 
    isLast = false 
  }: { 
    icon: string; 
    label: string; 
    children: React.ReactNode;
    isLast?: boolean;
  }) => (
    <View className={`flex-row items-center p-4 ${!isLast ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}>
      <Icon name={icon} size={20} color={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'} />
      <Text className="flex-1 ml-3 text-gray-900 dark:text-white font-medium">
        {label}
      </Text>
      <View className="ml-auto">
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <View className="flex-row items-center p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity onPress={handleBack} className="p-2 mr-2">
          <Icon name="back" size={24} color={colorScheme === 'dark' ? '#fff' : '#1f2937'} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          設定
        </Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* プロフィール設定 */}
        <SettingSection title="プロフィール">
          <View className="p-4">
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ユーザー名
              </Text>
              <TextInput
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="ユーザー名を入力"
                placeholderTextColor="#9CA3AF"
                value={userName}
                onChangeText={setUserName}
                onBlur={handleSaveProfile}
              />
            </View>
            
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                メールアドレス
              </Text>
              <Text className="px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400">
                {email}
              </Text>
            </View>
          </View>
        </SettingSection>

        {/* 外観設定 */}
        <SettingSection title="外観">
          <SettingItem icon="palette" label="テーマ">
            <View className="flex-row space-x-2">
              {(['system', 'light', 'dark'] as Theme[]).map((themeOption) => (
                <TouchableOpacity
                  key={themeOption}
                  className={`px-3 py-2 rounded-lg ${
                    theme === themeOption 
                      ? 'bg-primary-500' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  onPress={() => setTheme(themeOption)}
                >
                  <Text className={`text-sm ${
                    theme === themeOption 
                      ? 'text-white' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {themeOption === 'system' ? 'システム' : 
                     themeOption === 'light' ? 'ライト' : 'ダーク'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingItem>
          
          <SettingItem icon="language" label="言語" isLast>
            <View className="flex-row space-x-2">
              {(['ja', 'en'] as Language[]).map((lang) => (
                <TouchableOpacity
                  key={lang}
                  className={`px-3 py-2 rounded-lg ${
                    language === lang 
                      ? 'bg-primary-500' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  onPress={() => setLanguage(lang)}
                >
                  <Text className={`text-sm ${
                    language === lang 
                      ? 'text-white' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {lang === 'ja' ? '日本語' : 'English'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingItem>
        </SettingSection>

        {/* タスク設定 */}
        <SettingSection title="タスク設定">
          <SettingItem icon="settings" label="タスクの挿入位置">
            <View className="flex-row space-x-2">
              {(['top', 'bottom'] as TaskInsertPosition[]).map((position) => (
                <TouchableOpacity
                  key={position}
                  className={`px-3 py-2 rounded-lg ${
                    taskInsertPosition === position 
                      ? 'bg-primary-500' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  onPress={() => setTaskInsertPosition(position)}
                >
                  <Text className={`text-sm ${
                    taskInsertPosition === position 
                      ? 'text-white' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {position === 'top' ? '上に追加' : '下に追加'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingItem>
          
          <SettingItem icon="check" label="自動並び替え" isLast>
            <Switch
              value={autoSort}
              onValueChange={setAutoSort}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={autoSort ? '#005AAF' : '#f4f3f4'}
            />
          </SettingItem>
        </SettingSection>

        {/* アカウント管理 */}
        <SettingSection title="アカウント">
          <TouchableOpacity onPress={handleLogout}>
            <SettingItem icon="logout" label="ログアウト">
              <Icon name="back" size={16} color={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'} />
            </SettingItem>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleDeleteAccount}>
            <SettingItem icon="trash" label="アカウント削除" isLast>
              <Icon name="back" size={16} color="#EF4444" />
            </SettingItem>
          </TouchableOpacity>
        </SettingSection>
      </ScrollView>
    </SafeAreaView>
  );
}