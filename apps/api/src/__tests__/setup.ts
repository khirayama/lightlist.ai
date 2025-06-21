import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { beforeAll, beforeEach, afterAll } from 'vitest';
import { getDatabase, resetDatabase } from '../services/database';

// Load test environment variables (override existing values)
const envPath = path.resolve(__dirname, '../../.env.test');
console.log('Loading env from:', envPath);
const result = config({ path: envPath, override: true });
if (result.error) {
  console.error('Failed to load .env.test:', result.error);
} else {
  console.log('Loaded DATABASE_URL:', process.env.DATABASE_URL);
}

// Global test database client
let prisma: PrismaClient;


// 並列テスト対応のデータベースクリーンアップ
export async function cleanupTestDatabase() {
  const prisma = getDatabase();
  if (!prisma) return;

  try {
    // トランザクション内で効率的にクリーンアップ
    await prisma.$transaction(async (tx) => {
      // 外部キー制約の順序で削除（待機時間を最小化）
      await tx.refreshToken.deleteMany();
      await tx.passwordResetToken.deleteMany(); // パスワードリセットトークンも削除
      await tx.taskListDocument.deleteMany();
      await tx.taskListShare.deleteMany();
      await tx.task.deleteMany();
      await tx.taskList.deleteMany();
      await tx.settings.deleteMany();
      await tx.app.deleteMany();
      await tx.user.deleteMany();
    }, {
      timeout: 30000, // トランザクションタイムアウトを30秒に設定
    });
    
  } catch (error) {
    console.warn('Database cleanup failed:', error instanceof Error ? error.message : error);
    
    // フォールバック：個別削除（並列実行時の競合対策）
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


export function getTestPrismaClient(): PrismaClient {
  return getDatabase();
}

export async function teardownTestDatabase() {
  try {
    await resetDatabase();
    console.log('Database connection closed successfully.');
  } catch (error) {
    console.warn('Failed to disconnect from database:', error);
  }
}

// Global setup
beforeAll(async () => {
  // Initialize Prisma client
  prisma = getTestPrismaClient();
  console.log('Test database connection initialized.');
});

// Cleanup before each test
beforeEach(async () => {
  // Clean test data before each test
  await cleanupTestDatabase();
});

// Global teardown
afterAll(async () => {
  await teardownTestDatabase();
});