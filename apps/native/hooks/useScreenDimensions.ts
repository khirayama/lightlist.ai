import { useState, useEffect, useCallback } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

interface ScreenDimensions {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
}

export const useScreenDimensions = () => {
  const [dimensions, setDimensions] = useState<ScreenDimensions>(() => {
    const { width, height, scale, fontScale } = Dimensions.get('window');
    return { width, height, scale, fontScale };
  });

  const updateDimensions = useCallback(({ window }: { window: ScaledSize }) => {
    setDimensions({
      width: window.width,
      height: window.height,
      scale: window.scale,
      fontScale: window.fontScale,
    });
  }, []);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', updateDimensions);
    
    return () => {
      subscription?.remove();
    };
  }, [updateDimensions]);

  // レスポンシブブレークポイント
  const isTablet = dimensions.width >= 768;
  const isLandscape = dimensions.width > dimensions.height;
  
  return {
    ...dimensions,
    isTablet,
    isLandscape,
  };
};