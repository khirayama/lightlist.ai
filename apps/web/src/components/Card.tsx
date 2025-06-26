import React, { forwardRef } from 'react';

export type CardVariant = 'default' | 'outlined' | 'elevated';
export type CardState = 'normal' | 'hover' | 'active' | 'selected';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  state?: CardState;
  padding?: CardPadding;
  interactive?: boolean; // ホバー・アクティブ効果を有効にするか
  selected?: boolean;
  children: React.ReactNode;
}

/**
 * 統一Cardコンポーネント
 * 
 * DESIGN.md準拠:
 * - Normal、Hover、Active、Selected状態
 * - 8px角丸（lg）
 * - shadow-md
 * - 適切なトランジション（200ms ease-out）
 * - レスポンシブパディング
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(({
  variant = 'default',
  state = 'normal',
  padding = 'md',
  interactive = false,
  selected = false,
  className = '',
  children,
  ...props
}, ref) => {
  const isSelected = selected || state === 'selected';

  // バリアント別のスタイル
  const variantStyles = {
    default: 'bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700',
    outlined: 'bg-transparent border-2 border-gray-300 dark:border-gray-600',
    elevated: 'bg-white dark:bg-gray-800',
  };

  // パディングスタイル
  const paddingStyles = {
    none: '',
    sm: 'p-3 md:p-4',
    md: 'p-4 md:p-6', // モバイル16px、デスクトップ24px
    lg: 'p-6 md:p-8',
  };

  // インタラクティブな効果（DESIGN.md準拠）
  const interactiveStyles = interactive ? {
    normal: 'transition-all duration-200 ease-out cursor-pointer motion-reduce:transition-none motion-safe:animate-fade-in',
    hover: 'motion-safe:hover:shadow-lg motion-safe:hover:transform motion-safe:hover:-translate-y-1',
    active: 'motion-safe:active:shadow-sm motion-safe:active:transform motion-safe:active:translate-y-1',
  } : {
    normal: 'motion-safe:animate-fade-in',
    hover: '',
    active: '',
  };

  // 選択状態のスタイル（アニメーション対応）
  const selectedStyles = isSelected 
    ? 'ring-2 ring-primary-500 border-primary-500 dark:border-primary-400 motion-safe:animate-scale-in' 
    : '';

  // 影のスタイル
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
    interactiveStyles.normal,
    interactive && interactiveStyles.hover,
    interactive && interactiveStyles.active,
    selectedStyles,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={ref}
      className={finalClassName}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          props.onClick?.(e as any);
        }
      } : undefined}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

/**
 * CardHeader - カードのヘッダー部分
 */
export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({
  className = '',
  children,
  ...props
}, ref) => (
  <div 
    ref={ref}
    className={`flex items-center justify-between mb-4 ${className}`}
    {...props}
  >
    {children}
  </div>
));

CardHeader.displayName = 'CardHeader';

/**
 * CardTitle - カードのタイトル
 */
export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({
  className = '',
  children,
  ...props
}, ref) => (
  <h3 
    ref={ref}
    className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}
    {...props}
  >
    {children}
  </h3>
));

CardTitle.displayName = 'CardTitle';

/**
 * CardContent - カードのコンテンツ部分
 */
export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({
  className = '',
  children,
  ...props
}, ref) => (
  <div 
    ref={ref}
    className={`${className}`}
    {...props}
  >
    {children}
  </div>
));

CardContent.displayName = 'CardContent';

/**
 * CardFooter - カードのフッター部分
 */
export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({
  className = '',
  children,
  ...props
}, ref) => (
  <div 
    ref={ref}
    className={`flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 ${className}`}
    {...props}
  >
    {children}
  </div>
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
 *     コンテンツ
 *   </CardContent>
 * </Card>
 * 
 * // インタラクティブなカード
 * <Card interactive onClick={handleClick}>
 *   クリック可能なカード
 * </Card>
 * 
 * // 選択状態のカード
 * <Card selected>
 *   選択されたカード
 * </Card>
 * 
 * // アウトライン バリアント
 * <Card variant="outlined" padding="lg">
 *   アウトラインカード
 * </Card>
 * 
 * // フル構成の例
 * <Card variant="elevated" interactive>
 *   <CardHeader>
 *     <CardTitle>設定</CardTitle>
 *     <Button variant="secondary" size="sm">編集</Button>
 *   </CardHeader>
 *   <CardContent>
 *     設定内容がここに表示されます
 *   </CardContent>
 *   <CardFooter>
 *     <Button variant="secondary">キャンセル</Button>
 *     <Button variant="primary">保存</Button>
 *   </CardFooter>
 * </Card>
 */