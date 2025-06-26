import React from 'react';
import { 
  Ionicons,
  MaterialIcons,
  Feather,
} from '@expo/vector-icons';

export type IconName = 
  // Navigation
  | 'menu'
  | 'settings'
  | 'user'
  // Actions
  | 'plus'
  | 'share'
  | 'more'
  // Editing
  | 'edit'
  | 'trash'
  | 'check'
  | 'close'
  // Content
  | 'calendar'
  | 'clock'
  // Status
  | 'warning'
  | 'success'
  | 'error'
  | 'info'
  | 'loading'
  // Sort
  | 'sort';

export type IconSize = 16 | 20 | 24;

interface IconProps {
  name: IconName;
  size?: IconSize;
  color?: string;
  style?: any;
}

/**
 * 統一アイコンコンポーネント (React Native)
 * 
 * DESIGN.md準拠:
 * - 線画（Line icons）ベースで統一
 * - モノトーン（状態に応じて色を付与）
 * - サイズ: 16px, 20px, 24px
 * - ボタンやラベルとの組み合わせ時: 16px or 20px
 * - 単体使用時: 24px以上
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = '#6B7280', // デフォルトは gray-500
  style,
  ...props
}) => {
  // アイコンのマッピング（Featherアイコンを優先、必要に応じてIoniconsを使用）
  const getIconComponent = () => {
    switch (name) {
      // Navigation
      case 'menu':
        return <Feather name="menu" size={size} color={color} style={style} {...props} />;
      case 'settings':
        return <Feather name="settings" size={size} color={color} style={style} {...props} />;
      case 'user':
        return <Feather name="user" size={size} color={color} style={style} {...props} />;
      
      // Actions
      case 'plus':
        return <Feather name="plus" size={size} color={color} style={style} {...props} />;
      case 'share':
        return <Feather name="share" size={size} color={color} style={style} {...props} />;
      case 'more':
        return <Feather name="more-vertical" size={size} color={color} style={style} {...props} />;
      
      // Editing
      case 'edit':
        return <Feather name="edit-2" size={size} color={color} style={style} {...props} />;
      case 'trash':
        return <Feather name="trash-2" size={size} color={color} style={style} {...props} />;
      case 'check':
        return <Feather name="check" size={size} color={color} style={style} {...props} />;
      case 'close':
        return <Feather name="x" size={size} color={color} style={style} {...props} />;
      
      // Content
      case 'calendar':
        return <Feather name="calendar" size={size} color={color} style={style} {...props} />;
      case 'clock':
        return <Feather name="clock" size={size} color={color} style={style} {...props} />;
      
      // Status
      case 'warning':
        return <Feather name="alert-triangle" size={size} color={color} style={style} {...props} />;
      case 'success':
        return <Feather name="check-circle" size={size} color={color} style={style} {...props} />;
      case 'error':
        return <Feather name="x-circle" size={size} color={color} style={style} {...props} />;
      case 'info':
        return <Feather name="info" size={size} color={color} style={style} {...props} />;
      case 'loading':
        return <Feather name="loader" size={size} color={color} style={style} {...props} />;
      
      // Sort
      case 'sort':
        return <MaterialIcons name="sort" size={size} color={color} style={style} {...props} />;
      
      default:
        console.warn(`Icon "${name}" not found`);
        // フォールバック: info アイコン
        return <Feather name="info" size={size} color={color} style={style} {...props} />;
    }
  };

  return getIconComponent();
};

/**
 * 使用例:
 * 
 * // ボタン内での使用（16px推奨）
 * <TouchableOpacity className="flex-row items-center">
 *   <Icon name="plus" size={16} color="#005AAF" />
 *   <Text className="ml-2">追加</Text>
 * </TouchableOpacity>
 * 
 * // ラベルとの組み合わせ（20px推奨）
 * <View className="flex-row items-center">
 *   <Icon name="calendar" size={20} color="#6B7280" />
 *   <Text className="ml-2">期限設定</Text>
 * </View>
 * 
 * // 単体使用（24px推奨）
 * <Icon name="settings" size={24} color="#374151" />
 * 
 * // ステータス表示
 * <Icon name="success" color="#10B981" />
 * <Icon name="error" color="#EF4444" />
 */