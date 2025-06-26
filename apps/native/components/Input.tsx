import React, { forwardRef } from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import { Icon, type IconName } from './Icon';

export type InputState = 'normal' | 'error' | 'success' | 'disabled';
export type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<TextInputProps, 'style'> {
  state?: InputState;
  size?: InputSize;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  successMessage?: string;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  className?: string;
}

/**
 * 統一Inputコンポーネント（Native版）
 * 
 * DESIGN.md準拠:
 * - Normal、Focus、Error、Success、Disabled状態
 * - 6px角丸（md）
 * - アクセシビリティ対応
 * - ネイティブなフォーカス表示
 */
export const Input = forwardRef<TextInput, InputProps>(({
  state = 'normal',
  size = 'md',
  label,
  helperText,
  errorMessage,
  successMessage,
  icon,
  iconPosition = 'left',
  editable,
  className = '',
  ...props
}, ref) => {
  const isDisabled = editable === false || state === 'disabled';
  const isError = state === 'error';
  const isSuccess = state === 'success';

  // 状態別のスタイル（NativeWind）
  const stateStyles = {
    normal: 'border-gray-300 bg-white focus:border-primary-500',
    error: 'border-error-500 bg-white focus:border-error-500',
    success: 'border-success-500 bg-white focus:border-success-500',
    disabled: 'border-gray-300 bg-gray-100 opacity-60',
  };

  // サイズ別のスタイル
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-4 py-3 text-lg',
  };

  // アイコンサイズ
  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  } as const;

  // 基本スタイル
  const baseStyles = 'w-full border rounded-md min-h-[44px]';

  // パディング調整（アイコンがある場合）
  const paddingStyles = icon 
    ? iconPosition === 'left' 
      ? `${sizeStyles[size].replace('px-3', 'pl-10 pr-3').replace('px-4', 'pl-12 pr-4')}` 
      : `${sizeStyles[size].replace('px-3', 'pl-3 pr-10').replace('px-4', 'pl-4 pr-12')}`
    : sizeStyles[size];

  const currentStateStyle = stateStyles[state];
  const finalClassName = `${baseStyles} ${paddingStyles} ${currentStateStyle} ${className}`.trim();

  // 状態に応じたメッセージ
  const message = isError ? errorMessage : isSuccess ? successMessage : helperText;
  const messageColor = isError ? 'text-error-500' : isSuccess ? 'text-success-500' : 'text-gray-600';

  // 状態アイコン
  const statusIcon = isError ? 'error' : isSuccess ? 'success' : undefined;

  return (
    <View className="w-full">
      {/* ラベル */}
      {label && (
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </Text>
      )}

      {/* 入力フィールドコンテナ */}
      <View className="relative">
        {/* 左側アイコン */}
        {icon && iconPosition === 'left' && (
          <View className="absolute inset-y-0 left-0 pl-3 flex justify-center pointer-events-none z-10">
            <Icon 
              name={icon} 
              size={iconSizes[size]}
              color="#9CA3AF"
            />
          </View>
        )}

        {/* 入力フィールド */}
        <TextInput
          ref={ref}
          editable={!isDisabled}
          className={finalClassName}
          placeholderTextColor="#9CA3AF"
          accessibilityLabel={label}
          accessibilityHint={message}
          accessibilityState={{
            disabled: isDisabled,
          }}
          {...props}
        />

        {/* 右側アイコンまたは状態アイコン */}
        {(icon && iconPosition === 'right') || statusIcon ? (
          <View className="absolute inset-y-0 right-0 pr-3 flex justify-center pointer-events-none">
            {statusIcon ? (
              <Icon 
                name={statusIcon} 
                size={iconSizes[size]}
                color={isError ? '#EF4444' : '#34D399'}
              />
            ) : icon && iconPosition === 'right' ? (
              <Icon 
                name={icon} 
                size={iconSizes[size]}
                color="#9CA3AF"
              />
            ) : null}
          </View>
        ) : null}
      </View>

      {/* ヘルパーテキスト・エラーメッセージ */}
      {message && (
        <Text className={`mt-1 text-sm ${messageColor}`}>
          {message}
        </Text>
      )}
    </View>
  );
});

Input.displayName = 'Input';

/**
 * 使用例:
 * 
 * // 基本的な入力フィールド
 * <Input 
 *   label="メールアドレス" 
 *   placeholder="email@example.com"
 *   keyboardType="email-address"
 * />
 * 
 * // エラー状態
 * <Input 
 *   label="パスワード" 
 *   secureTextEntry
 *   state="error"
 *   errorMessage="パスワードが正しくありません"
 * />
 * 
 * // 成功状態
 * <Input 
 *   label="ユーザー名" 
 *   state="success"
 *   successMessage="利用可能です"
 * />
 * 
 * // アイコン付き
 * <Input 
 *   label="検索" 
 *   icon="search"
 *   iconPosition="left"
 *   placeholder="キーワードを入力..."
 * />
 */