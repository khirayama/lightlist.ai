import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSettings, Theme, Language, TaskInsertPosition } from '../hooks/useSettings';
import { useAuth } from '../contexts/AuthContext';

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

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { user, logout, isLoading: authLoading } = useAuth();
  const {
    settings,
    isLoading: settingsLoading,
    effectiveTheme,
    updateTheme,
    updateLanguage,
    updateTaskInsertPosition,
    updateAutoSort,
  } = useSettings();
  
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const colorScheme = effectiveTheme;

  const handleBack = () => {
    router.back();
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      // TODO: 実際のAPI呼び出しを実装
      await new Promise(resolve => setTimeout(resolve, 500));
      Alert.alert(t('common.success'), t('settings.profile.updateSuccess'));
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.profile.updateError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeChange = async (newTheme: Theme) => {
    try {
      await updateTheme(newTheme);
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.unknown'));
    }
  };

  const handleLanguageChange = async (newLanguage: Language) => {
    try {
      await updateLanguage(newLanguage);
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.unknown'));
    }
  };

  const handleTaskInsertPositionChange = async (newPosition: TaskInsertPosition) => {
    try {
      await updateTaskInsertPosition(newPosition);
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.unknown'));
    }
  };

  const handleAutoSortChange = async (value: boolean) => {
    try {
      await updateAutoSort(value);
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.unknown'));
    }
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
            try {
              await logout();
              router.replace('/(auth)/login' as any);
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert(t('common.error'), t('errors.unknown'));
            }
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
            // 二段階確認
            Alert.prompt(
              t('settings.account.deleteAccountConfirm.title'),
              t('settings.account.deleteAccountConfirm.emailVerification'),
              [
                { text: t('settings.account.deleteAccountConfirm.cancel'), style: 'cancel' },
                { 
                  text: t('settings.account.deleteAccountConfirm.confirm'), 
                  style: 'destructive',
                  onPress: (inputEmail) => {
                    if (inputEmail === user?.email) {
                      // TODO: アカウント削除処理を実装
                      Alert.alert(
                        t('common.success'), 
                        `${t('settings.account.deleteAccountConfirm.success')}\n${t('settings.account.deleteAccountConfirm.gracePeriod')}`
                      );
                      router.replace('/(auth)/login' as any);
                    } else {
                      Alert.alert(t('common.error'), t('settings.account.deleteAccountConfirm.emailMismatch'));
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
          {t('settings.title')}
        </Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* プロフィール設定 */}
        <SettingSection title={t('settings.sections.profile')}>
          <View className="p-4">
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.profile.username')}
              </Text>
              <TextInput
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={t('settings.profile.usernamePlaceholder')}
                placeholderTextColor="#9CA3AF"
                value={userName}
                onChangeText={setUserName}
                onBlur={handleSaveProfile}
              />
            </View>
            
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
              {(['system', 'light', 'dark'] as Theme[]).map((themeOption) => (
                <TouchableOpacity
                  key={themeOption}
                  className={`px-3 py-2 rounded-lg ${
                    settings.theme === themeOption 
                      ? 'bg-primary-500' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  onPress={() => handleThemeChange(themeOption)}
                >
                  <Text className={`text-sm ${
                    settings.theme === themeOption 
                      ? 'text-white' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {themeOption === 'system' ? t('settings.appearance.themeSystem') : 
                     themeOption === 'light' ? t('settings.appearance.themeLight') : t('settings.appearance.themeDark')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingItem>
          
          <SettingItem icon="language" label={t('settings.appearance.language')} isLast>
            <View className="flex-row space-x-2">
              {(['ja', 'en'] as Language[]).map((lang) => (
                <TouchableOpacity
                  key={lang}
                  className={`px-3 py-2 rounded-lg ${
                    settings.language === lang 
                      ? 'bg-primary-500' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  onPress={() => handleLanguageChange(lang)}
                >
                  <Text className={`text-sm ${
                    settings.language === lang 
                      ? 'text-white' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {lang === 'ja' ? t('settings.appearance.languageJa') : t('settings.appearance.languageEn')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingItem>
        </SettingSection>

        {/* タスク設定 */}
        <SettingSection title={t('settings.sections.tasks')}>
          <SettingItem icon="settings" label={t('settings.tasks.insertPosition')}>
            <View className="flex-row space-x-2">
              {(['top', 'bottom'] as TaskInsertPosition[]).map((position) => (
                <TouchableOpacity
                  key={position}
                  className={`px-3 py-2 rounded-lg ${
                    settings.taskInsertPosition === position 
                      ? 'bg-primary-500' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  onPress={() => handleTaskInsertPositionChange(position)}
                >
                  <Text className={`text-sm ${
                    settings.taskInsertPosition === position 
                      ? 'text-white' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {position === 'top' ? t('settings.tasks.insertTop') : t('settings.tasks.insertBottom')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingItem>
          
          <SettingItem icon="check" label={t('settings.tasks.autoSort')} isLast>
            <Switch
              value={settings.autoSort}
              onValueChange={handleAutoSortChange}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={settings.autoSort ? '#005AAF' : '#f4f3f4'}
            />
          </SettingItem>
        </SettingSection>

        {/* アカウント管理 */}
        <SettingSection title={t('settings.sections.account')}>
          <TouchableOpacity onPress={handleLogout}>
            <SettingItem icon="logout" label={t('settings.account.logout')}>
              <Icon name="back" size={16} color={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'} />
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