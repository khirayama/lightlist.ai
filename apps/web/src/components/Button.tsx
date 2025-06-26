import React, { forwardRef } from 'react';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonState = 'normal' | 'loading' | 'disabled';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  state?: ButtonState;
  loading?: boolean;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  children?: React.ReactNode;
}

/**
 * 統一Buttonコンポーネント
 * 
 * DESIGN.md準拠:
 * - プライマリ、セカンダリ、デストラクティブバリアント
 * - Normal、Hover、Active、Focus、Disabled、Loading状態
 * - 6px角丸（md）
 * - 適切なトランジション（150ms ease-out）
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
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

  // バリアント別のスタイル（DESIGN.md準拠）
  const variantStyles = {
    primary: {
      normal: 'bg-primary-500 text-white hover:bg-primary-400 active:bg-primary-600 motion-safe:hover:shadow-lg motion-safe:active:scale-[0.98]',
      disabled: 'bg-primary-500 text-white opacity-50 cursor-not-allowed',
    },
    secondary: {
      normal: 'border border-primary-500 text-primary-500 bg-transparent hover:bg-primary-50 active:bg-primary-100 motion-safe:active:scale-[0.98]',
      disabled: 'border border-primary-500 text-primary-500 bg-transparent opacity-50 cursor-not-allowed',
    },
    destructive: {
      normal: 'bg-error-500 text-white hover:bg-error-400 active:bg-error-600 motion-safe:hover:shadow-lg motion-safe:active:scale-[0.98]',
      disabled: 'bg-error-500 text-white opacity-50 cursor-not-allowed',
    },
  };

  // サイズ別のスタイル
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  // アイコンサイズ
  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  } as const;

  // 基本スタイル（アクセシビリティ・アニメーション対応）
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md touch-target focus-ring transition-all duration-150 ease-out motion-reduce:transition-none motion-safe:animate-fade-in';

  // 現在の状態に応じたスタイル
  const currentVariantStyle = isDisabled 
    ? variantStyles[variant].disabled 
    : variantStyles[variant].normal;

  const finalClassName = `${baseStyles} ${sizeStyles[size]} ${currentVariantStyle} ${className}`.trim();

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={finalClassName}
      {...props}
    >
      {/* Loading状態のスピナー（アクセシビリティ対応） */}
      {isLoading && (
        <svg 
          className="animate-spin motion-reduce:animate-none -ml-1 mr-2 h-4 w-4" 
          fill="none" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}

      {/* 左側アイコン */}
      {icon && iconPosition === 'left' && !isLoading && (
        <Icon 
          name={icon} 
          size={iconSizes[size]} 
          className={`${children ? 'mr-2' : ''}`}
        />
      )}

      {/* ボタンテキスト */}
      {children && (
        <span className={isLoading ? 'opacity-50' : ''}>
          {children}
        </span>
      )}

      {/* 右側アイコン */}
      {icon && iconPosition === 'right' && !isLoading && (
        <Icon 
          name={icon} 
          size={iconSizes[size]} 
          className={`${children ? 'ml-2' : ''}`}
        />
      )}
    </button>
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
 * 
 * // サイズバリエーション
 * <Button size="sm">小さい</Button>
 * <Button size="md">標準</Button>
 * <Button size="lg">大きい</Button>
 */