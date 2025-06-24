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


// 安定性を優先したデータベースクリーンアップ
export async function cleanupTestDatabase() {
  const prisma = getDatabase();
  if (!prisma) return;

  try {
    console.log('[Cleanup] Starting database cleanup...');
    
    // タイムアウト付きでクリーンアップを実行
    await Promise.race([
      // 実際のクリーンアップ処理
      (async () => {
        // 外部キー制約に配慮した順次削除
        await prisma.refreshToken.deleteMany();
        await prisma.passwordResetToken.deleteMany();
        await prisma.taskListDocument.deleteMany();
        await prisma.taskListShare.deleteMany();
        await prisma.task.deleteMany();
        await prisma.taskList.deleteMany();
        await prisma.settings.deleteMany();
        await prisma.app.deleteMany();
        await prisma.user.deleteMany();
      })(),
      // 15秒でタイムアウト
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Cleanup timeout')), 15000);
      })
    ]);
    
    console.log('[Cleanup] Database cleanup completed successfully');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('[Cleanup] Cleanup failed, but continuing:', errorMessage);
    
    // タイムアウトの場合は接続をリセット
    if (errorMessage.includes('timeout')) {
      console.log('[Cleanup] Attempting to reset database connection...');
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        console.warn('[Cleanup] Failed to disconnect:', disconnectError);
      }
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

// 安定性を優先したクリーンアップ戦略
beforeEach(async () => {
  // テスト開始前にクリーンアップを実行（より安全）
  console.log('[Test Setup] Starting pre-test database cleanup...');
  await cleanupTestDatabase();
  console.log('[Test Setup] Pre-test database cleanup completed');
});

// Global teardown
afterAll(async () => {
  await teardownTestDatabase();
});