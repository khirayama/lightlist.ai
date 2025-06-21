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


// シンプルで安全なデータベースクリーンアップ
export async function cleanupTestDatabase() {
  const prisma = getDatabase();
  if (!prisma) return;

  try {
    // 外部キー制約の順序で順次削除（適度な待機時間）
    await prisma.refreshToken.deleteMany();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await prisma.taskListDocument.deleteMany();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await prisma.taskListShare.deleteMany();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await prisma.task.deleteMany();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await prisma.taskList.deleteMany();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await prisma.settings.deleteMany();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await prisma.app.deleteMany();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await prisma.user.deleteMany();
    await new Promise(resolve => setTimeout(resolve, 100));
    
  } catch (error) {
    console.warn('Database cleanup failed:', error instanceof Error ? error.message : error);
    // エラーが発生してもテストは続行
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