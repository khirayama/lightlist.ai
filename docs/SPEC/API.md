## API仕様

### ベース情報

- サーバー: Express.js
- データベース: PostgreSQL
- ORM: Prisma
- 認証方式: JWT
- ベースURL: http://localhost:3001

### エンドポイント詳細

#### POST /api/auth/register

説明: ユーザー登録

リクエスト:

```json
{
  "email": "user@example.com",
  "password": "TestPass123"
}
```

デバイス情報: User-AgentヘッダーとIPアドレスから自動生成

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
  "password": "TestPass123"
}
```

デバイス情報: User-AgentヘッダーとIPアドレスから自動生成

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

#### DELETE /api/users/:userId

説明: アカウント削除

レスポンス（成功）:

```json
{
  "message": "Account deleted successfully"
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
        "taskCount": 5,
        "completedCount": 2,
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
      "background": "#FFFFFF",
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

説明: タスク一覧取得（タスクリスト設定の順序で返却）

レスポンス（成功）:

```json
{
  "message": "Tasks retrieved successfully",
  "data": {
    "tasks": [
      {
        "id": "cmbz060iw0002ki5g9h2hwg8n",
        "content": "買い物リスト作成",
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
  "content": "明日 ミーティング資料準備"
}
```

レスポンス（成功）:

```json
{
  "message": "Task created successfully",
  "data": {
    "task": {
      "id": "cmbz060iw0003ki5g9h2hwg8n",
      "content": "ミーティング資料準備",
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
  "content": "資料作成完了",
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
      "content": "資料作成完了",
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
{
  "permission": "edit"
}
```

レスポンス（成功）:

```json
{
  "message": "Share link created successfully",
  "data": {
    "shareUrl": "https://lightlist.ai/share/abc123def456",
    "shareToken": "abc123def456",
    "permission": "edit"
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
      "permission": "edit"
    }
  }
}
```

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

#### PUT /api/task-lists/:taskListId/tasks/order

説明: タスクの順序更新

リクエスト:

```json
{
  "taskIds": [
    "cmbz060iw0003ki5g9h2hwg8n",
    "cmbz060iw0002ki5g9h2hwg8n",
    "cmbz060iw0004ki5g9h2hwg8n"
  ]
}
```

レスポンス（成功）:

```json
{
  "message": "Task order updated successfully",
  "data": {
    "taskOrder": [
      "cmbz060iw0003ki5g9h2hwg8n",
      "cmbz060iw0002ki5g9h2hwg8n",
      "cmbz060iw0004ki5g9h2hwg8n"
    ]
  }
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
- デバイス識別: サーバーサイドでUser-Agentから自動生成（SHA-256ハッシュ使用）
- CORS: 有効
- Helmet: セキュリティヘッダー設定済み

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
  id        String   @id @default(cuid())
  name      String
  taskOrder String[] @default([])
  background     String?  @default("") // 背景色は16進数カラーコード、透明は空文字
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tasks    Task[]
  share    TaskListShare?
  document TaskListDocument?
}
```

### Taskテーブル

```sql
model Task {
  id         String    @id @default(cuid())
  text       String
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
  id            String   @id @default(cuid())
  taskListId    String   @unique
  shareToken    String   @unique
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
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
  documentState Bytes    // Yjsドキュメントの完全な状態
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  taskList TaskList @relation(fields: [taskListId], references: [id], onDelete: Cascade)
}
```

### RefreshTokenテーブル

```sql
model RefreshToken {
  id            String   @id @default(cuid())
  userId        String
  token         String   @unique
  deviceHash    String   // User-AgentとIPアドレスからのSHA-256ハッシュ
  expiresAt     DateTime
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
  @@index([deviceHash])
}
```
