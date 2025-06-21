import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import crypto from 'crypto';

// Load test environment variables
const envPath = path.resolve(__dirname, '../../.env.test');
console.log('Loading env from:', envPath);
const result = config({ path: envPath, override: true });
if (result.error) {
  console.error('Failed to load .env.test:', result.error);
} else {
  console.log('Loaded DATABASE_URL:', process.env.DATABASE_URL);
}

// スキーマ分離のためのテストID生成
const testId = crypto.randomBytes(8).toString('hex');
const testSchema = `test_schema_${testId}`;

console.log(`Using test schema: ${testSchema}`);

// グローバルなPrismaClientインスタンス
let prisma: PrismaClient;

// スキーマ固有のデータベースURL生成
function createSchemaSpecificUrl(baseUrl: string, schema: string): string {
  const url = new URL(baseUrl!);
  url.searchParams.set('schema', schema);
  return url.toString();
}

// スキーマ作成とPrismaClientの初期化
async function initializeTestSchema(): Promise<PrismaClient> {
  const baseUrl = process.env.DATABASE_URL!;
  
  // メインデータベースに接続してスキーマを作成
  const mainPrisma = new PrismaClient({
    datasources: {
      db: {
        url: baseUrl,
      },
    },
  });

  try {
    // テスト用スキーマを作成
    await mainPrisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${testSchema}"`);
    console.log(`Created test schema: ${testSchema}`);
  } catch (error) {
    console.warn(`Schema creation warning:`, error);
  } finally {
    await mainPrisma.$disconnect();
  }

  // スキーマ固有のPrismaClientを作成
  const schemaUrl = createSchemaSpecificUrl(baseUrl, testSchema);
  const schemaPrisma = new PrismaClient({
    datasources: {
      db: {
        url: schemaUrl,
      },
    },
  });

  // スキーマにテーブルを作成（マイグレーション実行）
  try {
    await schemaPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${testSchema}"."User" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      );
    `);

    await schemaPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${testSchema}"."App" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "taskListOrder" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "taskInsertPosition" TEXT NOT NULL DEFAULT 'top',
        "autoSort" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "App_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "App_userId_fkey" FOREIGN KEY ("userId") REFERENCES "${testSchema}"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await schemaPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${testSchema}"."Settings" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "theme" TEXT NOT NULL DEFAULT 'system',
        "language" TEXT NOT NULL DEFAULT 'ja',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Settings_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "${testSchema}"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await schemaPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${testSchema}"."TaskList" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "background" TEXT DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "TaskList_pkey" PRIMARY KEY ("id")
      );
    `);

    await schemaPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${testSchema}"."Task" (
        "id" TEXT NOT NULL,
        "text" TEXT NOT NULL,
        "completed" BOOLEAN NOT NULL DEFAULT false,
        "date" TEXT,
        "taskListId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Task_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Task_taskListId_fkey" FOREIGN KEY ("taskListId") REFERENCES "${testSchema}"."TaskList"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await schemaPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${testSchema}"."RefreshToken" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "deviceId" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "${testSchema}"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await schemaPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${testSchema}"."PasswordResetToken" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "isUsed" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "${testSchema}"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await schemaPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${testSchema}"."TaskListShare" (
        "id" TEXT NOT NULL,
        "taskListId" TEXT NOT NULL,
        "shareToken" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "TaskListShare_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "TaskListShare_taskListId_fkey" FOREIGN KEY ("taskListId") REFERENCES "${testSchema}"."TaskList"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await schemaPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${testSchema}"."TaskListDocument" (
        "id" TEXT NOT NULL,
        "taskListId" TEXT NOT NULL,
        "stateVector" BYTEA NOT NULL,
        "documentState" BYTEA NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "TaskListDocument_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "TaskListDocument_taskListId_fkey" FOREIGN KEY ("taskListId") REFERENCES "${testSchema}"."TaskList"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    console.log(`Created tables in schema: ${testSchema}`);
  } catch (error) {
    console.error(`Failed to create tables in schema ${testSchema}:`, error);
    throw error;
  }

  return schemaPrisma;
}

// 並列テスト対応のデータベースクリーンアップ
export async function cleanupTestDatabase() {
  if (!prisma) return;

  try {
    // スキーマ内の全テーブルをクリーンアップ
    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany();
      await tx.passwordResetToken.deleteMany();
      await tx.taskListDocument.deleteMany();
      await tx.taskListShare.deleteMany();
      await tx.task.deleteMany();
      await tx.taskList.deleteMany();
      await tx.settings.deleteMany();
      await tx.app.deleteMany();
      await tx.user.deleteMany();
    }, {
      timeout: 30000,
    });
    
  } catch (error) {
    console.warn('Database cleanup failed:', error instanceof Error ? error.message : error);
    
    // フォールバック：個別削除
    try {
      await prisma.refreshToken.deleteMany();
      await prisma.passwordResetToken.deleteMany();
      await prisma.taskListDocument.deleteMany();
      await prisma.taskListShare.deleteMany();
      await prisma.task.deleteMany();
      await prisma.taskList.deleteMany();
      await prisma.settings.deleteMany();
      await prisma.app.deleteMany();
      await prisma.user.deleteMany();
    } catch (fallbackError) {
      console.warn('Fallback cleanup also failed:', fallbackError instanceof Error ? fallbackError.message : fallbackError);
    }
  }
}

// テスト用Prismaクライアントの取得
export function getTestPrismaClient(): PrismaClient {
  return prisma;
}

// スキーマのクリーンアップ
async function cleanupTestSchema() {
  if (!prisma) return;

  try {
    await prisma.$disconnect();
    
    // メインデータベースに接続してスキーマを削除
    const mainPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL!,
        },
      },
    });

    try {
      await mainPrisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`);
      console.log(`Dropped test schema: ${testSchema}`);
    } catch (error) {
      console.warn(`Failed to drop schema ${testSchema}:`, error);
    } finally {
      await mainPrisma.$disconnect();
    }
  } catch (error) {
    console.warn('Failed to cleanup test schema:', error);
  }
}

// Global setup
beforeAll(async () => {
  try {
    prisma = await initializeTestSchema();
    console.log(`Test database connection initialized with schema: ${testSchema}`);
  } catch (error) {
    console.error('Failed to initialize test schema:', error);
    throw error;
  }
});

// Cleanup before each test
beforeEach(async () => {
  await cleanupTestDatabase();
});

// Cleanup after each test (optional, for extra safety)
afterEach(async () => {
  // Optional: Additional cleanup if needed
});

// Global teardown
afterAll(async () => {
  await cleanupTestSchema();
  console.log('Test schema cleanup completed');
});