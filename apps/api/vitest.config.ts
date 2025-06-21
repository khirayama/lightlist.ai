/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'], // Use full database setup for integration tests
    testTimeout: 60000,
    hookTimeout: 60000,
    teardownTimeout: 60000,
    isolate: true,
    threads: false, // PostgreSQL connections work better without threads
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Force single process execution
      },
    },
    maxConcurrency: 1, // Prevent database conflicts
    fileParallelism: false, // Disable file-level parallelism
    sequence: {
      hooks: 'stack',
      shuffle: false, // Disable test shuffling for predictable execution
    },
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