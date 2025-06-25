import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [errors, setErrors] = useState<{email?: string}>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors: {email?: string} = {};
    
    if (!email.trim()) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!validateEmail(email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendResetEmail = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // TODO: 実際のAPI呼び出しを実装
      await new Promise(resolve => setTimeout(resolve, 1000)); // シミュレート
      
      setIsEmailSent(true);
    } catch (error) {
      Alert.alert('エラー', 'パスワードリセットメールの送信に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/(auth)/login' as any);
  };

  if (isEmailSent) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
        <View className="flex-1 px-6 justify-center">
          <View className="items-center">
            {/* 成功アイコン */}
            <View className="w-20 h-20 bg-success-100 rounded-full items-center justify-center mb-6">
              <Text className="text-success-500 text-4xl">✓</Text>
            </View>

            <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-4">
              メールを送信しました
            </Text>
            
            <Text className="text-gray-600 dark:text-gray-400 text-center mb-2">
              {email} にパスワードリセット用のリンクを送信しました。
            </Text>
            
            <Text className="text-gray-600 dark:text-gray-400 text-center mb-8">
              メールのリンクをクリックして、新しいパスワードを設定してください。
            </Text>

            <TouchableOpacity
              className="w-full py-3 bg-primary-500 rounded-lg mb-4"
              onPress={handleBackToLogin}
            >
              <Text className="text-white text-center font-semibold text-base">
                ログイン画面に戻る
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="py-2"
              onPress={() => setIsEmailSent(false)}
            >
              <Text className="text-primary-500 text-center">
                別のメールアドレスで再送信
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
              パスワードを忘れた方
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-center">
              登録されたメールアドレスに
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-center">
              パスワードリセット用のリンクを送信します
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

            {/* 送信ボタン */}
            <TouchableOpacity
              className={`w-full py-3 rounded-lg mt-6 ${
                isLoading ? 'bg-gray-400' : 'bg-primary-500'
              }`}
              onPress={handleSendResetEmail}
              disabled={isLoading}
            >
              <Text className="text-white text-center font-semibold text-base">
                {isLoading ? '送信中...' : 'リセットメールを送信'}
              </Text>
            </TouchableOpacity>

            {/* ログインに戻るリンク */}
            <View className="flex-row justify-center items-center mt-6">
              <Text className="text-gray-600 dark:text-gray-400">
                パスワードを思い出した方は{' '}
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