// 統一デザインシステムコンポーネント
export { Button } from './Button';
export type { ButtonVariant, ButtonSize, ButtonState } from './Button';

export { Input } from './Input';
export type { InputState, InputSize } from './Input';

export { Card, CardHeader, CardTitle, CardContent, CardFooter } from './Card';
export type { CardVariant, CardState, CardPadding } from './Card';

export { Icon } from './Icon';
export type { IconName, IconSize } from './Icon';

// 既存のコンポーネント
export { Layout } from './Layout';
export { TaskListCard } from './TaskListCard';
export { TaskListCarousel } from './TaskListCarousel';
export { TaskListDrawer } from './TaskListDrawer';
export { ColorPicker } from './ColorPicker';
export { ShareModal } from './ShareModal';
export { UndoToast } from './UndoToast';
export { OfflineIndicator } from './OfflineIndicator';
export { AnimatedTaskListCard } from './AnimatedTaskListCard';

/**
 * DESIGN.md準拠のデザインシステムコンポーネント
 * 
 * 統一された基本コンポーネントセット:
 * 
 * ### Button
 * - Variant: primary, secondary, destructive
 * - State: normal, loading, disabled
 * - Size: sm, md, lg
 * - アイコンサポート付き
 * 
 * ### Input
 * - State: normal, error, success, disabled
 * - Size: sm, md, lg
 * - ラベル、ヘルパーテキスト、バリデーションメッセージ
 * - アイコンサポート付き
 * 
 * ### Card
 * - Variant: default, outlined, elevated
 * - State: normal, hover, active, selected
 * - Padding: none, sm, md, lg
 * - Header, Content, Footer サブコンポーネント
 * 
 * ### Icon
 * - Size: 16px, 20px, 24px
 * - Heroicons ベース
 * - TypeScript完全サポート
 * 
 * 使用例:
 * ```tsx
 * import { Button, Input, Card, Icon } from '@/components';
 * 
 * <Card variant="elevated" interactive>
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