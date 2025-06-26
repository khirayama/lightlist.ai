import React, { forwardRef } from 'react';
import { Icon, type IconName } from './Icon';

export type InputState = 'normal' | 'error' | 'success' | 'disabled';
export type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  state?: InputState;
  size?: InputSize;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  successMessage?: string;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
}

/**
 * 統一Inputコンポーネント
 * 
 * DESIGN.md準拠:
 * - Normal、Focus、Error、Success、Disabled状態
 * - 6px角丸（md）
 * - 適切なリング（focus時）
 * - 200ms トランジション
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(({
  state = 'normal',
  size = 'md',
  label,
  helperText,
  errorMessage,
  successMessage,
  icon,
  iconPosition = 'left',
  disabled,
  className = '',
  id,
  ...props
}, ref) => {
  const isDisabled = disabled || state === 'disabled';
  const isError = state === 'error';
  const isSuccess = state === 'success';

  // 状態別のスタイル（DESIGN.md準拠）
  const stateStyles = {
    normal: 'border-gray-300 bg-white focus:border-primary-500 focus:ring-primary-500 hover:border-gray-400 motion-safe:hover:shadow-sm',
    error: 'border-error-500 bg-white focus:border-error-500 focus:ring-error-500 motion-safe:animate-bounce-light',
    success: 'border-success-500 bg-white focus:border-success-500 focus:ring-success-500 motion-safe:animate-scale-in',
    disabled: 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60',
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

  // 基本スタイル（アクセシビリティ・アニメーション対応）
  const baseStyles = 'w-full border rounded-md focus-ring transition-all duration-200 ease-out motion-reduce:transition-none placeholder:text-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white motion-safe:animate-fade-in';

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
    <div className="w-full">
      {/* ラベル */}
      {label && (
        <label 
          htmlFor={id} 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
        </label>
      )}

      {/* 入力フィールドコンテナ */}
      <div className="relative">
        {/* 左側アイコン */}
        {icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon 
              name={icon} 
              size={iconSizes[size]} 
              className="text-gray-400"
            />
          </div>
        )}

        {/* 入力フィールド */}
        <input
          ref={ref}
          disabled={isDisabled}
          className={finalClassName}
          id={id}
          {...props}
        />

        {/* 右側アイコンまたは状態アイコン */}
        {(icon && iconPosition === 'right') || statusIcon ? (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {statusIcon ? (
              <Icon 
                name={statusIcon} 
                size={iconSizes[size]} 
                className={isError ? 'text-error-500' : 'text-success-500'}
              />
            ) : icon && iconPosition === 'right' ? (
              <Icon 
                name={icon} 
                size={iconSizes[size]} 
                className="text-gray-400"
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ヘルパーテキスト・エラーメッセージ */}
      {message && (
        <p className={`mt-1 text-sm ${messageColor}`} aria-describedby={id}>
          {message}
        </p>
      )}
    </div>
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
 *   type="email"
 * />
 * 
 * // エラー状態
 * <Input 
 *   label="パスワード" 
 *   type="password"
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
 * 
 * // 無効状態
 * <Input 
 *   label="読み取り専用" 
 *   value="変更できません"
 *   disabled
 * />
 */