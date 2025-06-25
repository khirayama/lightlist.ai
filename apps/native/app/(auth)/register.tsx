import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { register, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    email?: string; 
    password?: string; 
    confirmPassword?: string;
  }>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    // 大文字・小文字・数字を含む8文字以上
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    return password.length >= 8 && hasUpper && hasLower && hasNumber;
  };

  const validateForm = () => {
    const newErrors: {
      email?: string; 
      password?: string; 
      confirmPassword?: string;
    } = {};
    
    if (!email.trim()) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!validateEmail(email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }
    
    if (!password.trim()) {
      newErrors.password = 'パスワードを入力してください';
    } else if (!validatePassword(password)) {
      newErrors.password = 'パスワードは大文字・小文字・数字を含む8文字以上で入力してください';
    }
    
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'パスワード確認を入力してください';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'パスワードが一致しません';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      await register(email, password);
      // 登録成功時はメイン画面に遷移
      router.replace('/');
    } catch (error) {
      console.error('Register error:', error);
      Alert.alert('エラー', 'ユーザー登録に失敗しました');
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
              ユーザー登録
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-center">
              新しいアカウントを作成してください
            </Text>
          </View>

          {/* フォーム */}
          <View className="space-y-4">
            {/* メールアドレス */}
            <View>
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                メールアドレス
              </Text>
              <TextInput
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                  errors.email ? 'border-error-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="メールアドレスを入力"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              {errors.email && (
                <Text className="text-error-500 text-sm mt-1">{errors.email}</Text>
              )}
            </View>

            {/* パスワード */}
            <View>
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                パスワード
              </Text>
              <TextInput
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                  errors.password ? 'border-error-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="パスワードを入力"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
              />
              {errors.password && (
                <Text className="text-error-500 text-sm mt-1">{errors.password}</Text>
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

            {/* 登録ボタン */}
            <TouchableOpacity
              className={`w-full py-3 rounded-lg mt-6 ${
                isLoading ? 'bg-gray-400' : 'bg-primary-500'
              }`}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text className="text-white text-center font-semibold text-base">
                {isLoading ? '登録中...' : 'ユーザー登録'}
              </Text>
            </TouchableOpacity>

            {/* ログインリンク */}
            <View className="flex-row justify-center items-center mt-6">
              <Text className="text-gray-600 dark:text-gray-400">
                既にアカウントをお持ちの方は{' '}
              </Text>
              <Link href={"/(auth)/login" as any} asChild>
                <TouchableOpacity>
                  <Text className="text-primary-500 font-medium">
                    ログイン
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}