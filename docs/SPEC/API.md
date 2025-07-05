# タスク管理アプリ API設計書

## 目次

- [1. APIエンドポイント一覧](#1-apiエンドポイント一覧)
- [2. リクエスト/レスポンス例](#2-リクエストレスポンス例)
- [3. ユーザーシナリオごとのAPIコールフロー](#3-ユーザーシナリオごとのapiコールフロー)
- [4. 共同編集機能のAPIコールフロー](#4-共同編集機能のapiコールフロー)
- [実装上の注意点](#実装上の注意点)

## 1. Prismaスキーマ

データベーススキーマの詳細については、実際のPrismaスキーマファイルを参照してください。

参照: `@apps/api/prisma/schema.prisma`

## 1. APIエンドポイント一覧

### 認証系
- `POST /auth/register` - 新規ユーザー登録
- `POST /auth/login` - ログイン（deviceId必須）
- `POST /auth/logout` - ログアウト
- `POST /auth/refresh` - アクセストークン更新
- `POST /auth/forgot-password` - パスワードリセットメール送信
- `POST /auth/reset-password` - パスワードリセット実行

### 設定系
- `GET /settings` - ユーザー設定取得（theme, language）
- `PUT /settings` - ユーザー設定更新
- `GET /app` - App設定取得（taskInsertPosition, autoSort）
- `GET /app/taskListOrder` - タスクリストの並び順取得
- `PUT /app` - App設定更新

### 共同編集
- `POST /collaborative/sessions/:taskListId` - セッション開始
- `GET /collaborative/sessions/:taskListId` - 現在の状態取得
- `PUT /collaborative/sessions/:taskListId` - Y.js更新送信
- `PATCH /collaborative/sessions/:taskListId` - セッション維持
- `DELETE /collaborative/sessions/:taskListId` - セッション終了

### 共有
- `POST /share/:taskListId` - 共有リンク生成
- `DELETE /share/:taskListId` - 共有無効化
- `GET /share/:shareToken` - 共有タスクリスト閲覧（読み取り専用）
- `POST /share/:shareToken/copy` - 自分のAppにコピー

### 運用・監視
- `GET /health` - ヘルスチェック
- `GET /metrics` - 基本的なメトリクス取得

## 2. リクエスト/レスポンス例

### 認証系

#### ユーザー登録
```json
// POST /auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "deviceId": "device-123"
}

// Response
{
  "data": {
    "accessToken": "xxx",
    "refreshToken": "yyy",
    "expiresIn": 3600
  },
  "message": "User registered successfully"
}
```

#### ログイン
```json
// POST /auth/login
{
  "email": "user@example.com",
  "password": "password123",
  "deviceId": "device-123"
}

// Response
{
  "data": {
    "accessToken": "xxx",
    "refreshToken": "yyy",
    "expiresIn": 3600
  },
  "message": "Login successful"
}
```

#### トークン更新
```json
// POST /auth/refresh
{
  "refreshToken": "yyy"
}

// Response
{
  "data": {
    "accessToken": "zzz",
    "refreshToken": "yyy",
    "expiresIn": 3600
  },
  "message": "Token refreshed successfully"
}
```

### 設定系

#### ユーザー設定
```json
// GET /settings
// Response
{
  "data": {
    "theme": "system",
    "language": "ja"
  },
  "message": "Settings retrieved successfully"
}

// PUT /settings
{
  "theme": "dark",
  "language": "en"
}

// Response
{
  "data": {
    "theme": "dark",
    "language": "en"
  },
  "message": "Settings updated successfully"
}
```

#### App設定
```json
// GET /app
// Response
{
  "data": {
    "id": "app_xxx",
    "taskInsertPosition": "top",
    "autoSort": false
  },
  "message": "App settings retrieved successfully"
}

// PUT /app
{
  "taskInsertPosition": "bottom",
  "autoSort": true
}

// Response
{
  "data": {
    "id": "app_xxx",
    "taskInsertPosition": "bottom",
    "autoSort": true
  },
  "message": "App settings updated successfully"
}
```

### 共同編集

#### セッション開始
```json
// POST /collaborative/sessions/:taskListId
{
  "sessionType": "active"
}

// Response
{
  "data": {
    "sessionId": "session_xxx",
    "documentState": "base64-encoded-yjs-document",
    "stateVector": "base64-encoded-state-vector",
    "expiresAt": "2024-01-01T13:00:00Z"
  },
  "message": "Session started successfully"
}
```

#### 状態取得
```json
// GET /collaborative/sessions/:taskListId
// Response
{
  "data": {
    "documentState": "base64-encoded-yjs-document",
    "stateVector": "base64-encoded-state-vector",
    "hasUpdates": true
  },
  "message": "State retrieved successfully"
}
```

#### 更新送信
```json
// PUT /collaborative/sessions/:taskListId
{
  "update": "base64-encoded-yjs-update"
}

// Response
{
  "data": {
    "success": true,
    "stateVector": "base64-encoded-state-vector"
  },
  "message": "Update sent successfully"
}
```

### 共有

#### 共有開始
```json
// POST /share/:taskListId
// Response
{
  "data": {
    "shareToken": "share_xxx",
    "shareUrl": "https://app.example.com/share/share_xxx"
  },
  "message": "Share link created successfully"
}
```

#### 共有閲覧
```json
// GET /share/:shareToken
// Response
{
  "data": {
    "taskList": {
      "id": "list1",
      "name": "共有タスクリスト",
      "background": "#00FF00",
      "tasks": [
        {
          "id": "task1",
          "text": "共有タスク",
          "completed": false,
          "date": "2024-01-01"
        }
      ]
    },
    "isReadOnly": true
  },
  "message": "Shared task list retrieved successfully"
}
```

### 運用・監視

#### ヘルスチェック
```json
// GET /health
// Response
{
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00Z",
    "database": "connected",
    "services": {
      "auth": "ok",
      "collaborative": "ok"
    }
  },
  "message": "System is healthy"
}
```

#### メトリクス
```json
// GET /metrics
// Response
{
  "data": {
    "activeUsers": 150,
    "activeSessions": 45,
    "totalTasks": 1250,
    "uptime": "72h 15m"
  },
  "message": "Metrics retrieved successfully"
}
```

## 3. ユーザーシナリオごとのAPIコールフロー

### アプリ起動フロー
```
1. GET /settings
   → 401 Unauthorized の場合、ログイン画面へ
   → 200 OK の場合、次へ

2. GET /app, GET /settings, GET /app/taskListOrder
   → 全データ取得（app, settings, taskListOrder）

3. taskListOrderから各タスクリストごとに:
   POST /collaborative/sessions/:taskListId
   → 編集セッション開始
```

### ログインフロー
```
1. POST /auth/login
   → accessToken, refreshToken取得

2. GET /bootstrap
   → 初期データ取得

3. 必要なタスクリストのセッション開始
```

### タスク操作フロー
```
1. POST /collaborative/sessions/:taskListId（未開始の場合）
   → セッション開始

2. ローカルでY.jsドキュメント更新
   → タスク追加/編集/削除/並び替え

3. PUT /collaborative/sessions/:taskListId
   → 更新内容をサーバーに送信

4. 10秒ごとに GET /collaborative/sessions/:taskListId
   → 他ユーザーの更新を取得（効率的なポーリング間隔）
```

### アプリ終了フロー
```
1. 各開いているタスクリストごとに:
   DELETE /collaborative/sessions/:taskListId
   → セッション終了

2. ログアウトする場合:
   POST /auth/logout
```

### 設定変更フロー
```
- テーマ/言語変更:
  PUT /settings

- タスク挿入位置/自動ソート変更:
  PUT /app
```

## 4. 共同編集機能のAPIコールフロー

### ユーザーA（最初の編集者）
```
1. POST /collaborative/sessions/list123
   → TaskListDocument新規作成
   → activeSessionCount = 1
   → Y.jsドキュメント初期化（DBから現在の状態を読み込み）

2. 編集操作
   → ローカルでY.jsドキュメント更新
   → PUT /collaborative/sessions/list123（更新送信）

3. 定期処理
   → 10秒ごと: GET /collaborative/sessions/list123（他ユーザーの更新確認）
   → 20分ごと: PATCH /collaborative/sessions/list123（セッション維持）
```

### ユーザーB（2人目の編集者）
```
1. POST /collaborative/sessions/list123
   → 既存のTaskListDocument使用
   → activeSessionCount = 2

2. GET /collaborative/sessions/list123
   → 現在の状態取得（ユーザーAの編集内容含む）

3. 編集操作
   → ローカルでY.jsドキュメント更新
   → PUT /collaborative/sessions/list123（更新送信）

4. 競合発生時
   → Y.jsが自動的にマージ
   → タスクの順序はY.jsのCRDTアルゴリズムで解決
   → タスクの内容（text, completed, date）は最終更新優先
```

### セッション終了とクリーンアップ
```
1. ユーザーAがアプリ終了
   → DELETE /collaborative/sessions/list123
   → activeSessionCount = 1

2. ユーザーBもアプリ終了
   → DELETE /collaborative/sessions/list123
   → activeSessionCount = 0
   → TaskListDocument削除（Y.jsドキュメントをクリーンアップ）

3. 次回開始時
   → 新規にTaskListDocument作成
   → DBから最新の状態を読み込んでY.jsドキュメント初期化
```

### タイムアウト処理
```
- アクティブセッション: 最後の操作から60分でタイムアウト
- バックグラウンドセッション: 5分でタイムアウト
- タイムアウト時: 自動的にセッション終了処理実行
```

## 実装上の注意点

### セキュリティ仕様
- パスワードハッシュ化: bcrypt（コスト12）を使用
- JWT設定: 
  - アルゴリズム: RS256
  - アクセストークン: 1時間
  - リフレッシュトークン: 30日
- レート制限: 1分間100リクエスト（緩い制限）
- HTTPS必須: 本番環境では全通信をHTTPS化

### Y.jsドキュメントの管理
- タスクの順序（taskOrder）のみY.jsで管理
- タスクの内容（text, completed, date）は通常のDB更新
- セッション開始時にDBから読み込んで初期化
- 全セッション終了時にドキュメント削除

### Y.js実装詳細
- データ構造: Y.Map<string, any>でタスクリストを管理
- 競合解決: 
  - タスクの順序: Y.jsのCRDTアルゴリズムで自動マージ
  - タスクの内容: Last-Writer-Wins（最終更新優先）
- エラーハンドリング:
  - Y.jsドキュメント破損時: DBから再初期化
  - ネットワーク切断時: ローカル更新を保持し、再接続時に同期
  - セッション競合時: 既存セッションを維持

### パフォーマンス考慮
- Y.jsの更新は差分のみ送信
- ポーリング間隔は10秒（WebSocketがインフラ上利用不可のため）
- Long Polling検討（将来的な最適化）
- 大きなタスクリストでの初期化時間に注意

### エラーハンドリング
- セッション作成の競合処理
- ネットワーク切断時の再接続
- Y.jsドキュメントの破損対策
