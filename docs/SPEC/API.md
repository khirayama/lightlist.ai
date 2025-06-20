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
      "name": null
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
      "name": null
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
      "name": "田中太郎",
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
  "name": "田中太郎"
}
```

レスポンス（成功）:

```json
{
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "cmbz060iw0000ki5g9h2hwg8n",
      "email": "user@example.com",
      "name": "田中太郎",
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

説明: タスクリスト一覧取得

レスポンス（成功）:

```json
{
  "message": "Task lists retrieved successfully",
  "data": {
    "taskLists": [
      {
        "id": "cmbz060iw0000ki5g9h2hwg8n",
        "name": "📝個人",
        "order": 0,
        "color": "#FFE4E1",
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

説明: タスクリスト作成

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
      "order": 1,
      "color": "#FFFFFF",
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
  "order": 2,
  "color": "#E6E6FA"
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
      "order": 2,
      "color": "#E6E6FA",
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

説明: タスク一覧取得

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
        "dueDate": "2025-06-18T00:00:00.000Z",
        "order": 0,
        "createdAt": "2025-06-17T10:00:00.000Z",
        "updatedAt": "2025-06-17T10:00:00.000Z"
      }
    ]
  }
}
```

#### POST /api/task-lists/:taskListId/tasks

説明: タスク作成

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
      "dueDate": "2025-06-19T00:00:00.000Z",
      "order": 0,
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
  "dueDate": null
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
      "dueDate": null,
      "order": 0,
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
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  taskLists      TaskList[]
  sharedTaskLists SharedTaskList[]
  userSettings    UserSettings?
}
```

### TaskListテーブル

```sql
model TaskList {
  id        String   @id @default(cuid())
  name      String
  userId    String
  order     Int      @default(0)
  color     String?  @default("#FFFFFF")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks  Task[]
  shares SharedTaskList[]

  @@index([userId])
}
```

### Taskテーブル

```sql
model Task {
  id         String    @id @default(cuid())
  content    String
  completed  Boolean   @default(false)
  dueDate    DateTime?
  order      Int       @default(0)
  taskListId String
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  taskList TaskList @relation(fields: [taskListId], references: [id], onDelete: Cascade)

  @@index([taskListId])
}
```

### UserSettingsテーブル

```sql
model UserSettings {
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

### SharedTaskListテーブル

```sql
model SharedTaskList {
  id         String   @id @default(cuid())
  taskListId String
  userId     String?
  shareToken String   @unique
  permission String   @default("view")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  taskList TaskList @relation(fields: [taskListId], references: [id], onDelete: Cascade)
  user     User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([taskListId])
  @@index([userId])
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

  @@index([taskListId])
}
```

### TaskListUpdateテーブル（オプション - 履歴保存用）

```sql
model TaskListUpdate {
  id         String   @id @default(cuid())
  taskListId String
  update     Bytes    // Yjsの更新データ
  userId     String?  // 更新を行ったユーザー
  createdAt  DateTime @default(now())

  taskList TaskList @relation(fields: [taskListId], references: [id], onDelete: Cascade)
  user     User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([taskListId])
  @@index([createdAt])
}
```
