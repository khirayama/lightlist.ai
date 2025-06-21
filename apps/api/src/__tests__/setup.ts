import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { beforeAll, beforeEach, afterAll } from 'vitest';

// Load test environment variables
config({ path: path.resolve(__dirname, '../../.env.test') });

// Global test database client
let prisma: PrismaClient;

// Database cleanup function
export async function cleanupTestDatabase() {
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
  if (!prisma) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required for tests');
    }
    
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: process.env.NODE_ENV === 'test' ? [] : ['query', 'error', 'warn'],
    });
  }
  return prisma;
}

export async function teardownTestDatabase() {
  if (prisma) {
    try {
      await prisma.$disconnect();
      console.log('Database connection closed successfully.');
    } catch (error) {
      console.warn('Failed to disconnect from database:', error);
    }
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
  if (prisma) {
    await cleanupTestDatabase();
  }
});

// Global teardown
afterAll(async () => {
  await teardownTestDatabase();
});