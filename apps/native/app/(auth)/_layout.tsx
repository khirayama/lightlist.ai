import { Stack } from 'expo-router';
import { View, StatusBar } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';

export default function AuthLayout() {
  const { isDark } = useColorScheme();

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#111827' : '#ffffff'}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen 
          name="login" 
          options={{
            title: 'ログイン',
          }}
        />
        <Stack.Screen 
          name="register" 
          options={{
            title: 'ユーザー登録',
          }}
        />
        <Stack.Screen 
          name="forgot-password" 
          options={{
            title: 'パスワードを忘れた方',
          }}
        />
        <Stack.Screen 
          name="reset-password" 
          options={{
            title: 'パスワードリセット',
          }}
        />
      </Stack>
    </View>
  );
}