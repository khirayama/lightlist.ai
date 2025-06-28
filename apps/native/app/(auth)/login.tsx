import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useFormValidation, loginSchema } from '@lightlist/sdk';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // バリデーションフック
  const {
    validateField,
    validateForm,
    getFieldError,
    isFormValid,
    setFieldTouched,
  } = useFormValidation(loginSchema);

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const handleBlur = (name: string) => {
    setFieldTouched(name, true);
    validateField(name, formData[name as keyof typeof formData]);
  };

  const handleLogin = async () => {
    const isValid = validateForm(formData);
    if (!isValid) {
      return;
    }
    
    try {
      await login(formData.email, formData.password);
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
              {t('auth.loginButton')}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-center">
              {t('auth.signInToAccount')}
            </Text>
          </View>

          {/* フォーム */}
          <View className="space-y-4">
            {/* メールアドレス */}
            <View>
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('auth.email')}
              </Text>
              <TextInput
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                  getFieldError('email') ? 'border-error-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor="#9CA3AF"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                onBlur={() => handleBlur('email')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              {getFieldError('email') && (
                <Text className="text-error-500 text-sm mt-1">{getFieldError('email')}</Text>
              )}
            </View>

            {/* パスワード */}
            <View>
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('auth.password')}
              </Text>
              <TextInput
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                  getFieldError('password') ? 'border-error-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder={t('auth.passwordPlaceholder')}
                placeholderTextColor="#9CA3AF"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                onBlur={() => handleBlur('password')}
                secureTextEntry
                autoComplete="current-password"
              />
              {getFieldError('password') && (
                <Text className="text-error-500 text-sm mt-1">{getFieldError('password')}</Text>
              )}
            </View>

            {/* パスワードを忘れた方 */}
            <View className="flex-row justify-end">
              <Link href={"/(auth)/forgot-password" as any} asChild>
                <TouchableOpacity>
                  <Text className="text-primary-500 text-sm font-medium">
                    {t('auth.forgotPassword')}
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* ログインボタン */}
            <TouchableOpacity
              className={`w-full py-3 rounded-lg ${
                isLoading || !isFormValid ? 'bg-gray-400' : 'bg-primary-500'
              }`}
              onPress={handleLogin}
              disabled={isLoading || !isFormValid}
            >
              <Text className="text-white text-center font-semibold text-base">
                {isLoading ? t('auth.loggingIn') : t('auth.loginButton')}
              </Text>
            </TouchableOpacity>

            {/* 新規登録リンク */}
            <View className="flex-row justify-center items-center mt-6">
              <Text className="text-gray-600 dark:text-gray-400">
                {t('auth.noAccount')}{' '}
              </Text>
              <Link href={"/(auth)/register" as any} asChild>
                <TouchableOpacity>
                  <Text className="text-primary-500 font-medium">
                    {t('auth.registerButton')}
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