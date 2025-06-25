import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResetPasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    newPassword?: string; 
    confirmPassword?: string;
  }>({});

  const validatePassword = (password: string) => {
    // 大文字・小文字・数字を含む8文字以上
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    return password.length >= 8 && hasUpper && hasLower && hasNumber;
  };

  const validateForm = () => {
    const newErrors: {
      newPassword?: string; 
      confirmPassword?: string;
    } = {};
    
    if (!newPassword.trim()) {
      newErrors.newPassword = '新しいパスワードを入力してください';
    } else if (!validatePassword(newPassword)) {
      newErrors.newPassword = 'パスワードは大文字・小文字・数字を含む8文字以上で入力してください';
    }
    
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'パスワード確認を入力してください';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'パスワードが一致しません';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // TODO: 実際のAPI呼び出しを実装
      await new Promise(resolve => setTimeout(resolve, 1000)); // シミュレート
      
      Alert.alert(
        'パスワードをリセットしました',
        '新しいパスワードでログインしてください',
        [
          {
            text: 'ログイン画面へ',
            onPress: () => router.replace('/(auth)/login' as any)
          }
        ]
      );
    } catch (error) {
      Alert.alert('エラー', 'パスワードのリセットに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <ScrollView 
        className="flex-1 px-6"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="py-8">
          {/* ヘッダー */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
              パスワードリセット
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-center">
              新しいパスワードを設定してください
            </Text>
          </View>

          {/* フォーム */}
          <View className="space-y-4">
            {/* 新しいパスワード */}
            <View>
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                新しいパスワード
              </Text>
              <TextInput
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                  errors.newPassword ? 'border-error-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="新しいパスワードを入力"
                placeholderTextColor="#9CA3AF"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoComplete="new-password"
              />
              {errors.newPassword && (
                <Text className="text-error-500 text-sm mt-1">{errors.newPassword}</Text>
              )}
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                大文字・小文字・数字を含む8文字以上
              </Text>
            </View>

            {/* パスワード確認 */}
            <View>
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                パスワード確認
              </Text>
              <TextInput
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                  errors.confirmPassword ? 'border-error-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="パスワードを再入力"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <Text className="text-error-500 text-sm mt-1">{errors.confirmPassword}</Text>
              )}
            </View>

            {/* リセットボタン */}
            <TouchableOpacity
              className={`w-full py-3 rounded-lg mt-6 ${
                isLoading ? 'bg-gray-400' : 'bg-primary-500'
              }`}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              <Text className="text-white text-center font-semibold text-base">
                {isLoading ? 'リセット中...' : 'パスワードをリセット'}
              </Text>
            </TouchableOpacity>

            {/* 注意事項 */}
            <View className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Text className="text-sm text-gray-600 dark:text-gray-400 text-center">
                パスワードをリセットすると、すべてのデバイスで
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 text-center">
                再ログインが必要になります
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}