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
    // Clean up all test data in proper order (respecting foreign key constraints)
    await prisma.$transaction([
      prisma.refreshToken.deleteMany(),
      prisma.taskListDocument.deleteMany(),
      prisma.taskListShare.deleteMany(),
      prisma.task.deleteMany(),
      prisma.taskList.deleteMany(),
      prisma.settings.deleteMany(),
      prisma.app.deleteMany(),
      prisma.user.deleteMany(),
    ]);
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