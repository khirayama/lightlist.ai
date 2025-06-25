import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string}>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors: {email?: string; password?: string} = {};
    
    if (!email.trim()) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!validateEmail(email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }
    
    if (!password.trim()) {
      newErrors.password = 'パスワードを入力してください';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // TODO: 実際のAPI呼び出しを実装
      await new Promise(resolve => setTimeout(resolve, 1000)); // シミュレート
      
      // ログイン成功時はメイン画面に遷移
      router.replace('/');
    } catch (error) {
      Alert.alert('エラー', 'ログインに失敗しました');
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
              ログイン
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-center">
              アカウントにサインインしてください
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
                autoComplete="current-password"
              />
              {errors.password && (
                <Text className="text-error-500 text-sm mt-1">{errors.password}</Text>
              )}
            </View>

            {/* パスワードを忘れた方 */}
            <View className="flex-row justify-end">
              <Link href={"/(auth)/forgot-password" as any} asChild>
                <TouchableOpacity>
                  <Text className="text-primary-500 text-sm font-medium">
                    パスワードを忘れた方はこちら
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* ログインボタン */}
            <TouchableOpacity
              className={`w-full py-3 rounded-lg ${
                isLoading ? 'bg-gray-400' : 'bg-primary-500'
              }`}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text className="text-white text-center font-semibold text-base">
                {isLoading ? 'ログイン中...' : 'ログイン'}
              </Text>
            </TouchableOpacity>

            {/* 新規登録リンク */}
            <View className="flex-row justify-center items-center mt-6">
              <Text className="text-gray-600 dark:text-gray-400">
                アカウントをお持ちでない方は{' '}
              </Text>
              <Link href={"/(auth)/register" as any} asChild>
                <TouchableOpacity>
                  <Text className="text-primary-500 font-medium">
                    ユーザー登録
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