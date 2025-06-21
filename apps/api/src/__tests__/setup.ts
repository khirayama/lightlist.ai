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

// Database cleanup function
export async function cleanupTestDatabase() {
  const prisma = getDatabase();
  if (prisma) {
    try {
      // Clean up all test data in proper order (respecting foreign key constraints)
      await prisma.$transaction(async (tx) => {
        await tx.refreshToken.deleteMany();
        await tx.taskListDocument.deleteMany();
        await tx.taskListShare.deleteMany();
        await tx.task.deleteMany();
        await tx.taskList.deleteMany();
        await tx.settings.deleteMany();
        await tx.app.deleteMany();
        await tx.user.deleteMany();
      }, {
        timeout: 10000, // 10秒のタイムアウト
      });
      
      // 確実にコミットされるまで少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.warn('Database cleanup warning:', error);
      // クリーンアップが失敗した場合、個別に削除を試行
      try {
        await prisma.refreshToken.deleteMany();
        await prisma.taskListDocument.deleteMany();
        await prisma.taskListShare.deleteMany();
        await prisma.task.deleteMany();
        await prisma.taskList.deleteMany();
        await prisma.settings.deleteMany();
        await prisma.app.deleteMany();
        await prisma.user.deleteMany();
      } catch (secondError) {
        console.error('Failed to cleanup database:', secondError);
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

// Cleanup before each test
beforeEach(async () => {
  // Clean test data before each test
  await cleanupTestDatabase();
});

// Global teardown
afterAll(async () => {
  await teardownTestDatabase();
});