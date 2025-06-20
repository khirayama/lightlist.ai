## API仕様

### ベース情報

- サーバー: Express.js
- データベース: PostgreSQL
- ORM: Prisma
- 認証方式: JWT
- ベースURL: http://localhost:3001

### エンドポイント一覧

#### 認証関連
- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ユーザーログイン
- `POST /api/auth/logout` - ユーザーログアウト
- `POST /api/auth/forgot-password` - パスワードリセット要求
- `POST /api/auth/reset-password` - パスワードリセット実行

#### ユーザー関連
- `GET /api/users/:userId/profile` - ユーザープロフィール取得
- `PUT /api/users/:userId/profile` - ユーザープロフィール更新
- `DELETE /api/users/:userId` - アカウント削除
- `PUT /api/users/:userId/change-password` - パスワード変更
- `GET /api/users/:userId/app` - ユーザーのApp情報取得
- `GET /api/users/:userId/settings` - ユーザー設定取得
- `PUT /api/users/:userId/settings` - ユーザー設定更新
- `PUT /api/users/:userId/task-lists/order` - タスクリストの順序更新

#### タスクリスト関連
- `GET /api/task-lists` - タスクリスト一覧取得
- `POST /api/task-lists` - タスクリスト作成
- `PUT /api/task-lists/:taskListId` - タスクリスト更新
- `DELETE /api/task-lists/:taskListId` - タスクリスト削除

#### タスク関連
- `GET /api/task-lists/:taskListId/tasks` - タスク一覧取得
- `POST /api/task-lists/:taskListId/tasks` - タスク作成
- `PUT /api/tasks/:taskId` - タスク更新
- `DELETE /api/tasks/:taskId` - タスク削除

#### 共有関連
- `POST /api/task-lists/:taskListId/share` - タスクリスト共有リンク生成
- `GET /api/share/:shareToken` - 共有タスクリスト情報取得
- `DELETE /api/task-lists/:taskListId/share` - タスクリスト共有解除

#### 共同編集関連
- `POST /api/task-lists/:taskListId/collaborative/initialize` - 共同編集機能の初期化
- `GET /api/task-lists/:taskListId/collaborative/full-state` - タスクリストの完全な共同編集状態を取得
- `POST /api/task-lists/:taskListId/collaborative/sync` - 共同編集の差分同期

#### システム関連
- `GET /health` - ヘルスチェック

### エンドポイント詳細

#### POST /api/auth/register

説明: ユーザー登録

リクエスト:

```json
{
  "email": "user@example.com",
  "password": "TestPass123",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

デバイス情報: クライアントから送信されるdeviceIdを使用

レスポンス（成功）:

```json
{
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "cmbz060iw0000ki5g9h2hwg8n",
      "email": "user@example.com",
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600000,
    "refreshExpiresIn": 31536000000
  }
}
```

エラーレスポンス:

```json
{
  "error": "User already exists with this email"
}
```

#### POST /api/auth/login

説明: ユーザーログイン

リクエスト:

```json
{
  "email": "user@example.com",
  "password": "TestPass123",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

デバイス情報: クライアントから送信されるdeviceIdを使用

レスポンス（成功）:

```json
{
  "message": "Login successful",
  "data": {
    "user": {
      "id": "cmbz060iw0000ki5g9h2hwg8n",
      "email": "user@example.com",
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600000,
    "refreshExpiresIn": 31536000000
  }
}
```

エラーレスポンス:

```json
{
  "error": "Invalid email or password"
}
```

#### POST /api/auth/logout

説明: ユーザーログアウト

レスポンス:

```json
{
  "message": "Logout successful"
}
```

#### POST /api/auth/forgot-password

説明: パスワードリセット要求

リクエスト:

```json
{
  "email": "user@example.com"
}
```

レスポンス（成功）:

```json
{
  "message": "Password reset email sent successfully"
}
```

エラーレスポンス:

```json
{
  "error": "User not found with this email"
}
```

#### POST /api/auth/reset-password

説明: パスワードリセット実行

リクエスト:

```json
{
  "token": "reset-token-here",
  "newPassword": "NewPass123"
}
```

レスポンス（成功）:

```json
{
  "message": "Password reset successfully"
}
```

エラーレスポンス:

```json
{
  "error": "Invalid or expired reset token"
}
```

#### GET /api/users/:userId/profile

説明: ユーザープロフィール取得

レスポンス（成功）:

```json
{
  "message": "User profile retrieved successfully",
  "data": {
    "user": {
      "id": "cmbz060iw0000ki5g9h2hwg8n",
      "email": "user@example.com",
      "createdAt": "2025-06-17T10:00:00.000Z",
      "updatedAt": "2025-06-17T10:30:00.000Z"
    }
  }
}
```

#### PUT /api/users/:userId/profile

説明: ユーザープロフィール更新

リクエスト:

```json
{
  "email": "newemail@example.com"
}
```

レスポンス（成功）:

```json
{
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "cmbz060iw0000ki5g9h2hwg8n",
      "email": "newemail@example.com",
      "createdAt": "2025-06-17T10:00:00.000Z",
      "updatedAt": "2025-06-17T12:00:00.000Z"
    }
  }
}
```

エラーレスポンス:

```json
{
  "error": "Email already exists"
}
```

#### DELETE /api/users/:userId

説明: アカウント削除

レスポンス（成功）:

```json
{
  "message": "Account deleted successfully"
}
```

#### PUT /api/users/:userId/change-password

説明: パスワード変更

リクエスト:

```json
{
  "currentPassword": "CurrentPass123",
  "newPassword": "NewPass456"
}
```

レスポンス（成功）:

```json
{
  "message": "Password changed successfully"
}
```

エラーレスポンス:

```json
{
  "error": "Current password is incorrect"
}
```

#### GET /api/users/:userId/app

説明: ユーザーのApp情報取得

レスポンス（成功）:

```json
{
  "message": "App data retrieved successfully",
  "data": {
    "app": {
      "id": "cmbz060iw0000ki5g9h2hwg8n",
      "taskListOrder": [
        "cmbz060iw0001ki5g9h2hwg8n",
        "cmbz060iw0000ki5g9h2hwg8n"
      ],
      "createdAt": "2025-06-17T10:00:00.000Z",
      "updatedAt": "2025-06-17T10:30:00.000Z"
    }
  }
}
```

エラーレスポンス（App未作成の場合）:

```json
{
  "error": "App not found for this user"
}
```

#### GET /api/users/:userId/settings

説明: ユーザー設定取得

レスポンス（成功）:

```json
{
  "message": "Settings retrieved successfully",
  "data": {
    "settings": {
      "theme": "system",
      "language": "ja",
      "taskInsertPosition": "top",
      "autoSort": false
    }
  }
}
```

#### PUT /api/users/:userId/settings

説明: ユーザー設定更新

リクエスト:

```json
{
  "theme": "dark",
  "language": "en",
  "taskInsertPosition": "bottom",
  "autoSort": true
}
```

レスポンス（成功）:

```json
{
  "message": "Settings updated successfully",
  "data": {
    "settings": {
      "theme": "dark",
      "language": "en",
      "taskInsertPosition": "bottom",
      "autoSort": true
    }
  }
}
```

#### GET /api/task-lists

説明: タスクリスト一覧取得（ユーザーのApp.taskListOrderの順序で返却）

レスポンス（成功）:

```json
{
  "message": "Task lists retrieved successfully",
  "data": {
    "taskLists": [
      {
        "id": "cmbz060iw0000ki5g9h2hwg8n",
        "name": "📝個人",
        "background": "#FFE4E1",
        "createdAt": "2025-06-17T10:00:00.000Z",
        "updatedAt": "2025-06-17T10:30:00.000Z"
      }
    ]
  }
}
```

#### POST /api/task-lists

説明: タスクリスト作成（ユーザーのApp.taskListOrderに自動追加）

リクエスト:

```json
{
  "name": "仕事"
}
```

レスポンス（成功）:

```json
{
  "message": "Task list created successfully",
  "data": {
    "taskList": {
      "id": "cmbz060iw0001ki5g9h2hwg8n",
      "name": "仕事",
      "background": "",
      "createdAt": "2025-06-17T10:00:00.000Z",
      "updatedAt": "2025-06-17T10:00:00.000Z"
    }
  }
}
```

#### PUT /api/task-lists/:taskListId

説明: タスクリスト更新

リクエスト:

```json
{
  "name": "プロジェクトA",
  "background": "#E6E6FA"
}
```

レスポンス（成功）:

```json
{
  "message": "Task list updated successfully",
  "data": {
    "taskList": {
      "id": "cmbz060iw0001ki5g9h2hwg8n",
      "name": "プロジェクトA",
      "background": "#E6E6FA",
      "createdAt": "2025-06-17T10:00:00.000Z",
      "updatedAt": "2025-06-17T11:00:00.000Z"
    }
  }
}
```

#### DELETE /api/task-lists/:taskListId

説明: タスクリスト削除

レスポンス（成功）:

```json
{
  "message": "Task list deleted successfully"
}
```

#### GET /api/task-lists/:taskListId/tasks

説明: タスク一覧取得（共同編集機能が有効な場合はYjsドキュメントの順序、無効な場合はタスクリスト設定の順序で返却）

レスポンス（成功）:

```json
{
  "message": "Tasks retrieved successfully",
  "data": {
    "tasks": [
      {
        "id": "cmbz060iw0002ki5g9h2hwg8n",
        "text": "買い物リスト作成",
        "completed": false,
        "date": "2025-06-18",
        "createdAt": "2025-06-17T10:00:00.000Z",
        "updatedAt": "2025-06-17T10:00:00.000Z"
      }
    ]
  }
}
```

#### POST /api/task-lists/:taskListId/tasks

説明: タスク作成（タスクリストの順序リストに自動追加）

リクエスト:

```json
{
  "text": "明日 ミーティング資料準備"
}
```

レスポンス（成功）:

```json
{
  "message": "Task created successfully",
  "data": {
    "task": {
      "id": "cmbz060iw0003ki5g9h2hwg8n",
      "text": "ミーティング資料準備",
      "completed": false,
      "date": "2025-06-19",
      "createdAt": "2025-06-17T10:00:00.000Z",
      "updatedAt": "2025-06-17T10:00:00.000Z"
    }
  }
}
```

#### PUT /api/tasks/:taskId

説明: タスク更新

リクエスト:

```json
{
  "text": "資料作成完了",
  "completed": true,
  "date": null
}
```

レスポンス（成功）:

```json
{
  "message": "Task updated successfully",
  "data": {
    "task": {
      "id": "cmbz060iw0003ki5g9h2hwg8n",
      "text": "資料作成完了",
      "completed": true,
      "date": null,
      "createdAt": "2025-06-17T10:00:00.000Z",
      "updatedAt": "2025-06-17T11:00:00.000Z"
    }
  }
}
```

#### DELETE /api/tasks/:taskId

説明: タスク削除

レスポンス（成功）:

```json
{
  "message": "Task deleted successfully"
}
```

#### POST /api/task-lists/:taskListId/share

説明: タスクリスト共有リンク生成

リクエスト:

```json
{}
```

**注意**: 現在の実装では全ての共有リンクはview権限のみです。

レスポンス（成功）:

```json
{
  "message": "Share link created successfully",
  "data": {
    "shareUrl": "https://lightlist.ai/share/abc123def456",
    "shareToken": "abc123def456"
  }
}
```

#### GET /api/share/:shareToken

説明: 共有タスクリスト情報取得

レスポンス（成功）:

```json
{
  "message": "Shared task list retrieved successfully",
  "data": {
    "taskList": {
      "id": "cmbz060iw0001ki5g9h2hwg8n",
      "name": "買い物リスト",
      "background": "#FFE4E1",
      "tasks": [
        {
          "id": "cmbz060iw0002ki5g9h2hwg8n",
          "text": "買い物リスト作成",
          "completed": false,
          "date": "2025-06-18",
          "createdAt": "2025-06-17T10:00:00.000Z",
          "updatedAt": "2025-06-17T10:00:00.000Z"
        }
      ]
    }
  }
}
```

**注意**: 共有タスクリストはview権限のみで、タスクの一覧も含めて返却されます。

#### DELETE /api/task-lists/:taskListId/share

説明: タスクリスト共有解除

レスポンス（成功）:

```json
{
  "message": "Share link deleted successfully"
}
```

#### PUT /api/users/:userId/task-lists/order

説明: タスクリストの順序更新

リクエスト:

```json
{
  "taskListIds": [
    "cmbz060iw0001ki5g9h2hwg8n",
    "cmbz060iw0000ki5g9h2hwg8n",
    "cmbz060iw0002ki5g9h2hwg8n"
  ]
}
```

レスポンス（成功）:

```json
{
  "message": "Task list order updated successfully",
  "data": {
    "taskListOrder": [
      "cmbz060iw0001ki5g9h2hwg8n",
      "cmbz060iw0000ki5g9h2hwg8n",
      "cmbz060iw0002ki5g9h2hwg8n"
    ]
  }
}
```


#### POST /api/task-lists/:taskListId/collaborative/initialize

説明: 共同編集機能の初期化

リクエスト:

```json
{}
```

レスポンス（成功）:

```json
{
  "message": "Collaborative editing initialized successfully",
  "data": {
    "state": "base64EncodedInitialState",
    "stateVector": "base64EncodedStateVector"
  }
}
```

エラーレスポンス:

```json
{
  "error": "Collaborative editing is already enabled for this task list"
}
```

#### GET /api/task-lists/:taskListId/collaborative/full-state

説明: タスクリストの完全な共同編集状態を取得

レスポンス（成功）:

```json
{
  "message": "Collaborative state retrieved successfully",
  "data": {
    "state": "base64EncodedYjsState",
    "stateVector": "base64EncodedStateVector"
  }
}
```

エラーレスポンス:

```json
{
  "error": "Collaborative editing is not enabled for this task list"
}
```

#### POST /api/task-lists/:taskListId/collaborative/sync

説明: 共同編集の差分同期

リクエスト:

```json
{
  "stateVector": "base64EncodedStateVector",
  "update": "base64EncodedUpdate"
}
```

レスポンス（成功）:

```json
{
  "message": "Sync successful",
  "data": {
    "update": "base64EncodedDiff",
    "stateVector": "base64EncodedNewStateVector"
  }
}
```

エラーレスポンス:

```json
{
  "error": "Collaborative editing is not enabled for this task list"
}
```

#### GET /health

説明: ヘルスチェック

レスポンス:

```json
{
  "status": "ok",
  "timestamp": "2025-06-16T11:17:38.827Z"
}
```

### セキュリティ仕様

- レート制限: 1分間に100リクエスト
- パスワード要件: 大文字・小文字・数字を含む
- JWT（アクセストークン）有効期限: 1時間
- リフレッシュトークン有効期限: 1年間
- プロアクティブトークン更新: 期限の5分前に自動リフレッシュ実行
- リアクティブトークン更新: 401エラー時に自動でリフレッシュ実行
- 同時リクエスト制御: 重複リフレッシュ防止メカニズム実装
- デバイス別セッション管理: デバイスごとのリフレッシュトークン管理
- 複数端末対応: 最大5台のデバイスで同時ログイン可能
- デバイス識別: クライアント生成のデバイスIDを使用（UUID形式またはランダム文字列）
- CORS: 有効
- Helmet: セキュリティヘッダー設定済み

### デバイスID仕様

- **生成方法**: クライアントサイドで生成
- **Web**: localStorage永続化、crypto.randomUUID()またはランダム文字列（32文字）
- **Native**: AsyncStorage永続化、expo-cryptoのUUID
- **形式**: UUID v4形式またはランダム文字列（32文字以上）
- **永続化**: デバイス固有のストレージに保存（Web: localStorage、Native: AsyncStorage）
- **利点**: IPアドレス変動やUser-Agent更新に影響されない安定した識別

## データベーススキーマ

### Userテーブル

```sql
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  password      String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  app           App?
  settings      Settings?
  refreshTokens RefreshToken[]
}
```

### Appテーブル

```sql
model App {
  id            String   @id @default(cuid())
  userId        String   @unique
  taskListOrder String[] @default([])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### TaskListテーブル

```sql
model TaskList {
  id         String   @id @default(cuid())
  name       String
  background String?  @default("") // 背景色は16進数カラーコード、透明は空文字
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  tasks    Task[]
  share    TaskListShare?
  document TaskListDocument?
}
```

**注意**: 現在のスキーマではTaskListとUserの直接的な関連付けがありません。所有権管理はAppテーブルのtaskListOrderフィールドを通じて行われています。これにより、ユーザーはApp.taskListOrderに含まれるタスクリストのみにアクセス可能です。タスクの並び順は共同編集機能が有効な場合はTaskListDocumentテーブルのYjsドキュメントで管理されます。

### Taskテーブル

```sql
model Task {
  id         String    @id @default(cuid())
  text    String
  completed  Boolean   @default(false)
  date       String? // 日付はISO 8601形式の文字列で保存
  taskListId String
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  taskList TaskList @relation(fields: [taskListId], references: [id], onDelete: Cascade)

  @@index([taskListId])
}
```

### Settingsテーブル

```sql
model Settings {
  id               String   @id @default(cuid())
  userId           String   @unique
  theme            String   @default("system")
  language         String   @default("ja")
  taskInsertPosition String @default("top")
  autoSort         Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### TaskListShareテーブル

```sql
model TaskListShare {
  id         String   @id @default(cuid())
  taskListId String   @unique
  shareToken String   @unique
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  // permission    String // 全てviewのため不要
  // expiresAt    DateTiem // 全て無期限のため不要

  taskList TaskList @relation(fields: [taskListId], references: [id], onDelete: Cascade)

  @@index([shareToken])
}
```

### TaskListDocumentテーブル

```sql
model TaskListDocument {
  id            String   @id @default(cuid())
  taskListId    String   @unique
  stateVector   Bytes    // Yjsの状態ベクター
  documentState Bytes    // Yjsドキュメントの完全な状態（タスクの並び順のみ）
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  taskList TaskList @relation(fields: [taskListId], references: [id], onDelete: Cascade)
}
```

**注意**: このテーブルはタスクの並び替え共同編集機能のためのYjsドキュメントを管理します。レコードが存在する場合は共同編集が有効、存在しない場合は無効です。

### RefreshTokenテーブル

```sql
model RefreshToken {
  id            String   @id @default(cuid())
  userId        String
  token         String   @unique
  deviceId      String   // クライアント生成のデバイスID
  expiresAt     DateTime
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
  @@index([deviceId])
}
```
