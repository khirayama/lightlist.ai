import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColorScheme, type ColorSchemeType } from '@/components/useColorScheme';
import { useAuth } from '../contexts/AuthContext';

// アイコン用のシンプルなコンポーネント
const Icon = ({ name, size = 24, color = '#6B7280' }: { name: string; size?: number; color?: string }) => {
  const icons = {
    back: '←',
    user: '👤',
    palette: '🎨',
    language: '🌐',
    sort: '↕️',
    logout: '🚪',
    trash: '🗑️',
  };
  
  return (
    <Text style={{ fontSize: size, color }}>
      {icons[name as keyof typeof icons] || '●'}
    </Text>
  );
};

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { colorScheme, setColorScheme, isDark } = useColorScheme();

  const handleBack = () => {
    router.back();
  };

  const handleLogout = () => {
    Alert.alert(
      t('settings.account.logoutConfirm.title'),
      t('settings.account.logoutConfirm.message'),
      [
        { text: t('settings.account.logoutConfirm.cancel'), style: 'cancel' },
        { 
          text: t('settings.account.logoutConfirm.confirm'), 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login' as any);
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.account.deleteAccountConfirm.title'),
      t('settings.account.deleteAccountConfirm.message'),
      [
        { text: t('settings.account.deleteAccountConfirm.cancel'), style: 'cancel' },
        { 
          text: t('settings.account.deleteAccountConfirm.confirm'), 
          style: 'destructive',
          onPress: () => {
            // TODO: アカウント削除処理を実装
            Alert.alert('アカウント削除', 'この機能はまだ実装されていません');
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
      <Icon name={icon} size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
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
          <Icon name="back" size={24} color={isDark ? '#fff' : '#1f2937'} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          {t('settings.title')}
        </Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* プロフィール設定 */}
        <SettingSection title={t('settings.sections.profile')}>
          <View className="p-4">
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.profile.email')}
              </Text>
              <Text className="px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400">
                {user?.email || 'user@example.com'}
              </Text>
            </View>
          </View>
        </SettingSection>

        {/* 外観設定 */}
        <SettingSection title={t('settings.sections.appearance')}>
          <SettingItem icon="palette" label={t('settings.appearance.theme')}>
            <View className="flex-row space-x-2">
              {(['system', 'light', 'dark'] as ColorSchemeType[]).map((themeOption) => (
                <TouchableOpacity
                  key={themeOption}
                  className={`px-3 py-2 rounded-lg ${
                    colorScheme === themeOption 
                      ? 'bg-primary-500' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  onPress={() => setColorScheme(themeOption)}
                >
                  <Text className={`text-sm ${
                    colorScheme === themeOption 
                      ? 'text-white' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {t(`settings.appearance.themes.${themeOption}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingItem>
          
          <SettingItem icon="language" label={t('settings.appearance.language')} isLast>
            <View className="flex-row space-x-2">
              {(['ja', 'en'] as const).map((lang) => (
                <TouchableOpacity
                  key={lang}
                  className={`px-3 py-2 rounded-lg ${
                    i18n.language === lang 
                      ? 'bg-primary-500' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  onPress={() => i18n.changeLanguage(lang)}
                >
                  <Text className={`text-sm ${
                    i18n.language === lang 
                      ? 'text-white' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {t(`settings.appearance.languages.${lang}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingItem>
        </SettingSection>

        {/* タスク設定 */}
        <SettingSection title={t('settings.sections.tasks')}>
          <SettingItem icon="palette" label={t('settings.tasks.insertPosition')}>
            <View className="flex-row space-x-2">
              {(['top', 'bottom'] as const).map((position) => (
                <TouchableOpacity
                  key={position}
                  className={`px-3 py-2 rounded-lg ${
                    'top' === position // TODO: ユーザー設定から取得
                      ? 'bg-primary-500' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  onPress={() => {
                    // TODO: ユーザー設定を更新
                    console.log('Update insert position:', position);
                  }}
                >
                  <Text className={`text-sm ${
                    'top' === position // TODO: ユーザー設定から取得
                      ? 'text-white' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {t(`settings.tasks.insert${position.charAt(0).toUpperCase() + position.slice(1)}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingItem>
          
          <SettingItem icon="sort" label={t('settings.tasks.autoSort')} isLast>
            <TouchableOpacity
              className={`w-12 h-6 rounded-full ${
                false // TODO: ユーザー設定から取得
                  ? 'bg-primary-500' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
              onPress={() => {
                // TODO: ユーザー設定を更新
                console.log('Toggle auto sort');
              }}
            >
              <View className={`w-5 h-5 mt-0.5 bg-white rounded-full transition-transform ${
                false // TODO: ユーザー設定から取得
                  ? 'translate-x-6' 
                  : 'translate-x-0.5'
              }`} />
            </TouchableOpacity>
          </SettingItem>
        </SettingSection>

        {/* アカウント管理 */}
        <SettingSection title={t('settings.sections.account')}>
          <TouchableOpacity onPress={handleLogout}>
            <SettingItem icon="logout" label={t('settings.account.logout')}>
              <Icon name="back" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </SettingItem>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleDeleteAccount}>
            <SettingItem icon="trash" label={t('settings.account.deleteAccount')} isLast>
              <Icon name="back" size={16} color="#EF4444" />
            </SettingItem>
          </TouchableOpacity>
        </SettingSection>
      </ScrollView>
    </SafeAreaView>
  );
}