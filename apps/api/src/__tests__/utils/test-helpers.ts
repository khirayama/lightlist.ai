import request from 'supertest';
import { PrismaClient, User } from '@prisma/client';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from '../../routes/auth';
import { generateTokenPair } from '../../utils/jwt';
import type { AuthTokens } from '../../types/auth';
import { hashPassword } from '../../utils/password';
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

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
      });
    });

    // Error handler
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Test App Error:', err);
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

// Test data generators with unique values
function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateUniqueEmail(prefix: string = 'test'): string {
  return `${prefix}-${generateUniqueId()}@example.com`;
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


// Dynamic test data generators for unique values
export function generateUniqueUserData(overrides: Partial<{email: string, password: string, deviceId: string}> = {}) {
  return {
    email: overrides.email || generateUniqueEmail(),
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
      await new Promise(resolve => setTimeout(resolve, 200 * attempt));
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
      await new Promise(resolve => setTimeout(resolve, 200 * attempt));
    }
  }
}

// Database helpers
export async function createTestUser(userData?: {email: string, password: string, deviceId: string}): Promise<User> {
  // userDataが渡されなかった場合のみ一意なデータを生成
  const userToCreate = userData || generateUniqueUserData();
  
  try {
    const hashedPassword = await hashPassword(userToCreate.password);
    const client = getTestPrisma(); // 確実に初期化されたPrismaクライアントを使用
    
    let user: User;

    // 全ての作成操作をトランザクションで実行（auth.tsと同じ順序）
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
      timeout: 10000, // 10秒のタイムアウト
    });

    // トランザクション完了後、データベースから確実に読み取れることを確認
    await ensureUserExists(client, user!.id, 5); // リトライ回数を5回に増加

    return user!;
  } catch (error) {
    console.error('Test user creation failed:', error);
    console.error('User data:', { email: userToCreate.email, deviceId: userToCreate.deviceId });
    throw new Error(`Failed to create test user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function createAuthenticatedUser(userData?: Partial<{email: string, password: string, deviceId: string}>) {
  // ユーザーデータを生成
  const uniqueUserData = generateUniqueUserData(userData);
  
  try {
    const hashedPassword = await hashPassword(uniqueUserData.password);
    const client = getTestPrisma();
    
    let user: User;
    let tokens: AuthTokens;

    // 全ての作成操作をトランザクションで実行（auth.tsと同じ順序）
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
      timeout: 10000, // 10秒のタイムアウト
    });

    // トランザクション完了後、データベースから確実に読み取れることを確認
    await ensureAuthenticatedUserExists(client, user!.id, tokens!.refreshToken, 5); // リトライ回数を5回に増加

    return {
      user: user!,
      tokens,
      deviceId: uniqueUserData.deviceId,
    };
  } catch (error) {
    console.error('Authenticated user creation failed:', error);
    console.error('User data:', { email: uniqueUserData.email, deviceId: uniqueUserData.deviceId });
    throw new Error(`Failed to create authenticated user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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

// Cleanup helpers
export async function cleanupUser(email: string) {
  const client = getTestPrisma();
  const user = await client.user.findUnique({ where: { email } });
  if (user) {
    await client.$transaction([
      client.refreshToken.deleteMany({ where: { userId: user.id } }),
      client.settings.deleteMany({ where: { userId: user.id } }),
      client.app.deleteMany({ where: { userId: user.id } }),
      client.user.delete({ where: { id: user.id } }),
    ]);
  }
}