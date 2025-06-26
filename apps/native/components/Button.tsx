import React, { forwardRef } from 'react';
import { Pressable, Text, View, PressableProps } from 'react-native';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonState = 'normal' | 'loading' | 'disabled';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  state?: ButtonState;
  loading?: boolean;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  children?: React.ReactNode;
  className?: string;
}

/**
 * 統一Buttonコンポーネント（Native版）
 * 
 * DESIGN.md準拠:
 * - プライマリ、セカンダリ、デストラクティブバリアント
 * - Normal、Pressed、Focus、Disabled、Loading状態
 * - アクセシビリティ対応（最小タッチターゲット44px）
 * - ネイティブなタッチフィードバック
 */
export const Button = forwardRef<View, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  state = 'normal',
  loading = false,
  icon,
  iconPosition = 'left',
  disabled,
  className = '',
  children,
  ...props
}, ref) => {
  const isDisabled = disabled || state === 'disabled' || loading;
  const isLoading = loading || state === 'loading';

  // バリアント別のスタイル（NativeWind）
  const variantStyles = {
    primary: {
      normal: 'bg-primary-500 active:bg-primary-600',
      disabled: 'bg-primary-500 opacity-50',
    },
    secondary: {
      normal: 'border border-primary-500 bg-transparent active:bg-primary-100',
      disabled: 'border border-primary-500 bg-transparent opacity-50',
    },
    destructive: {
      normal: 'bg-error-500 active:bg-error-600',
      disabled: 'bg-error-500 opacity-50',
    },
  };

  // テキスト色
  const textStyles = {
    primary: 'text-white',
    secondary: 'text-primary-500',
    destructive: 'text-white',
  };

  // サイズ別のスタイル
  const sizeStyles = {
    sm: 'px-3 py-1.5',
    md: 'px-4 py-2',
    lg: 'px-6 py-3',
  };

  // アイコンサイズ
  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  } as const;

  // 基本スタイル（最小タッチターゲット含む）
  const baseStyles = 'flex-row items-center justify-center rounded-md min-h-[44px] min-w-[44px]';

  // 現在の状態に応じたスタイル
  const currentVariantStyle = isDisabled 
    ? variantStyles[variant].disabled 
    : variantStyles[variant].normal;

  const finalClassName = `${baseStyles} ${sizeStyles[size]} ${currentVariantStyle} ${className}`.trim();
  const textClassName = `font-medium ${textStyles[variant]} ${isLoading ? 'opacity-50' : ''}`.trim();

  return (
    <Pressable
      ref={ref}
      disabled={isDisabled}
      className={finalClassName}
      accessibilityRole="button"
      accessibilityState={{
        disabled: isDisabled,
        busy: isLoading,
      }}
      accessibilityHint={isLoading ? "読み込み中" : undefined}
      {...props}
    >
      <View className="flex-row items-center">
        {/* Loading状態のスピナー */}
        {isLoading && (
          <View className="mr-2">
            <Icon 
              name="loading" 
              size={iconSizes[size]} 
            />
          </View>
        )}

        {/* 左側アイコン */}
        {icon && iconPosition === 'left' && !isLoading && (
          <View className={children ? 'mr-2' : ''}>
            <Icon 
              name={icon} 
              size={iconSizes[size]}
            />
          </View>
        )}

        {/* ボタンテキスト */}
        {children && (
          <Text className={textClassName}>
            {children}
          </Text>
        )}

        {/* 右側アイコン */}
        {icon && iconPosition === 'right' && !isLoading && (
          <View className={children ? 'ml-2' : ''}>
            <Icon 
              name={icon} 
              size={iconSizes[size]}
            />
          </View>
        )}
      </View>
    </Pressable>
  );
});

Button.displayName = 'Button';

/**
 * 使用例:
 * 
 * // プライマリボタン
 * <Button variant="primary">保存</Button>
 * 
 * // アイコン付きボタン
 * <Button variant="secondary" icon="plus" iconPosition="left">
 *   新規作成
 * </Button>
 * 
 * // ローディング状態
 * <Button variant="primary" loading>
 *   送信中...
 * </Button>
 * 
 * // 無効状態
 * <Button variant="destructive" disabled>
 *   削除
 * </Button>
 */