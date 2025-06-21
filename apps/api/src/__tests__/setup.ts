import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import { beforeAll, beforeEach, afterAll } from 'vitest';

// Load test environment variables
config({ path: path.resolve(__dirname, '../../.env.test') });

// Global test database client
let prisma: PrismaClient;

// Docker availability check
function isDockerAvailable(): boolean {
  try {
    execSync('docker --version', { stdio: 'pipe' });
    execSync('docker ps', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

// Database setup and cleanup
export async function setupTestDatabase() {
  // Check if Docker is available
  if (!isDockerAvailable()) {
    console.warn('Docker is not available. Skipping Docker-based test database setup.');
    console.warn('Integration tests requiring a database will be skipped.');
    return;
  }

  // Ensure test database is running
  try {
    console.log('Starting test database container...');
    execSync('docker-compose -f docker-compose.test.yml up -d postgres-test', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../..'),
    });
    
    // Wait for database to be ready
    console.log('Waiting for database to be ready...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Run database migrations
    console.log('Running database migrations...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../..'),
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
    });
    
    console.log('Test database setup completed successfully.');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

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

export async function stopTestDatabaseContainer() {
  if (!isDockerAvailable()) {
    console.log('Docker not available, skipping container cleanup.');
    return;
  }

  try {
    console.log('Stopping test database container...');
    execSync('docker-compose -f docker-compose.test.yml down', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../..'),
    });
    console.log('Test database container stopped successfully.');
  } catch (error) {
    console.warn('Failed to stop test database container:', error);
    // Check if the container actually exists
    try {
      const result = execSync('docker ps -a --filter name=lightlist-postgres-test --format "{{.Names}}"', {
        encoding: 'utf8',
        cwd: path.resolve(__dirname, '../..'),
      });
      if (result.trim() === '') {
        console.log('Test database container does not exist or was already removed.');
      } else {
        console.warn('Container exists but failed to stop. Manual cleanup may be required.');
      }
    } catch (checkError) {
      console.warn('Could not verify container status:', checkError);
    }
  }
}

// Global setup
beforeAll(async () => {
  await setupTestDatabase();
  
  // Only initialize Prisma client if Docker is available
  if (isDockerAvailable()) {
    prisma = getTestPrismaClient();
  }
});

// Cleanup before each test
beforeEach(async () => {
  // Only cleanup if we have a database connection
  if (prisma && isDockerAvailable()) {
    await cleanupTestDatabase();
  }
});

// Global teardown
afterAll(async () => {
  await teardownTestDatabase();
  await stopTestDatabaseContainer();
});