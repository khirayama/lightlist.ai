import request from 'supertest';
import { PrismaClient, User } from '@prisma/client';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from '../../routes/auth';
import usersRoutes from '../../routes/users';
import taskListsRoutes from '../../routes/task-lists';
import tasksRoutes from '../../routes/tasks';
import shareRoutes from '../../routes/share';
import collaborativeRoutes from '../../routes/collaborative';
import { generateTokenPair } from '../../utils/jwt';
import type { AuthTokens } from '../../types/auth';
import { hashPassword } from '../../utils/password';
import { optimizedTestHashPassword } from '../../utils/password-test';
import { getDatabase } from '../../services/database';

let app: express.Application;
let prisma: PrismaClient;

export function getTestApp(): express.Application {
  if (!app) {
    app = express();
    prisma = getDatabase();

    // Middleware setup (same as main app but with relaxed rate limiting)
    app.use(helmet());
    app.use(cors());
    
    // More relaxed rate limiting for tests
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use(limiter);
    
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Test health check
    app.get('/health', (_req, res) => {
      res.status(200).json({
        status: 'ok',
        environment: 'test',
        timestamp: new Date().toISOString(),
      });
    });

    // Auth routes
    app.use('/api/auth', authRoutes);

    // Users routes
    app.use('/api/users', usersRoutes);

    // Task lists routes
    app.use('/api/task-lists', taskListsRoutes);

    // Tasks routes (note: task endpoints use both task-lists and tasks paths)
    app.use('/api/task-lists', tasksRoutes);
    app.use('/api/tasks', tasksRoutes);

    // Collaborative editing routes
    app.use('/api/task-lists', collaborativeRoutes);

    // Share routes
    app.use('/api/share', shareRoutes);

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
      });
    });

    // Error handler
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Test App Error:', err);
      
      // JSON解析エラーの場合は400を返す
      if (err.type === 'entity.parse.failed' || err.statusCode === 400) {
        res.status(400).json({
          error: 'Bad Request',
          message: err.message || 'Invalid request format',
        });
        return;
      }
      
      // その他のエラーは500を返す
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
      });
    });
  }

  return app;
}

export function getTestRequest() {
  return request(getTestApp());
}

export function getTestPrisma(): PrismaClient {
  const client = getDatabase();
  if (!client) {
    throw new Error('Database not available for testing. Docker may not be running.');
  }
  return client;
}

// Test data generators with unique values - 並列実行対応の完全ユニーク性
function generateUniqueId(): string {
  // プロセスID + ミリ秒 + マイクロ秒 + ランダム値で完全なユニーク性を保証
  const processId = process.pid;
  const timestamp = Date.now();
  const microseconds = process.hrtime.bigint();
  const random = Math.random().toString(36).substr(2, 12);
  return `${processId}-${timestamp}-${microseconds}-${random}`;
}

function generateUniqueEmail(prefix: string = 'test'): string {
  return `${prefix}-${generateUniqueId()}@example.com`;
}

// テスト名ベースのプレフィックス生成（より確実な分離）
function generateTestPrefix(testName?: string): string {
  const baseName = testName || 'test';
  const processId = process.pid;
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 8);
  return `${baseName}-p${processId}-${timestamp}-${random}`;
}

function generateUniqueDeviceId(): string {
  // Generate a UUID for device ID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older Node.js versions
  const randomHex = () => Math.floor(Math.random() * 16).toString(16);
  const segments = [
    Array(8).fill(0).map(() => randomHex()).join(''),
    Array(4).fill(0).map(() => randomHex()).join(''),
    Array(4).fill(0).map(() => randomHex()).join(''),
    Array(4).fill(0).map(() => randomHex()).join(''),
    Array(12).fill(0).map(() => randomHex()).join('')
  ];
  return segments.join('-');
}


// Dynamic test data generators for unique values - 完全分離対応
export function generateUniqueUserData(overrides: Partial<{email: string, password: string, deviceId: string, testName?: string}> = {}) {
  const testPrefix = overrides.testName ? generateTestPrefix(overrides.testName) : undefined;
  return {
    email: overrides.email || (testPrefix ? `${testPrefix}@example.com` : generateUniqueEmail()),
    password: overrides.password || 'TestPass123',
    deviceId: overrides.deviceId || generateUniqueDeviceId(),
  };
}

// データベースの整合性確認用ヘルパー関数
async function ensureUserExists(client: PrismaClient, userId: string, maxRetries: number = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const user = await client.user.findUnique({
        where: { id: userId },
        include: {
          app: true,
          settings: true,
        },
      });

      if (!user) {
        throw new Error(`User with ID ${userId} not found in database`);
      }

      if (!user.app) {
        throw new Error(`App configuration not found for user ${userId}`);
      }

      if (!user.settings) {
        throw new Error(`Settings not found for user ${userId}`);
      }

      // ユーザーとその関連データが確実に存在することを確認
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(`Failed to verify user existence after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // 短時間待機してリトライ（待機時間を長くする）
      await new Promise(resolve => setTimeout(resolve, 300 * attempt));
    }
  }
}

// 認証済みユーザーの整合性確認用ヘルパー関数
async function ensureAuthenticatedUserExists(client: PrismaClient, userId: string, refreshToken: string, maxRetries: number = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const user = await client.user.findUnique({
        where: { id: userId },
        include: {
          app: true,
          settings: true,
          refreshTokens: {
            where: {
              token: refreshToken,
              isActive: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error(`User with ID ${userId} not found in database`);
      }

      if (!user.app) {
        throw new Error(`App configuration not found for user ${userId}`);
      }

      if (!user.settings) {
        throw new Error(`Settings not found for user ${userId}`);
      }

      if (!user.refreshTokens || user.refreshTokens.length === 0) {
        throw new Error(`Refresh token not found for user ${userId}`);
      }

      // ユーザーとその関連データ（リフレッシュトークン含む）が確実に存在することを確認
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(`Failed to verify authenticated user existence after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // 短時間待機してリトライ（待機時間を長くする）
      await new Promise(resolve => setTimeout(resolve, 300 * attempt));
    }
  }
}

// Database helpers - リトライ機能付き
export async function createTestUser(userData?: {email: string, password: string, deviceId: string, testName?: string}): Promise<User> {
  // userDataが渡されなかった場合のみ一意なデータを生成
  const userToCreate = userData || generateUniqueUserData({ testName: userData?.testName });
  
  return withDatabaseRetry(async () => {
    const hashedPassword = await optimizedTestHashPassword(userToCreate.password);
    const client = getTestPrisma(); // 確実に初期化されたPrismaクライアントを使用
    
    let user: User;

    // 強化されたトランザクションでユーザー作成
    await client.$transaction(async (tx) => {
      // ユーザー作成
      user = await tx.user.create({
        data: {
          email: userToCreate.email,
          password: hashedPassword,
        },
      });

      // デフォルトのApp設定を作成
      await tx.app.create({
        data: {
          userId: user.id,
          taskListOrder: [],
          taskInsertPosition: 'top',
          autoSort: false,
        },
      });

      // デフォルトのSettings設定を作成
      await tx.settings.create({
        data: {
          userId: user.id,
          theme: 'system',
          language: 'ja',
        },
      });
    }, {
      timeout: 20000, // 20秒のタイムアウト（強化）
      maxWait: 15000, // 最大15秒待機
      isolationLevel: 'ReadCommitted' // 適度な分離レベル
    });

    // トランザクション完了後、データベースから確実に読み取れることを確認
    await withRetry(
      () => ensureUserExists(client, user!.id, 3),
      { 
        maxRetries: 3, 
        baseDelay: 500,
        operationName: `user existence check for ${userToCreate.email}`
      }
    );

    return user!;
  }, `createTestUser for ${userToCreate.email}`);
}

export async function createAuthenticatedUser(userData?: Partial<{email: string, password: string, deviceId: string, testName?: string}>) {
  // ユーザーデータを生成（テスト名を含む完全分離）
  const uniqueUserData = generateUniqueUserData(userData);
  
  return withDatabaseRetry(async () => {
    const hashedPassword = await optimizedTestHashPassword(uniqueUserData.password);
    const client = getTestPrisma();
    
    let user: User;
    let tokens: AuthTokens;

    // 強化されたトランザクションで認証ユーザー作成
    await client.$transaction(async (tx) => {
      // ユーザー作成
      user = await tx.user.create({
        data: {
          email: uniqueUserData.email,
          password: hashedPassword,
        },
      });

      // JWTトークンペアの生成
      tokens = generateTokenPair(user.id, user.email, uniqueUserData.deviceId);

      // リフレッシュトークンをデータベースに保存
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          token: tokens.refreshToken,
          deviceId: uniqueUserData.deviceId,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      });

      // デフォルトのApp設定を作成
      await tx.app.create({
        data: {
          userId: user.id,
          taskListOrder: [],
          taskInsertPosition: 'top',
          autoSort: false,
        },
      });

      // デフォルトのSettings設定を作成
      await tx.settings.create({
        data: {
          userId: user.id,
          theme: 'system',
          language: 'ja',
        },
      });
    }, {
      timeout: 20000, // 20秒のタイムアウト（強化）
      maxWait: 15000, // 最大15秒待機
      isolationLevel: 'ReadCommitted' // 適度な分離レベル
    });

    // トランザクション完了後の確認（リトライ付き）
    await withRetry(
      () => ensureAuthenticatedUserExists(client, user!.id, tokens!.refreshToken, 3),
      { 
        maxRetries: 3, 
        baseDelay: 500,
        operationName: `authenticated user existence check for ${uniqueUserData.email}`
      }
    );

    return {
      user: user!,
      tokens,
      deviceId: uniqueUserData.deviceId,
    };
  }, `createAuthenticatedUser for ${uniqueUserData.email}`);
}

export function generateAuthHeader(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
  };
}

// Helper to wait for async operations
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 強化されたリトライ機能 - 並列実行時の競合対策
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    exponentialBackoff?: boolean;
    retryCondition?: (error: any) => boolean;
    operationName?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    exponentialBackoff = true,
    retryCondition = () => true,
    operationName = 'operation'
  } = options;

  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        console.log(`[Retry Success] ${operationName} succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.warn(`[Retry Attempt ${attempt}/${maxRetries}] ${operationName} failed: ${errorMessage}`);
      
      // リトライ条件をチェック
      if (!retryCondition(error)) {
        console.log(`[Retry Skip] ${operationName} failed with non-retryable error`);
        throw error;
      }
      
      if (attempt === maxRetries) {
        console.error(`[Retry Failed] ${operationName} failed after ${maxRetries} attempts`);
        throw lastError;
      }
      
      // 指数バックオフまたは固定遅延
      const delay = exponentialBackoff 
        ? Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
        : baseDelay;
      
      console.log(`[Retry Wait] ${operationName} retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// データベース操作専用のリトライヘルパー
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  operationName: string = 'database operation'
): Promise<T> {
  return withRetry(operation, {
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 5000,
    exponentialBackoff: true,
    retryCondition: (error) => {
      // データベース競合エラーのみリトライ
      const errorMessage = error instanceof Error ? error.message : String(error);
      return errorMessage.includes('SQLITE_BUSY') || 
             errorMessage.includes('deadlock') ||
             errorMessage.includes('timeout') ||
             errorMessage.includes('connection') ||
             errorMessage.includes('ECONNRESET');
    },
    operationName
  });
}

// Helper to generate multiple devices for testing device limits
export async function createMultipleDevicesForUser(user: User, count: number = 5) {
  const devices = [];
  const client = getTestPrisma();

  for (let i = 0; i < count; i++) {
    const deviceId = generateUniqueDeviceId();
    const tokens = generateTokenPair(user.id, user.email, deviceId);
    
    await client.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        deviceId,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    devices.push({
      deviceId,
      tokens,
    });
  }

  return devices;
}

// Cleanup helpers - リトライ機能付き
export async function cleanupUser(email: string) {
  return withDatabaseRetry(async () => {
    const client = getTestPrisma();
    const user = await client.user.findUnique({ where: { email } });
    if (user) {
      await client.$transaction([
        client.refreshToken.deleteMany({ where: { userId: user.id } }),
        client.passwordResetToken.deleteMany({ where: { userId: user.id } }),
        client.settings.deleteMany({ where: { userId: user.id } }),
        client.app.deleteMany({ where: { userId: user.id } }),
        client.user.delete({ where: { id: user.id } }),
      ], {
        timeout: 15000,
        maxWait: 10000
      });
    }
  }, `cleanupUser for ${email}`);
}

// Task List helpers
export async function createTestTaskList(userId: string, name: string = 'Test Task List') {
  const client = getTestPrisma();
  
  return withDatabaseRetry(async () => {
    let taskList: any;
    
    await client.$transaction(async (tx) => {
      // タスクリスト作成
      taskList = await tx.taskList.create({
        data: {
          name,
          background: '',
        },
      });

      // ユーザーのtaskListOrderに追加
      await tx.app.update({
        where: { userId },
        data: {
          taskListOrder: {
            push: taskList.id,
          },
        },
      });
    }, {
      timeout: 15000,
      maxWait: 10000,
      isolationLevel: 'ReadCommitted'
    });

    // トランザクション完了後の検証
    const app = await client.app.findUnique({
      where: { userId },
    });
    
    if (!app || !app.taskListOrder.includes(taskList.id)) {
      throw new Error(`TaskList ${taskList.id} not properly added to user ${userId} taskListOrder`);
    }

    return taskList;
  }, 'createTestTaskList');
}

export async function createTestTask(taskListId: string, text: string = 'Test Task', completed: boolean = false, date?: string) {
  const client = getTestPrisma();
  
  // タスクテキストから日付を抽出（APIエンドポイントと同じ動作）
  const { cleanText, extractedDate } = extractDateFromTaskText(text);
  
  return await client.task.create({
    data: {
      text: cleanText,
      completed,
      date: date || extractedDate,
      taskListId,
    },
  });
}

// 日付抽出ロジック（routes/tasks.tsからコピー）
function extractDateFromTaskText(text: string): { cleanText: string; extractedDate: string | null } {
  const today = new Date();
  let extractedDate: Date | null = null;
  let cleanText = text.trim();
  
  // 日本語の日付パターン
  const japanesePatterns = [
    { pattern: /^今日\s+/, date: new Date(today) },
    { pattern: /^明日\s+/, date: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
  ];
  
  // 英語の日付パターン
  const englishPatterns = [
    { pattern: /^today\s+/i, date: new Date(today) },
    { pattern: /^tomorrow\s+/i, date: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
  ];
  
  // 日付形式のパターン（YYYY/MM/DD, YYYY-MM-DD）
  const datePatterns = [
    /^(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\s+/,
  ];
  
  // 日本語パターンをチェック
  for (const { pattern, date } of japanesePatterns) {
    if (pattern.test(cleanText)) {
      extractedDate = date;
      cleanText = cleanText.replace(pattern, '');
      break;
    }
  }
  
  // 英語パターンをチェック
  if (!extractedDate) {
    for (const { pattern, date } of englishPatterns) {
      if (pattern.test(cleanText)) {
        extractedDate = date;
        cleanText = cleanText.replace(pattern, '');
        break;
      }
    }
  }
  
  // 日付形式をチェック
  if (!extractedDate) {
    for (const pattern of datePatterns) {
      const match = cleanText.match(pattern);
      if (match && match[1]) {
        const parsedDate = new Date(match[1]);
        if (!isNaN(parsedDate.getTime())) {
          extractedDate = parsedDate;
          cleanText = cleanText.replace(pattern, '');
          break;
        }
      }
    }
  }
  
  // 日付をISO文字列形式に変換（YYYY-MM-DD）
  const extractedDateString = extractedDate
    ? extractedDate.toISOString().split('T')[0]
    : null;
  
  return {
    cleanText: cleanText.trim(),
    extractedDate: extractedDateString,
  };
}

export function generateUniqueTaskListName(prefix: string = 'TaskList', testName?: string): string {
  const testPrefix = testName ? generateTestPrefix(testName) : generateUniqueId();
  return `${prefix}-${testPrefix}`;
}

export function generateUniqueTaskText(prefix: string = 'Task', testName?: string): string {
  const testPrefix = testName ? generateTestPrefix(testName) : generateUniqueId();
  return `${prefix}-${testPrefix}`;
}

// Share helpers
export async function createTestShare(taskListId: string) {
  const client = getTestPrisma();
  
  const shareToken = generateUniqueId();
  
  return await client.taskListShare.create({
    data: {
      taskListId,
      shareToken,
      isActive: true,
    },
  });
}

// Collaborative editing helpers
export async function createTestCollaborativeDoc(taskListId: string) {
  const client = getTestPrisma();
  
  // Create a simple test document with empty state
  const emptyState = Buffer.from('empty-state-for-test', 'utf8');
  const emptyStateVector = Buffer.from('empty-vector-for-test', 'utf8');
  
  return await client.taskListDocument.create({
    data: {
      taskListId,
      stateVector: emptyStateVector,
      documentState: emptyState,
    },
  });
}

// Complete scenario helpers - 完全分離対応
export async function createCompleteUserScenario(overrides?: {
  email?: string;
  password?: string;
  deviceId?: string;
  taskListName?: string;
  taskTexts?: string[];
  testName?: string; // テスト名による完全分離
  useUniqueNames?: boolean; // ユニーク名生成を制御（デフォルト: true）
}) {
  // Create authenticated user with test isolation
  const authUser = await createAuthenticatedUser({
    email: overrides?.email,
    password: overrides?.password,
    deviceId: overrides?.deviceId,
    testName: overrides?.testName,
  });

  // Create task list with optional unique naming
  const useUniqueNames = overrides?.useUniqueNames !== false; // デフォルト: true
  const taskListName = overrides?.taskListName || 'MyTasks';
  const finalTaskListName = useUniqueNames 
    ? generateUniqueTaskListName(taskListName, overrides?.testName)
    : taskListName;
  
  const taskList = await createTestTaskList(
    authUser.user.id,
    finalTaskListName
  );

  // Create tasks with optional unique text
  const tasks = [];
  const defaultTaskTexts = ['Buy groceries', 'Complete project', 'Call mom'];
  const taskTexts = overrides?.taskTexts || defaultTaskTexts;
  
  for (const taskText of taskTexts) {
    const finalTaskText = useUniqueNames 
      ? generateUniqueTaskText(taskText, overrides?.testName)
      : taskText;
    const task = await createTestTask(taskList.id, finalTaskText);
    tasks.push(task);
  }

  return {
    user: authUser.user,
    tokens: authUser.tokens,
    deviceId: authUser.deviceId,
    taskList,
    tasks,
  };
}

// Advanced cleanup helper
export async function cleanupTestScenario(userId: string) {
  const client = getTestPrisma();
  
  // Get user's app to find task lists
  const app = await client.app.findUnique({
    where: { userId },
  });

  if (app) {
    // Clean up all task lists and their associated data
    for (const taskListId of app.taskListOrder) {
      // Delete tasks
      await client.task.deleteMany({
        where: { taskListId },
      });
      
      // Delete shares
      await client.taskListShare.deleteMany({
        where: { taskListId },
      });
      
      // Delete collaborative documents
      await client.taskListDocument.deleteMany({
        where: { taskListId },
      });
      
      // Delete task list
      await client.taskList.deleteMany({
        where: { id: taskListId },
      });
    }
  }

  // Clean up user and related data
  await client.$transaction([
    client.passwordResetToken.deleteMany({ where: { userId } }),
    client.refreshToken.deleteMany({ where: { userId } }),
    client.settings.deleteMany({ where: { userId } }),
    client.app.deleteMany({ where: { userId } }),
    client.user.delete({ where: { id: userId } }),
  ]);
}