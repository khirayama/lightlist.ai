import { useColorScheme as useNativeColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ColorSchemeType = 'light' | 'dark' | 'system';

export function useColorScheme(): {
  colorScheme: 'light' | 'dark';
  setColorScheme: (scheme: ColorSchemeType) => void;
  isDark: boolean;
} {
  const nativeColorScheme = useNativeColorScheme();
  const [colorScheme, _setColorScheme] = useState<ColorSchemeType>('system');

  useEffect(() => {
    (async () => {
      const storedScheme = await AsyncStorage.getItem('colorScheme');
      if (storedScheme) {
        _setColorScheme(storedScheme as ColorSchemeType);
      }
    })();
  }, []);

  const setColorScheme = async (scheme: ColorSchemeType) => {
    await AsyncStorage.setItem('colorScheme', scheme);
    _setColorScheme(scheme);
  };

  const resolvedColorScheme = colorScheme === 'system' ? nativeColorScheme : colorScheme;

  return {
    colorScheme: resolvedColorScheme || 'light',
    setColorScheme,
    isDark: resolvedColorScheme === 'dark',
  };
}