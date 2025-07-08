# 開発ガイド

## 目次

- [ディレクトリ構成](#ディレクトリ構成)
- [利用技術](#利用技術)
- [環境設定](#環境設定)
- [開発](#開発)

## ディレクトリ構成

```text
.
├── apps/
│   ├── api/                    # Node.js/Express API サーバー
│   ├── web/                    # Next.js ウェブアプリケーション
│   └── native/                 # React Native/Expo モバイルアプリ
├── packages/                   # 共通ライブラリやコンポーネント
│   └── sdk/                    # 共通SDKライブラリ(APIラッパーな側面が強い)
├── docs/                       # ドキュメント
├── .prettierrc                 # Prettier 設定
├── turbo.json                  # Turborepo 設定
└── package.json                # ルート package.json (ワークスペース)
```

## 利用技術

### apps/api

- Node.js
- TypeScript
- Express
- Prisma
- PostgreSQL
- Zod
- JWT (jsonwebtoken)
- bcryptjs
- express-rate-limit
- express-validator
- helmet
- cors
- Prettier
- Vitest
- Supertest
- Docker Compose

### apps/web

- React
- TypeScript
- Next.js
- Tailwind CSS
- i18next
- Prettier
- Vitest
- Testing Library

### apps/native

- React Native
- TypeScript
- Expo
- NativeWind（Tailwind CSSライクなスタイリング）
- Expo Router
- i18next
- Prettier
- Vitest

NativeWind設定：
- packages/stylesの共通Tailwind設定を使用
- babel.config.jsでnativewind/babelプラグインを設定
- metro.config.jsでwithNativeWindを設定
- src/styles/global.cssでTailwindディレクティブを設定

## 環境設定

### 前提条件
- Node.js 18+
- Docker Desktop
- npm

### 初期セットアップ

1. 依存関係のインストール
   ```bash
   npm install
   ```

2. 環境ファイルのセットアップ
   ```bash
   npm run setup
   ```
   このコマンドは以下を実行します：
   - apps/api: .envファイル作成
   - apps/web: .envファイル作成  
   - apps/native: .envファイル作成

3. データベースのセットアップ
   ```bash
   # 開発用データベースの起動とセットアップ（推奨）
   npm run setup:dev
   
   # または個別に実行
   npm run db:start          # データベースコンテナ起動
   npm run db:setup          # スキーマ適用とクライアント生成
   ```

### データベース管理

#### 開発用データベース
```bash
# データベースコンテナの起動
npm run db:start

# データベースコンテナの停止
npm run db:stop

# スキーマ適用とPrismaクライアント生成
npm run db:setup

# 開発用データベースの完全セットアップ
npm run setup:dev
```

#### テスト用データベース
```bash
# テスト用データベースコンテナの起動
npm run db:start:test

# テスト用データベースコンテナの停止
npm run db:stop:test

# テスト用データベースのスキーマ適用
npm run db:setup:test

# テスト用データベースの完全セットアップ
npm run setup:test
```

#### セットアップオプション
```bash
# 最小セットアップ（環境ファイルのみ）
npm run setup

# 開発環境の完全セットアップ
npm run setup:dev

# テスト環境の完全セットアップ  
npm run setup:test

# 全体の完全セットアップ（従来のsetup相当）
npm run setup:full
```

### 環境変数

#### apps/api/.env
```env
DATABASE_URL="postgresql://lightlist_user:lightlist_password@localhost:5432/lightlist_db?schema=public"
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
API_RATE_LIMIT_MAX=100
API_RATE_LIMIT_WINDOW_MS=900000
```

#### apps/web/.env
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

#### apps/native/.env
```env
EXPO_PUBLIC_API_URL=http://localhost:3001
```

## 開発

### 開発サーバーの起動

```bash
# 全体開発サーバー起動（推奨）
npm run dev
```

これにより、以下のサーバーが同時に起動します：
- APIサーバー: http://localhost:3001
- Webアプリ: http://localhost:3000
- Nativeアプリ: http://localhost:8081

### 個別起動

```bash
# APIサーバーのみ
npm run dev --filter=@lightlist/api

# Webアプリのみ
npm run dev --filter=@lightlist/web

# モバイルアプリのみ
npm run dev --filter=@lightlist/native
```

### その他のコマンド

```bash
# ビルド（全パッケージ）
npm run build

# テスト実行
npm run test

# Lint & 型チェック
npm run check

# クリーンアップ
npm run clean
```

### テスト実行

#### 通常のテスト実行
```bash
# 全テストを実行（テスト用DBを自動管理）
npm run test

# APIのテストのみ実行
npm run test --filter=@lightlist/api
```

#### テスト用データベースの事前準備
テストの度にデータベースコンテナの起動・停止を避けたい場合：

```bash
# 1. テスト用データベースを事前に起動
npm run db:start:test

# 2. 環境変数を設定してテスト実行（DB起動・停止をスキップ）
SKIP_DB_SETUP=true SKIP_DB_CLEANUP=true npm run test --filter=@lightlist/api

# 3. テスト完了後、必要に応じてデータベースを停止
npm run db:stop:test
```

#### 環境変数オプション
- `SKIP_DB_SETUP=true`: テスト用DB起動をスキップ
- `SKIP_DB_CLEANUP=true`: テスト完了後のDB停止をスキップ

### Nativeアプリのプラットフォーム別起動

```bash
cd apps/native

# iOSシミュレーター
npm run ios

# Androidエミュレーター
npm run android

# Webブラウザ
npm run web
```

### テスト実行の詳細

#### 統合テストの並列実行

packages/sdkの統合テストは並列実行に対応しており、実行時間を大幅に短縮できます。

```bash
# 並列統合テストの実行（推奨）
cd packages/sdk
npm run test:integration

# 実行時間: 約20-25秒（従来の1/3～1/2に短縮）
# 並列数: 2（maxConcurrency: 2）
# 特徴: グローバルセットアップでAPIサーバーを共有
```

#### 統合テストの仕組み

- **グローバルセットアップ**: APIサーバー（ポート3002）を1回だけ起動
- **並列実行**: 複数テストファイルが同時実行（最大2つ）
- **データ分離**: 各テストで独立したユーザーデータを使用
- **接続確認**: 複数のフォールバック機能で堅牢性を確保

#### 並列実行の制限

- 一部のテストで競合が発生する可能性があります
- 成功率: 約85%（49/57テスト）
- 失敗の主な原因: JWT競合、タスクリスト競合

#### トラブルシューティング

```bash
# テスト用データベースの手動確認
docker-compose up -d db-test

# APIサーバーが起動していない場合
cd packages/sdk
# globalSetupでAPIサーバーが自動起動されます

# より詳細なログが必要な場合
DEBUG_INTEGRATION=true npm run test:integration
```
