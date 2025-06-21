/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
    isolate: true,
    threads: false, // PostgreSQL connections work better without threads
    pool: 'forks',
    maxConcurrency: 1, // Prevent database conflicts
    sequence: {
      hooks: 'stack',
    },
    include: [
      'src/__tests__/routes/**/*.test.ts',
      'src/__tests__/scenarios/**/*.test.ts',
      'src/__tests__/middleware/**/*.test.ts',
    ],
    exclude: [
      'src/__tests__/utils/**/*.test.ts',
    ],
    env: {
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
        'prisma/',
      ],
      lines: 90,
      functions: 90,
      branches: 80,
      statements: 90,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});