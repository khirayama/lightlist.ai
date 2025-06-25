import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{email?: string; password?: string}>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors: {email?: string; password?: string} = {};
    
    if (!email.trim()) {
      newErrors.email = t('auth.login.validation.emailRequired');
    } else if (!validateEmail(email)) {
      newErrors.email = t('auth.login.validation.emailInvalid');
    }
    
    if (!password.trim()) {
      newErrors.password = t('auth.login.validation.passwordRequired');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      await login(email, password);
      // ログイン成功時はメイン画面に遷移
      router.replace('/');
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(t('common.error'), t('auth.login.errors.loginFailed'));
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
              {t('auth.login.title')}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-center">
              {t('auth.login.subtitle')}
            </Text>
          </View>

          {/* フォーム */}
          <View className="space-y-4">
            {/* メールアドレス */}
            <View>
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('auth.login.email')}
              </Text>
              <TextInput
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                  errors.email ? 'border-error-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder={t('auth.login.emailPlaceholder')}
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
                {t('auth.login.password')}
              </Text>
              <TextInput
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                  errors.password ? 'border-error-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder={t('auth.login.passwordPlaceholder')}
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
                    {t('auth.login.forgotPassword')}
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
                {isLoading ? t('auth.login.loginButtonLoading') : t('auth.login.loginButton')}
              </Text>
            </TouchableOpacity>

            {/* 新規登録リンク */}
            <View className="flex-row justify-center items-center mt-6">
              <Text className="text-gray-600 dark:text-gray-400">
                {t('auth.login.noAccount')}{' '}
              </Text>
              <Link href={"/(auth)/register" as any} asChild>
                <TouchableOpacity>
                  <Text className="text-primary-500 font-medium">
                    {t('auth.login.register')}
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