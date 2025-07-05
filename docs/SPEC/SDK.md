# タスク管理アプリ SDK設計書

## 目次

- [概要](#概要)
- [1. 型定義](#1-型定義)
- [2. Services層（API通信層）](#2-services層api通信層)
- [3. Actions層（ビジネスロジック層）](#3-actions層ビジネスロジック層)
- [4. 内部アーキテクチャ（Y.js統合とCollaborative機能）](#4-内部アーキテクチャyjs統合とcollaborative機能)
- [5. Store層（状態管理）](#5-store層状態管理)
- [6. エラーハンドリングとリカバリー機能](#6-エラーハンドリングとリカバリー機能)
- [7. メインSDKインターフェース](#7-メインsdkインターフェース)
- [8. 使用例](#8-使用例)
- [9. 実装上の注意点](#9-実装上の注意点)

## 概要

本SDKは、タスク管理アプリのクライアント（web/native）とAPI間の通信、リアルタイム共同編集、状態管理を統合的に提供します。

### アーキテクチャ

```
UI Layer (React Components)
    ↓
Actions Layer (Business Logic)
    ↓ ↓
Services Layer (API Communication)    Store Layer (State Management + Y.js)
```

#### 層の責務と関係性

- UI Layer: React コンポーネント。Actions Layer のみを呼び出す(SDKではサポートしない)
- Actions Layer: ビジネスロジック。Services Layer を呼び出し、Store Layer を更新する
- Services Layer: API 通信、トークン管理、session storage、プラットフォーム抽象化。Store Layer は呼ばない
- Store Layer: 状態管理と Y.js。Actions Layer からのみ更新される

## 1. 型定義

SDKで使用する型定義については、実際の型定義ファイルを参照してください。

参照: `@packages/sdk/src/types.ts`

## 2. Services層（API通信層）

責務: Services Layer は以下の処理を担当します：
1. API通信: RESTful API エンドポイントとの通信
2. トークン管理: JWT トークンの自動更新と管理
3. Session Storage: セッション情報や認証情報の永続化（内部機能）
4. プラットフォーム抽象化: Web と Native の永続化方法の差異を吸収（内部機能）
5. エラーハンドリング: ネットワークエラーや API エラーの処理

重要: Services Layer は Store Layer を直接呼び出しません。状態の更新は Actions Layer の責務です。

### 主要なサービス
- AuthService: 認証関連のAPI通信
- SettingsService: ユーザー・アプリ設定、タスクリスト順序管理
- CollaborativeService: Y.js共同編集とセッション管理
- ShareService: タスクリスト共有機能
- MonitoringService: システム監視

詳細なインターフェース定義は実装ファイルを参照してください。

参照: `@packages/sdk/src/services/index.ts`

## 3. Actions層（ビジネスロジック層）

責務: Actions Layer は以下の処理を担当します：
1. Services Layer の呼び出し: API通信やセッション管理を依頼
2. Store Layer の更新: 楽観的更新や状態の同期を実行  
3. ビジネスロジック: 複数の操作を組み合わせた処理フロー

Actions Layer は Services Layer を呼び出してデータを取得・更新し、同時に Store Layer を更新してUIに即座に反映します。Services Layer は Store Layer を直接呼び出しません。

### 主要なアクション
- AuthActions: 認証・ユーザー管理
- SettingsActions: ユーザー・アプリ設定管理
- TaskListActions: タスクリスト操作（Y.js協調編集を内部で自動実行）
- TaskActions: タスク操作（リアルタイム同期を内部で自動実行）
- ShareActions: タスクリスト共有機能

重要: すべてのタスク・タスクリスト操作はY.js経由でリアルタイム同期が自動実行されます。同期処理を手動で管理する必要はありません。

詳細なインターフェース定義は実装ファイルを参照してください。

参照: `@packages/sdk/src/actions/index.ts`

**実装状況**: ✅ 完了（2025年1月5日実装）
- AuthActions, SettingsActions, TaskListActions, TaskActions, ShareActions の全実装完了
- 43個のテストが全て成功
- t-wada式のTDDで実装（Red→Green→Blue）
- Y.js協調編集とリアルタイム同期を内部で自動実行

## 4. 内部アーキテクチャ（Y.js統合とCollaborative機能）

注意: このセクションは内部実装の説明です。これらのインターフェースはSDKの内部で使用され、ユーザーには公開されません。

### 内部実装概要

タスクリストとタスクの操作は、以下の内部コンポーネントによって自動的にリアルタイム同期されます：

1. Y.js統合エンジン: ドキュメント作成・同期・競合解決を自動実行
2. 協調編集マネージャー: セッション管理と自動競合解決
3. 内部データ構造: Y.jsのCRDTでタスク順序を管理、内容はLast-Writer-Wins
4. 自動競合解決: タスク順序は自動マージ、同時編集は最終更新優先

### ユーザー操作と内部処理の対応

```
タスクリスト作成 → Y.jsドキュメント作成 + セッション開始 + リアルタイム通知
タスク作成      → 楽観的更新 + Y.js追加 + リアルタイム同期 + サーバーバックアップ  
タスク移動      → 楽観的移動 + CRDT順序更新 + 競合自動マージ + 順序同期
ネットワーク切断 → オフライン変更キュー + 復帰時自動同期 + 競合自動解決
```

重要: ユーザーは同期処理を意識する必要がありません。すべて内部で自動処理されます。

## 5. Store層（状態管理）

責務: Store Layer は以下を担当します：
1. アプリケーション状態管理: 一元的な状態管理とイミュータブル更新
2. Y.js統合: ドキュメント管理とリアルタイム同期
3. 購読管理: UI コンポーネントへの状態変更通知
4. セレクター: 効率的な状態の計算と取得

### 主要コンポーネント
- Store: メインストア（状態、Y.js、リスナー管理）
- Selectors: 基本・計算済み・同期状態・エラー・認証セレクター
- StoreConfig: 初期化設定（DevTools、永続化等）
- ImmutableHelpers: 効率的なイミュータブル更新

重要: Store は Actions Layer からのみ更新され、Services Layer は直接アクセスしません。

詳細なインターフェース定義は実装ファイルを参照してください。

参照: `@packages/sdk/src/store/index.ts`

## 6. エラーハンドリングとリカバリー機能

責務: 包括的なエラー処理とシステム復旧機能を提供します：
1. エラー処理: API・ネットワーク・バリデーションエラーの統一的処理
2. 自動リトライ: 戦略的リトライとバックオフによる回復処理
3. ネットワーク管理: オフライン対応と同期キュー管理
4. 競合解決: Y.js競合の自動検出と解決
5. データ整合性: データ破損検出と自動修復

### 主要コンポーネント
- ErrorHandler: エラー分類・報告・復旧アクション提案
- RetryManager: 戦略的リトライとスケジュール管理
- NetworkManager: ネットワーク状態監視とオフライン対応
- ConflictResolver: Y.js競合の自動・手動解決
- DataIntegrityChecker: データ整合性チェックと診断

重要: エラー処理は自動化されており、ユーザーは基本的にActionResultパターンでエラー状態を確認するだけです。

詳細なインターフェース定義は実装ファイルを参照してください。

参照: `@packages/sdk/src/errors/index.ts`

## 7. メインSDKインターフェース

責務: SDKの統一エントリーポイントとライフサイクル管理：
1. シンプルなAPI: 各層への統一されたアクセスポイント
2. 設定管理: プラットフォーム固有設定と動的設定変更
3. ライフサイクル管理: 初期化・破棄とリソース管理
4. ステータス監視: 認証・接続・同期状態の統合監視

### 公開インターフェース
```typescript
const sdk = new LightListSDK(config);
await sdk.initialize();

// アクション（ビジネスロジック）
sdk.auth          // 認証・ユーザー管理
sdk.settings      // 設定管理  
sdk.taskLists     // タスクリスト操作
sdk.tasks         // タスク操作
sdk.share         // 共有機能

// 状態管理
sdk.store         // 状態アクセス
sdk.selectors     // データ取得
```

### 設定とステータス
- SDKConfig: API・プラットフォーム・永続化・共同編集・エラー設定
- SDKStatus: 初期化・認証・接続・同期・エラー・パフォーマンス状態
- SDKFactory: SDK作成・設定生成・設定検証

重要: 内部依存（協調編集マネージャー、Y.js統合）はユーザーには公開されません。

詳細なインターフェース定義は実装ファイルを参照してください。

参照: `@packages/sdk/src/sdk.ts`

## 8. 使用例

### 主要な使用パターン

SDKの基本的な使用方法は以下の通りです：

1. 初期化と認証: SDK設定 → 初期化 → ログイン → bootstrap
2. リアルタイム同期: タスク操作は自動的に他ユーザーに同期される
3. エラーハンドリング: ActionResultパターンによる統一的なエラー処理
4. 設定管理: テーマ・言語・アプリ設定の管理
5. React統合: カスタムフックによるStore購読とセレクター利用

### 重要な特徴
- 透明なリアルタイム同期: ユーザーは同期処理を意識する必要がない
- 自動エラー回復: ネットワーク切断・復帰は自動処理される
- 楽観的更新: UI操作は即座に反映、バックグラウンドで同期
- 統一されたエラー処理: ActionResultパターンで一貫性を保つ

詳細な使用例コードは実装ファイルを参照してください。

参照: `@packages/sdk/src/examples/usage.ts`

## 9. 実装上の注意点

### ユーザ体験
- トークンの自動リフレッシュ

### パフォーマンス最適化
- Y.jsの更新は小さな差分のみを送信
- ストア更新は必要最小限に抑制
- 大量のタスクリストに対する効率的な処理
- メモリリークの防止

### セキュリティ
- JWTトークンの安全な管理
- Y.js更新の検証
- XSS/CSRF対策
- 機密情報の適切な暗号化

### 信頼性
- ネットワーク切断時の適切な処理
- データの整合性保証
- 自動リカバリー機能
- 適切なエラーメッセージ

### 拡張性
- 新しい機能の追加容易性
- プラットフォーム間の互換性
- 第三者プラグインのサポート
- 将来的なAPI変更への対応
