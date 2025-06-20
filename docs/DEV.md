# 開発ガイド

## ディレクトリ構成

```
.
├── apps/
│   ├── api/                    # Node.js/Express API サーバー
│   ├── web/                    # Next.js ウェブアプリケーション
│   └── native/                 # React Native/Expo モバイルアプリ
├── packages/                   # 共通ライブラリやコンポーネント
│   └── sdk/                    # 共通SDKライブラリ(APIラッパーな側面が強い)
├── docs/                       # ドキュメント
├── biome.json                  # Biome 設定
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
- Biome
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
- Biome
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
- Biome
- Prettier
- Vitest

**NativeWind設定**：
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

1. **依存関係のインストール**
   ```bash
   npm install
   ```

2. **各アプリケーションのセットアップ**
   ```bash
   npm run setup
   ```
   このコマンドは以下を実行します：
   - apps/api: .envファイル作成、PostgreSQL起動、Prismaクライアント生成、データベーススキーマ適用
   - apps/web: .envファイル作成
   - apps/native: .envファイル作成

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

## トラブルシューティング

### ポートの競合

- Web (Next.js): http://localhost:3000
- API (Express): http://localhost:3001
- Native (Expo): http://localhost:8081

別のプロセスがポートを使用している場合は、該当プロセスを停止するか、package.jsonでポート番号を変更してください。

### TypeScript エラー

各パッケージが正しくビルドされていることを確認：

```bash
npm run clean  # distフォルダをクリア
npm run build  # 再ビルド
```

### PostgreSQL関連のエラー

Dockerが起動していることを確認し、データベースを再起動：

```bash
cd apps/api
docker-compose down
docker-compose up -d
```

### React Native エラー

キャッシュをクリアして再起動：

```bash
cd apps/native
npx expo start --clear
```

### ポートが既に使用されている場合

別のプロセスがポートを使用している場合：

```bash
# 使用中のポートを確認（macOS/Linux）
lsof -i :3000  # Webアプリのポート
lsof -i :3001  # APIのポート

# プロセスを終了
kill -9 <PID>
```

## デバッグ

### APIサーバー
- ヘルスチェック: http://localhost:3001/health
- APIテスト: http://localhost:3001/api/hello

### Webアプリ
- 開発者ツールでReact DevToolsやRedux DevToolsを使用
- Next.jsのデバッグ機能を活用

### Nativeアプリ
- Expo Developer Toolsを使用
- React Native Debuggerを使用

