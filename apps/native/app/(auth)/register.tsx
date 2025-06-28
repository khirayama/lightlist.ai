import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { 
  useFormValidation, 
  createRegisterSchemaWithConfirmation,
  usePasswordStrength 
} from '@lightlist/sdk';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { register, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  // バリデーションスキーマ
  const schema = createRegisterSchemaWithConfirmation(formData.password);
  
  // バリデーションフック
  const {
    validateField,
    validateForm,
    getFieldError,
    isFormValid,
    setFieldTouched,
  } = useFormValidation(schema);

  // パスワード強度フック
  const { strength, checkStrength } = usePasswordStrength();

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
    
    if (name === 'password') {
      checkStrength(value);
    }
  };

  const handleBlur = (name: string) => {
    setFieldTouched(name, true);
    validateField(name, formData[name as keyof typeof formData]);
  };

  const handleRegister = async () => {
    const isValid = validateForm(formData);
    if (!isValid) {
      return;
    }
    
    try {
      await register(formData.email, formData.password);
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
              {t('auth.registerButton')}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-center">
              {t('auth.createNewAccount')}
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
                autoComplete="new-password"
              />
              {getFieldError('password') && (
                <Text className="text-error-500 text-sm mt-1">{getFieldError('password')}</Text>
              )}
              
              {/* パスワード強度表示 */}
              {formData.password && (
                <View className="mt-2">
                  <View className="flex-row items-center space-x-2">
                    <View className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <View
                        className={`h-2 rounded-full ${
                          strength.level === 'weak'
                            ? 'bg-red-500 w-1/3'
                            : strength.level === 'medium'
                            ? 'bg-yellow-500 w-2/3'
                            : 'bg-green-500 w-full'
                        }`}
                      />
                    </View>
                    <Text
                      className={`text-xs font-medium ${
                        strength.level === 'weak'
                          ? 'text-red-600 dark:text-red-400'
                          : strength.level === 'medium'
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {strength.level === 'weak' ? t('auth.passwordStrengthWeak') : strength.level === 'medium' ? t('auth.passwordStrengthMedium') : t('auth.passwordStrengthStrong')}
                    </Text>
                  </View>
                  {strength.suggestions.length > 0 && (
                    <Text className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      {strength.suggestions.join('、')}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* パスワード確認 */}
            <View>
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('auth.passwordConfirm')}
              </Text>
              <TextInput
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                  getFieldError('confirmPassword') ? 'border-error-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder={t('auth.passwordConfirmPlaceholder')}
                placeholderTextColor="#9CA3AF"
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                onBlur={() => handleBlur('confirmPassword')}
                secureTextEntry
                autoComplete="new-password"
              />
              {getFieldError('confirmPassword') && (
                <Text className="text-error-500 text-sm mt-1">{getFieldError('confirmPassword')}</Text>
              )}
            </View>

            {/* 登録ボタン */}
            <TouchableOpacity
              className={`w-full py-3 rounded-lg mt-6 ${
                isLoading || !isFormValid ? 'bg-gray-400' : 'bg-primary-500'
              }`}
              onPress={handleRegister}
              disabled={isLoading || !isFormValid}
            >
              <Text className="text-white text-center font-semibold text-base">
                {isLoading ? t('auth.registering') : t('auth.registerButton')}
              </Text>
            </TouchableOpacity>

            {/* ログインリンク */}
            <View className="flex-row justify-center items-center mt-6">
              <Text className="text-gray-600 dark:text-gray-400">
                {t('auth.alreadyHaveAccount')}{' '}
              </Text>
              <Link href={"/(auth)/login" as any} asChild>
                <TouchableOpacity>
                  <Text className="text-primary-500 font-medium">
                    {t('auth.loginButton')}
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