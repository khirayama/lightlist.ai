import React from 'react';

export type IconName = 
  // Navigation
  | 'menu'
  | 'settings'
  | 'user'
  | 'arrow-left'
  | 'arrow-right-on-rectangle'
  // Actions
  | 'plus'
  | 'share'
  | 'more'
  | 'sort'
  // Editing
  | 'edit'
  | 'trash'
  | 'check'
  | 'close'
  | 'x-mark'
  // Content
  | 'calendar'
  | 'clock'
  // Settings
  | 'palette'
  | 'language'
  | 'shield-check'
  | 'mail'
  | 'cog'
  | 'exclamation-triangle'
  // Security
  | 'lock-closed'
  | 'key'
  // Status
  | 'warning'
  | 'success'
  | 'error'
  | 'info'
  | 'loading';

export type IconSize = 16 | 20 | 24;

interface IconProps {
  name: IconName;
  size?: IconSize;
  className?: string;
  'aria-label'?: string;
  'aria-hidden'?: boolean;
}

// アイコン名から絵文字への完全マッピング
const getEmoji = (iconName: IconName): string => {
  switch (iconName) {
    // Navigation
    case 'menu': return '☰';
    case 'settings': return '⚙️';
    case 'user': return '👤';
    case 'arrow-left': return '←';
    case 'arrow-right-on-rectangle': return '🚪';
    // Actions
    case 'plus': return '➕';
    case 'share': return '📤';
    case 'more': return '⋯';
    case 'sort': return '📶';
    // Editing
    case 'edit': return '✏️';
    case 'trash': return '🗑️';
    case 'check': return '✅';
    case 'close': return '❌';
    case 'x-mark': return '❌';
    // Content
    case 'calendar': return '📅';
    case 'clock': return '🕐';
    // Settings
    case 'palette': return '🎨';
    case 'language': return '🌐';
    case 'shield-check': return '🛡️';
    case 'mail': return '📧';
    case 'cog': return '⚙️';
    case 'exclamation-triangle': return '⚠️';
    // Security
    case 'lock-closed': return '🔒';
    case 'key': return '🔑';
    // Status
    case 'warning': return '⚠️';
    case 'success': return '✅';
    case 'error': return '❌';
    case 'info': return 'ℹ️';
    case 'loading': return '⏳';
    default: return '❓'; // フォールバック
  }
};

/**
 * 統一アイコンコンポーネント（絵文字版）
 * 
 * DESIGN.md準拠:
 * - 絵文字ベースで統一
 * - サイズ: 16px, 20px, 24px
 * - アクセシビリティ対応
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  className = '',
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden = !ariaLabel,
}) => {
  // サイズに応じたフォントサイズの設定
  const sizeStyles = {
    16: '16px',
    20: '20px',
    24: '24px',
  } as const;

  const fontSize = sizeStyles[size] || '24px';
  
  // 絵文字を取得
  const emoji = getEmoji(name);

  return (
    <span
      className={`inline-block ${className}`.trim()}
      style={{ 
        fontSize,
        lineHeight: 1,
        verticalAlign: 'middle'
      }}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      role={ariaHidden ? undefined : 'img'}
    >
      {emoji}
    </span>
  );
};

/**
 * 使用例:
 * 
 * // ボタン内での使用（16px推奨）
 * <button className="text-primary-500">
 *   <Icon name="plus" size={16} aria-label="タスクを追加" />
 * </button>
 * 
 * // ラベルとの組み合わせ（20px推奨）
 * <div className="flex items-center gap-2 text-gray-600">
 *   <Icon name="calendar" size={20} />
 *   <span>期限設定</span>
 * </div>
 * 
 * // 単体使用（24px推奨）
 * <Icon name="settings" size={24} className="text-gray-700 hover:text-primary-500" />
 * 
 * // ステータス表示
 * <Icon name="success" className="text-success-500" />
 * <Icon name="error" className="text-error-500" />
 */