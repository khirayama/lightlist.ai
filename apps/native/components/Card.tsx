import React, { forwardRef } from 'react';
import { View, Pressable, Text, ViewProps, PressableProps } from 'react-native';

export type CardVariant = 'default' | 'outlined' | 'elevated';
export type CardState = 'normal' | 'hover' | 'active' | 'selected';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends Omit<ViewProps, 'style'> {
  variant?: CardVariant;
  state?: CardState;
  padding?: CardPadding;
  interactive?: boolean; // タッチ効果を有効にするか
  selected?: boolean;
  children: React.ReactNode;
  className?: string;
  onPress?: PressableProps['onPress'];
}

/**
 * 統一Cardコンポーネント（Native版）
 * 
 * DESIGN.md準拠:
 * - Normal、Pressed、Selected状態
 * - 8px角丸（lg）
 * - shadow-md（iOS/Android対応）
 * - ネイティブなタッチフィードバック
 * - アクセシビリティ対応
 */
export const Card = forwardRef<View, CardProps>(({
  variant = 'default',
  state = 'normal',
  padding = 'md',
  interactive = false,
  selected = false,
  className = '',
  children,
  onPress,
  ...props
}, ref) => {
  const isSelected = selected || state === 'selected';

  // バリアント別のスタイル（NativeWind）
  const variantStyles = {
    default: 'bg-surface border border-gray-200 dark:bg-surface-dark dark:border-gray-700',
    outlined: 'bg-transparent border-2 border-gray-300 dark:border-gray-600',
    elevated: 'bg-surface dark:bg-surface-dark',
  };

  // パディングスタイル
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4', // 16px
    lg: 'p-6', // 24px
  };

  // 選択状態のスタイル
  const selectedStyles = isSelected 
    ? 'border-2 border-primary-500 dark:border-primary-400' 
    : '';

  // 影のスタイル（iOS/Android対応）
  const shadowStyles = variant === 'elevated' || variant === 'default' 
    ? 'shadow-md' 
    : '';

  // 基本スタイル
  const baseStyles = 'rounded-lg';

  const finalClassName = [
    baseStyles,
    variantStyles[variant],
    paddingStyles[padding],
    shadowStyles,
    selectedStyles,
    className,
  ].filter(Boolean).join(' ');

  // インタラクティブな場合はPressable、そうでなければView
  if (interactive && onPress) {
    return (
      <Pressable
        ref={ref as any}
        className={finalClassName}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{
          selected: isSelected,
        }}
        android_ripple={{ 
          color: 'rgba(0, 90, 175, 0.1)', // primary-500 with opacity
          borderless: false 
        }}
        {...props}
      >
        {({ pressed }) => (
          <View 
            className={pressed ? 'opacity-80' : ''} 
            style={{ minHeight: 44 }} // 最小タッチターゲット
          >
            {children}
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <View
      ref={ref}
      className={finalClassName}
      {...props}
    >
      {children}
    </View>
  );
});

Card.displayName = 'Card';

/**
 * CardHeader - カードのヘッダー部分
 */
export const CardHeader = forwardRef<View, ViewProps & { className?: string }>(({
  className = '',
  children,
  ...props
}, ref) => (
  <View 
    ref={ref}
    className={`flex-row items-center justify-between mb-4 ${className}`}
    {...props}
  >
    {children}
  </View>
));

CardHeader.displayName = 'CardHeader';

/**
 * CardTitle - カードのタイトル
 */
export const CardTitle = forwardRef<Text, React.ComponentProps<typeof Text> & { className?: string }>(({
  className = '',
  children,
  ...props
}, ref) => (
  <Text 
    ref={ref}
    className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}
    {...props}
  >
    {children}
  </Text>
));

CardTitle.displayName = 'CardTitle';

/**
 * CardContent - カードのコンテンツ部分
 */
export const CardContent = forwardRef<View, ViewProps & { className?: string }>(({
  className = '',
  children,
  ...props
}, ref) => (
  <View 
    ref={ref}
    className={`${className}`}
    {...props}
  >
    {children}
  </View>
));

CardContent.displayName = 'CardContent';

/**
 * CardFooter - カードのフッター部分
 */
export const CardFooter = forwardRef<View, ViewProps & { className?: string }>(({
  className = '',
  children,
  ...props
}, ref) => (
  <View 
    ref={ref}
    className={`flex-row items-center justify-end mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 ${className}`}
    {...props}
  >
    {children}
  </View>
));

CardFooter.displayName = 'CardFooter';

/**
 * 使用例:
 * 
 * // 基本的なカード
 * <Card>
 *   <CardHeader>
 *     <CardTitle>タイトル</CardTitle>
 *   </CardHeader>
 *   <CardContent>
 *     <Text>コンテンツ</Text>
 *   </CardContent>
 * </Card>
 * 
 * // インタラクティブなカード
 * <Card interactive onPress={handlePress}>
 *   <Text>タップ可能なカード</Text>
 * </Card>
 * 
 * // 選択状態のカード
 * <Card selected>
 *   <Text>選択されたカード</Text>
 * </Card>
 */