import { beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';

beforeAll(async () => {
  // Setup test database if needed
  if (!process.env.SKIP_DB_SETUP) {
    try {
      execSync('npm run db:start:test', { stdio: 'inherit' });
      execSync('npm run db:setup:test', { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to setup test database:', error);
    }
  }
});

afterAll(async () => {
  // Cleanup test database if needed
  if (!process.env.SKIP_DB_CLEANUP) {
    try {
      execSync('npm run db:stop:test', { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to cleanup test database:', error);
    }
  }
});