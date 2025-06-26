# デザインシステム

- シンプルでオーソドックスなレイアウトとユーザインタフェース
- プラットフォームに応じたネイティブな見た目
- アクセシビリティファーストのデザイン思想

## 現在の実装状況

### Webアプリ

- Tailwind CSSを使用したスタイリング
- next-themesによるテーマ切り替え（システム/ライト/ダーク）
- i18nextによる多言語対応（日本語/英語）
- Google Fonts（Inter、Noto Sans JP）の使用

### Nativeアプリ

- NativeWindを使用したTailwindスタイルの適用
- AsyncStorageによるテーマ設定の保存
- expo-system-uiによるシステムUIの制御
- expo-localizationによるデバイス言語の検出

## 参考

- https://design.digital.go.jp/
- https://smarthr.design/

## 色

### ライトテーマ

- **ベースカラー**

  - Primary: `#005AAF`（信頼感のある青）
  - Secondary: `#0078D4`（アクセントに使える青）
  - Accent: `#00B8A9`（通知・強調表現などに）

- **UIカラー**

  - Border: `#D1D5DB`
  - Background: `#F9FAFB`
  - Surface: `#FFFFFF`

- **ステータスカラー**

  - Success: `#34D399`
  - Warning: `#FBBF24`
  - Error: `#EF4444`

- **文字色**
  - Primary Text: `#111827`
  - Secondary Text: `#6B7280`
  - Disabled Text: `#9CA3AF`

### ダークテーマ

- **ベースカラー**

  - Primary: `#3B82F6`（ダークモードでの視認性を考慮した青）
  - Secondary: `#60A5FA`（アクセントに使える明るい青）
  - Accent: `#10B981`（通知・強調表現などに）

- **UIカラー**

  - Border: `#374151`
  - Background: `#111827`
  - Surface: `#1F2937`

- **ステータスカラー**

  - Success: `#10B981`
  - Warning: `#FCD34D`
  - Error: `#F87171`

- **文字色**
  - Primary Text: `#F9FAFB`
  - Secondary Text: `#D1D5DB`
  - Disabled Text: `#6B7280`

> 色はWCAGのコントラスト比（AA基準4.5:1以上、AAA基準7:1以上）を意識して設定

## タイポグラフィ

- **フォントファミリー**

  - 和文: `"Noto Sans JP", sans-serif`
  - 欧文: `"Inter", sans-serif`

- **基本設定**

  - ベースフォントサイズ: `16px`
  - 行間: `1.5`（`24px`）

- **階層例**

  | 用途    | サイズ | ウェイト |
  | ------- | ------ | -------- |
  | h1      | 32px   | 700      |
  | h2      | 24px   | 700      |
  | h3      | 20px   | 600      |
  | Body    | 16px   | 400      |
  | Caption | 12px   | 400      |

> テキストサイズは4px刻みで設計し、リズム感と視認性を両立。

## アイコン

- **スタイル**

  - 線画（Line icons）ベースで統一（例：24px枠、2px線幅）
  - モノトーン（カラーを使わず、状態に応じて色を付与）

- **ライブラリ**

  - アイコンはのちほど検討するため、基本的には絵文字を使用

- **使用ルール**
  - ボタンやラベルとの組み合わせ時は16pxまたは20pxを推奨
  - 単体使用時は24px以上で使用可

## 余白

- **単位体系**

  - 4pxグリッド（例：4px, 8px, 16px, 24px, 32px...）

- **要素間の基本ルール**

  - ボタンと隣接要素: `8px`
  - セクション間: `32px〜48px`
  - フォーム内余白: `16px`

- **Tailwind対応例**
  - `p-4`, `m-2`, `space-y-6` などで構成

> コンポーネント設計時にpadding/marginを内包しすぎない（再利用性のため）

## レイアウト（グリッド、フレックスなど）

- **基本レイアウト**

  - 最大幅: `1280px`
  - コンテナの左右余白: `16px〜24px`

- **レスポンシブブレークポイント**

  - Mobile: `640px`未満（sm未満）
  - Tablet: `640px`以上`1024px`未満（sm以上lg未満）
  - Desktop: `1024px`以上（lg以上）
  - Wide Desktop: `1280px`以上（xl以上）

- **グリッド**

  - 12カラムグリッド（レスポンシブ対応）
    - Mobile: 4カラム（col-span-3でフル幅）
    - Tablet: 8カラム（col-span-4でハーフ幅）
    - Desktop: 12カラム（col-span-6でハーフ幅）

- **Flex**
  - 小要素の整列に使用（ナビゲーション、ボタン群など）
  - gapで間隔を制御（`gap-x-4`, `gap-y-2`など）

> Grid: 構造設計に、Flex: 局所レイアウトに。使い分けを意識。

## 装飾（角丸、影など）

- **角丸（Border Radius）**

  - 基本: `2px`（sm）
  - ボタン・入力欄: `6px`（md）
  - カードやモーダル: `8px`（lg）

- **影（Shadow）**

  - ボタン: `shadow-sm`
  - カード: `shadow-md`
  - モーダル: `shadow-lg`

- **その他**
  - 境界線: `1px solid #D1D5DB`（目立たせすぎない中間グレー）
  - ホバーやフォーカス時は影やボーダー色の変化でフィードバック

> 装飾は「控えめで明快に」。視覚的ヒエラルキーの一部として機能させる。

## コンポーネント設計

### ボタン

- **プライマリボタン**: 背景色 `primary`、テキスト色 `white`
- **セカンダリボタン**: ボーダー付き、背景透明
- **デストラクティブボタン**: 背景色 `error`、テキスト色 `white`（削除などの危険な操作）

#### ボタンの状態

- **Normal（通常）**
  - プライマリ: `bg-primary text-white`
  - セカンダリ: `border border-primary text-primary bg-transparent`
  - デストラクティブ: `bg-error text-white`

- **Hover（ホバー）**
  - プライマリ: `bg-primary/90`（透明度90%）
  - セカンダリ: `bg-primary/10`（薄い背景色追加）
  - デストラクティブ: `bg-error/90`

- **Active（アクティブ）**
  - プライマリ: `bg-primary/80 scale-[0.98]`（軽く縮小）
  - セカンダリ: `bg-primary/20 scale-[0.98]`
  - デストラクティブ: `bg-error/80 scale-[0.98]`

- **Focus（フォーカス）**
  - 全種類: `ring-2 ring-primary ring-offset-2`

- **Disabled（無効）**
  - 全種類: `opacity-50 cursor-not-allowed`
  - インタラクションを無効化

- **Loading（読み込み中）**
  - スピナーアイコン表示
  - テキストの透明度を下げる: `text-opacity-50`
  - クリック無効化

### フォーム要素

#### 入力欄

- **基本スタイル**: 角丸 `6px`（md）、ボーダー付き

#### 入力欄の状態

- **Normal（通常）**
  - `border border-gray-300 bg-white`
  - プレースホルダー: `placeholder:text-gray-400`

- **Focus（フォーカス）**
  - `border-primary ring-1 ring-primary`
  - アウトラインなし: `outline-none`

- **Error（エラー）**
  - `border-error ring-1 ring-error`
  - エラーメッセージ: `text-error text-sm mt-1`

- **Success（成功）**
  - `border-success ring-1 ring-success`
  - 成功アイコン表示

- **Disabled（無効）**
  - `bg-gray-100 cursor-not-allowed opacity-60`

#### その他のフォーム要素

- **ラジオボタン**: カスタムデザインの円形ボタン
- **チェックボックス**: 角丸 `2px`、チェックマークアニメーション
- **ラベル**: フォーム要素の上部に配置、`text-sm font-medium text-gray-700`

### カード

#### 基本スタイル

- 背景色: `surface`
- 角丸: `8px`（lg）
- 影: `shadow-md`
- パディング: `16px`（モバイル）、`24px`（デスクトップ）

#### カードの状態

- **Normal（通常）**
  - `bg-surface shadow-md border border-gray-200`

- **Hover（ホバー）**
  - `shadow-lg transform translate-y-[-1px]`
  - 軽い浮き上がり効果

- **Active（アクティブ）**
  - `shadow-sm transform translate-y-[1px]`
  - 軽い沈み込み効果

- **Selected（選択済み）**
  - `ring-2 ring-primary border-primary`

### ナビゲーション

- **Web**: リンクにホバー効果
- **Native**: プラットフォーム標準のナビゲーションバー

## アクセシビリティガイドライン

### 色覚対応・コントラスト

- **コントラスト比の確保**
  - 通常テキスト: 4.5:1以上（AA基準）
  - 大きなテキスト（18pt以上）: 3:1以上（AA基準）
  - 重要な情報: 7:1以上（AAA基準を推奨）

- **色のみに依存しない情報伝達**
  - 完了状態: チェックマーク + 取り消し線
  - エラー状態: 赤色 + エラーアイコン + メッセージテキスト
  - 成功状態: 緑色 + 成功アイコン + メッセージテキスト
  - 警告状態: 黄色 + 警告アイコン + メッセージテキスト

### フォーカス管理

- **フォーカスインジケーター**
  - 最小幅: `2px`のアウトライン
  - 色: `#005AAF`（プライマリカラー）
  - オフセット: `2px`（要素から離す）
  - 形状: `rounded-md`（要素の形状に合わせる）

- **フォーカス順序**
  - 論理的な読み上げ順序に従う
  - 左から右、上から下の順序
  - モーダル内ではフォーカストラップを実装

- **フォーカスの可視性**
  - `focus-visible`を使用してキーボード操作時のみ表示
  - マウス操作時は非表示（UX向上）

### キーボード操作

- **基本操作**
  - `Tab`: 次の要素へ移動
  - `Shift + Tab`: 前の要素へ移動
  - `Enter`: ボタンやリンクの実行
  - `Space`: チェックボックス、ボタンのトグル
  - `Escape`: モーダルやドロップダウンの閉じる

- **アプリケーション固有のショートカット**
  - `Ctrl/Cmd + N`: 新しいタスク追加
  - `Ctrl/Cmd + Enter`: タスク保存
  - `Delete`: 選択したタスクの削除
  - `Ctrl/Cmd + /`: ショートカット一覧表示

### 読み上げ対応（スクリーンリーダー）

- **代替テキスト**
  - 画像・アイコンに意味のある`alt`属性
  - 装飾的な画像は`alt=""`で空に設定

- **ラベル付け**
  - フォーム要素には明確な`label`または`aria-label`
  - ボタンには説明的なテキストまたは`aria-label`
  - リンクには目的地を示すテキスト

- **状態の通知**
  - `aria-live`リージョンでの動的な変更通知
  - `aria-expanded`でドロップダウンの状態表示
  - `aria-selected`で選択状態の表示

### タッチ・操作性

- **タッチターゲット**
  - 最小サイズ: `44x44px`（iOS、Android標準）
  - 推奨サイズ: `48x48px`以上
  - 隣接要素との間隔: `8px`以上

- **操作フィードバック**
  - タップ時の視覚的フィードバック（`active`状態）
  - 長押し操作のヒント表示
  - 操作完了時の確認メッセージ

### エラーハンドリング

- **エラーメッセージ**
  - 明確で理解しやすい言葉で説明
  - 解決方法の具体的な提示
  - `aria-describedby`でフォーム要素と関連付け

- **バリデーション**
  - リアルタイムでの入力検証
  - エラー箇所の明確な表示
  - 成功時の確認メッセージ

## アニメーション・トランジション

### 基本原則

- **パフォーマンス重視**: `transform`と`opacity`を主に使用
- **自然な動き**: イージング関数で現実的な動きを表現
- **意味のある動き**: ユーザーの理解を助ける動きのみ実装
- **アクセシビリティ配慮**: `prefers-reduced-motion`に対応

### 持続時間（Duration）

- **短時間（100-200ms）**: ホバー、フォーカス状態の変化
- **中時間（200-300ms）**: モーダル開閉、ドロップダウン表示
- **長時間（300-500ms）**: ページ遷移、大きなレイアウト変更

### イージング（Easing）

- **ease-out**: `cubic-bezier(0, 0, 0.2, 1)` - 要素の出現時
- **ease-in**: `cubic-bezier(0.4, 0, 1, 1)` - 要素の退場時
- **ease-in-out**: `cubic-bezier(0.4, 0, 0.2, 1)` - 状態変化時

### アニメーションパターン

#### フェード

```css
/* フェードイン */
.fade-in {
  animation: fadeIn 200ms ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* フェードアウト */
.fade-out {
  animation: fadeOut 200ms ease-in;
}
```

#### スライド

```css
/* スライドアップ */
.slide-up {
  animation: slideUp 300ms ease-out;
}

@keyframes slideUp {
  from { 
    transform: translateY(10px);
    opacity: 0;
  }
  to { 
    transform: translateY(0);
    opacity: 1;
  }
}
```

#### スケール

```css
/* スケールイン */
.scale-in {
  animation: scaleIn 200ms ease-out;
}

@keyframes scaleIn {
  from { 
    transform: scale(0.95);
    opacity: 0;
  }
  to { 
    transform: scale(1);
    opacity: 1;
  }
}
```

### トランジション

#### ボタン・インタラクティブ要素

```css
.button {
  transition: all 150ms ease-out;
}

.button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.button:active {
  transform: translateY(0);
  transition-duration: 75ms;
}
```

#### フォーム要素

```css
.input {
  transition: border-color 200ms ease-out, box-shadow 200ms ease-out;
}

.input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(0, 90, 175, 0.2);
}
```

### モーション削減対応

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 使用ガイドライン

- **ローディング状態**: スピナーアニメーションは1秒以上の処理で表示
- **状態変化**: 色やサイズの変化は200ms以内で完了
- **レイアウト変更**: 要素の移動は300ms程度でスムーズに
- **通知**: トーストやアラートは500ms程度でフェードイン
- **モーダル**: 背景のフェードと要素のスケールインを組み合わせ
