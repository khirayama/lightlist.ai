// 統一デザインシステムコンポーネント（Native版）
export { Button } from './Button';
export type { ButtonVariant, ButtonSize, ButtonState } from './Button';

export { Input } from './Input';
export type { InputState, InputSize } from './Input';

export { Card, CardHeader, CardTitle, CardContent, CardFooter } from './Card';
export type { CardVariant, CardState, CardPadding } from './Card';

export { Icon } from './Icon';
export type { IconName, IconSize } from './Icon';

// 既存のコンポーネント
export { AnimatedTaskItem } from './AnimatedTaskItem';
export { AnimatedTaskListCarousel } from './AnimatedTaskListCarousel';
export { DrawerContent } from './DrawerContent';
export { TaskItem } from './TaskItem';
export { TaskListCarousel } from './TaskListCarousel';

/**
 * DESIGN.md準拠のデザインシステムコンポーネント（Native版）
 * 
 * 統一された基本コンポーネントセット:
 * 
 * ### Button
 * - Variant: primary, secondary, destructive
 * - State: normal, loading, disabled
 * - Size: sm, md, lg
 * - アイコンサポート付き
 * - ネイティブなタッチフィードバック
 * - 最小タッチターゲット44px対応
 * 
 * ### Input
 * - State: normal, error, success, disabled
 * - Size: sm, md, lg
 * - ラベル、ヘルパーテキスト、バリデーションメッセージ
 * - アイコンサポート付き
 * - React Native TextInput準拠
 * 
 * ### Card
 * - Variant: default, outlined, elevated
 * - State: normal, pressed, selected
 * - Padding: none, sm, md, lg
 * - Header, Content, Footer サブコンポーネント
 * - ネイティブなタッチリップル効果
 * 
 * ### Icon
 * - Size: 16px, 20px, 24px
 * - @expo/vector-icons（Feather）ベース
 * - TypeScript完全サポート
 * 
 * 使用例:
 * ```tsx
 * import { Button, Input, Card, Icon } from '@/components';
 * 
 * <Card variant="elevated" interactive onPress={handlePress}>
 *   <Input 
 *     label="タスク名" 
 *     state="normal" 
 *     icon="edit"
 *   />
 *   <Button 
 *     variant="primary" 
 *     icon="plus" 
 *     iconPosition="left"
 *   >
 *     追加
 *   </Button>
 * </Card>
 * ```
 */